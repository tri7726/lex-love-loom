/**
 * NHK / Kanjium pitch accent lookup with IndexedDB caching + fuzzy matching.
 * Source: https://github.com/mifunetoshiro/kanjium (accents.txt)
 * Format: word \t reading_kana \t downstep_positions (comma-separated ints)
 *
 *   0 → heiban (flat):       L H H H ...
 *   1 → atamadaka:           H L L L ...
 *   N (≥2) → naka/odaka:     L H H..H (mora 2..N) L L L ...
 */

import { supabase } from '@/integrations/supabase/client';
import { logTelemetry } from '@/lib/telemetry';

const DB_NAME = 'pitch-accent-db';
const STORE = 'dataset';
const RECORD_KEY = 'kanjium-v1';
const DATASET_URL = '/data/pitch-accents.tsv';

// ---------- Admin overrides (layer 0 — highest priority) ----------
type OverrideRow = { word: string; reading: string; downstep: number; alternates: number[] | null };
const overrides: PitchMap = new Map();
let overridesLoaded = false;
let overridesPromise: Promise<void> | null = null;

async function loadOverrides(): Promise<void> {
  if (overridesLoaded) return;
  if (overridesPromise) return overridesPromise;
  overridesPromise = (async () => {
    try {
      const { data, error } = await supabase.from('pitch_accent_overrides').select('word,reading,downstep,alternates');
      if (error) throw error;
      for (const r of (data ?? []) as OverrideRow[]) {
        const positions = [r.downstep, ...(r.alternates ?? [])];
        const hira = normalizeKana(r.reading);
        overrides.set(`${r.word}\t${hira}`, positions);
        overrides.set(r.word, positions);
        overrides.set(hira, positions);
      }
      overridesLoaded = true;
    } catch (e) {
      console.warn('[pitch] overrides load failed', e);
      overridesLoaded = true; // don't retry forever
    }
  })();
  return overridesPromise;
}

export function prefetchPitchOverrides(): void { void loadOverrides(); }

type PitchMap = Map<string, number[]>;
type ReadingMap = Map<string, string>; // word → first known reading (hiragana)

interface DatasetRecord {
  text: string;
  fetchedAt: number;
}

let cache: PitchMap | null = null;
let readingIndex: ReadingMap | null = null;
let loadingPromise: Promise<PitchMap> | null = null;
let loadStatus: 'idle' | 'loading' | 'ready' | 'error' = 'idle';

// ---------- Kana normalization helpers ----------

function toHiragana(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0x30a1 && code <= 0x30f6) out += String.fromCharCode(code - 0x60);
    else out += ch;
  }
  return out;
}

/** Normalize long mark, small tsu, voiced marks for fuzzy matching. */
function normalizeKana(s: string): string {
  let h = toHiragana(s);
  // Long mark ー → previous vowel
  const vowel: Record<string, string> = {
    あ: 'あ', か: 'あ', さ: 'あ', た: 'あ', な: 'あ', は: 'あ', ま: 'あ', や: 'あ', ら: 'あ', わ: 'あ', が: 'あ', ざ: 'あ', だ: 'あ', ば: 'あ', ぱ: 'あ',
    い: 'い', き: 'い', し: 'い', ち: 'い', に: 'い', ひ: 'い', み: 'い', り: 'い', ぎ: 'い', じ: 'い', ぢ: 'い', び: 'い', ぴ: 'い',
    う: 'う', く: 'う', す: 'う', つ: 'う', ぬ: 'う', ふ: 'う', む: 'う', ゆ: 'う', る: 'う', ぐ: 'う', ず: 'う', づ: 'う', ぶ: 'う', ぷ: 'う',
    え: 'え', け: 'え', せ: 'え', て: 'え', ね: 'え', へ: 'え', め: 'え', れ: 'え', げ: 'え', ぜ: 'え', で: 'え', べ: 'え', ぺ: 'え',
    お: 'お', こ: 'お', そ: 'お', と: 'お', の: 'お', ほ: 'お', も: 'お', よ: 'お', ろ: 'お', ご: 'お', ぞ: 'お', ど: 'お', ぼ: 'お', ぽ: 'お',
  };
  let out = '';
  for (let i = 0; i < h.length; i++) {
    const c = h[i];
    if (c === 'ー' && out.length) {
      const prev = out[out.length - 1];
      out += vowel[prev] || c;
    } else out += c;
  }
  return out;
}

/** Strip okurigana / particles from a surface form to get the kanji stem. */
function stripOkurigana(word: string): string {
  // Keep CJK ideographs only
  return word.replace(/[^\u4e00-\u9faf\u3400-\u4dbf]/g, '');
}

/** Common dictionary-form endings for verbs/adjectives. */
const ENDINGS = ['ます', 'ました', 'ません', 'まして', 'ない', 'なかった', 'た', 'て', 'だ', 'で', 'です', 'る', 'く', 'い'];

function trimEnding(word: string): string {
  for (const e of ENDINGS) {
    if (word.length > e.length + 1 && word.endsWith(e)) return word.slice(0, -e.length);
  }
  return word;
}

// ---------- Mora & pattern math ----------

export function splitMora(reading: string): string[] {
  const small = new Set(['ゃ', 'ゅ', 'ょ', 'ャ', 'ュ', 'ョ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ']);
  const out: string[] = [];
  for (const ch of reading) {
    if (small.has(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

export function downstepToLH(pos: number, count: number): string {
  if (count <= 0) return '';
  const arr: ('H' | 'L')[] = [];
  if (pos === 0) {
    arr.push('L');
    for (let i = 1; i < count; i++) arr.push('H');
  } else if (pos === 1) {
    arr.push('H');
    for (let i = 1; i < count; i++) arr.push('L');
  } else {
    arr.push('L');
    for (let i = 1; i < count; i++) arr.push(i < pos ? 'H' : 'L');
  }
  return arr.join('');
}

// ---------- IndexedDB cache ----------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readFromIDB(): Promise<DatasetRecord | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openDB();
    return await new Promise<DatasetRecord | null>((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(RECORD_KEY);
      req.onsuccess = () => resolve((req.result as DatasetRecord) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeToIDB(record: DatasetRecord): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record, RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

// ---------- Dataset loading ----------

const KANA_RE = /^[\u3040-\u309f\u30a0-\u30ffー]+$/;
function isPureKana(s: string): boolean {
  return !!s && KANA_RE.test(s);
}

function parseDataset(text: string): { map: PitchMap; readings: ReadingMap } {
  const map: PitchMap = new Map();
  const readings: ReadingMap = new Map();
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line) continue;
    const tabIdx = line.indexOf('\t');
    if (tabIdx < 0) continue;
    const tabIdx2 = line.indexOf('\t', tabIdx + 1);
    if (tabIdx2 < 0) continue;
    const word = line.slice(0, tabIdx);
    const reading = line.slice(tabIdx + 1, tabIdx2);
    const pitches = line.slice(tabIdx2 + 1);
    const positions: number[] = [];
    for (const p of pitches.split(',')) {
      const n = parseInt(p, 10);
      if (!Number.isNaN(n)) positions.push(n);
    }
    if (!positions.length) continue;
    const hira = normalizeKana(reading);
    map.set(`${word}\t${hira}`, positions);
    if (!map.has(word)) map.set(word, positions);
    if (!map.has(hira)) map.set(hira, positions);
    if (!readings.has(word)) readings.set(word, hira);
    const stem = stripOkurigana(word);
    if (stem && stem !== word) {
      if (!map.has(`${stem}\t${hira}`)) map.set(`${stem}\t${hira}`, positions);
      if (!readings.has(stem)) readings.set(stem, hira);
    }
  }
  return { map, readings };
}

function applyParsed(parsed: { map: PitchMap; readings: ReadingMap }) {
  cache = parsed.map;
  readingIndex = parsed.readings;
}

async function loadDataset(): Promise<PitchMap> {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;
  loadStatus = 'loading';
  loadingPromise = (async () => {
    try {
      const cached = await readFromIDB();
      if (cached?.text) {
        applyParsed(parseDataset(cached.text));
        loadStatus = 'ready';
        void (async () => {
          try {
            const res = await fetch(DATASET_URL, { cache: 'force-cache' });
            if (!res.ok) return;
            const text = await res.text();
            if (text && text !== cached.text) {
              applyParsed(parseDataset(text));
              await writeToIDB({ text, fetchedAt: Date.now() });
            }
          } catch { /* ignore */ }
        })();
        return cache!;
      }
      const res = await fetch(DATASET_URL);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const text = await res.text();
      applyParsed(parseDataset(text));
      await writeToIDB({ text, fetchedAt: Date.now() });
      loadStatus = 'ready';
      return cache!;
    } catch (err) {
      console.warn('[pitch] dataset load failed', err);
      loadStatus = 'error';
      cache = new Map();
      readingIndex = new Map();
      return cache;
    }
  })();
  return loadingPromise;
}

export function prefetchPitchDataset(): void {
  void loadDataset();
}

export function getPitchLoadStatus(): 'idle' | 'loading' | 'ready' | 'error' {
  return loadStatus;
}

// ---------- Lookup ----------

export type PitchMissReason = 'loading' | 'no-reading' | 'not-found' | 'load-error';

export interface PitchLookup {
  pattern: string;
  downstep: number;
  alternates?: number[];
  matchedWord?: string;
  /** Reading actually used for the lookup (set when we inferred it from the word). */
  derivedReading?: string;
  matchType: 'exact' | 'reading-only' | 'word-only' | 'normalized' | 'stem' | 'inferred';
  source: 'nhk';
}

export interface PitchLookupResult {
  hit: PitchLookup | null;
  miss?: PitchMissReason;
  /** Reading we inferred from the word, even when no NHK match was found. */
  inferredReading?: string;
}

/** Try to recover a hiragana reading for a word when the caller didn't supply one. */
function inferReading(word: string): string | null {
  if (!word) return null;
  if (isPureKana(word)) return normalizeKana(word);
  if (!readingIndex) return null;
  const direct = readingIndex.get(word);
  if (direct) return direct;
  const stem = stripOkurigana(word);
  if (stem && stem !== word) {
    const r = readingIndex.get(stem);
    if (r) return r;
  }
  const trimmed = trimEnding(word);
  if (trimmed && trimmed !== word) {
    const r = readingIndex.get(trimmed);
    if (r) return r;
  }
  return null;
}

function tryLookupIn(map: PitchMap, word: string, reading: string): { hit: PitchLookup | null; usedReading: string } {
  let effectiveReading = reading;
  let inferred = false;
  if (!effectiveReading) {
    const guess = inferReading(word);
    if (!guess) return { hit: null, usedReading: '' };
    effectiveReading = guess;
    inferred = true;
  }
  const hira = normalizeKana(effectiveReading);
  const mora = splitMora(hira);

  const candidates: Array<{ key: string; type: PitchLookup['matchType']; matchedWord?: string }> = [];
  if (word) {
    candidates.push({ key: `${word}\t${hira}`, type: inferred ? 'inferred' : 'exact', matchedWord: word });
    const stem = stripOkurigana(word);
    if (stem && stem !== word) candidates.push({ key: `${stem}\t${hira}`, type: 'stem', matchedWord: stem });
    const trimmed = trimEnding(word);
    if (trimmed && trimmed !== word) candidates.push({ key: `${trimmed}\t${hira}`, type: 'normalized', matchedWord: trimmed });
    candidates.push({ key: word, type: 'word-only', matchedWord: word });
  }
  candidates.push({ key: hira, type: inferred ? 'inferred' : 'reading-only' });

  for (const c of candidates) {
    const positions = map.get(c.key);
    if (positions && positions.length) {
      return {
        usedReading: hira,
        hit: {
          pattern: downstepToLH(positions[0], mora.length),
          downstep: positions[0],
          alternates: positions.length > 1 ? positions.slice(1) : undefined,
          matchedWord: c.matchedWord,
          derivedReading: inferred ? hira : undefined,
          matchType: inferred ? 'inferred' : c.type,
          source: 'nhk',
        },
      };
    }
  }
  return { hit: null, usedReading: hira };
}

export async function lookupPitch(word: string, reading: string): Promise<PitchLookupResult> {
  // Layer 0: admin overrides
  await loadOverrides();
  if (overrides.size) {
    const ov = tryLookupIn(overrides, word, reading);
    if (ov.hit) {
      return { hit: { ...ov.hit, source: 'nhk', matchType: 'exact' }, inferredReading: !reading ? ov.usedReading : undefined };
    }
  }
  const map = await loadDataset();
  if (loadStatus === 'error') {
    logTelemetry({ feature: 'pitch_accent', event: 'miss', reason: 'load-error', word, reading });
    return { hit: null, miss: 'load-error' };
  }
  const { hit, usedReading } = tryLookupIn(map, word, reading);
  if (hit) return { hit, inferredReading: !reading ? usedReading : undefined };
  if (!reading && !usedReading) {
    logTelemetry({ feature: 'pitch_accent', event: 'miss', reason: 'no-reading', word, reading });
    return { hit: null, miss: 'no-reading' };
  }
  logTelemetry({ feature: 'pitch_accent', event: 'miss', reason: 'not-found', word, reading: usedReading || reading });
  return { hit: null, miss: 'not-found', inferredReading: !reading ? usedReading : undefined };
}

export function lookupPitchSync(word: string, reading: string): PitchLookupResult {
  if (overrides.size) {
    const ov = tryLookupIn(overrides, word, reading);
    if (ov.hit) {
      return { hit: { ...ov.hit, source: 'nhk', matchType: 'exact' }, inferredReading: !reading ? ov.usedReading : undefined };
    }
  }
  if (!cache) return { hit: null, miss: 'loading' };
  const { hit, usedReading } = tryLookupIn(cache, word, reading);
  if (hit) return { hit, inferredReading: !reading ? usedReading : undefined };
  if (!reading && !usedReading) return { hit: null, miss: 'no-reading' };
  return {
    hit: null,
    miss: loadStatus === 'error' ? 'load-error' : 'not-found',
    inferredReading: !reading ? usedReading : undefined,
  };
}
