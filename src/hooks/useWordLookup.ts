/**
 * useWordLookup — P2 của Local Dictionary Engine
 * Hook Local-First theo luồng L1 → L2 → L3.
 *
 * L1 (~0ms):  localDictService.searchVocab() + searchKanji()
 * L2 (~5ms):  localDictService.getCached() — IndexedDB
 * L3 (~1.5s): supabase.functions.invoke('lookup-word') + cache result
 */
import { useState, useCallback } from 'react';
import { localDictService } from '@/services/localDictService';
import { deInflect, isJapanese } from '@/lib/deInflector';
import { supabase } from '@/integrations/supabase/client';

export interface WordLookupResult {
  word: string;
  reading: string;
  hanviet: string;
  meaning: string;
  word_type?: string;
  jlpt_level?: string;
  examples?: { japanese: string; vietnamese: string }[];
  example?: string;
  exampleMeaning?: string;
  source: 'local' | 'cache' | 'api';
}

export function useWordLookup() {
  const [result, setResult] = useState<WordLookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false); // chỉ true khi gọi L3 API
  const [source, setSource] = useState<'local' | 'cache' | 'api' | null>(null);

  const lookup = useCallback(async (word: string) => {
    const trimmed = word?.trim();
    if (!trimmed || trimmed.length < 1) return;

    // Chỉ xử lý text tiếng Nhật
    if (!isJapanese(trimmed)) return;

    // ─── L1: Tra local vocab dict (sync, ~0ms) ───
    const candidates = deInflect(trimmed);
    for (const candidate of candidates) {
      const local = localDictService.searchVocab(candidate);
      if (local) {
        setResult({
          word: local.word,
          reading: local.reading,
          hanviet: local.hanviet,
          meaning: local.meaning,
          jlpt_level: local.jlpt,
          example: local.example,
          exampleMeaning: local.exampleMeaning,
          source: 'local',
        });
        setSource('local');
        return;
      }
    }

    // L1 Kanji: tra từng ký tự nếu là kanji đơn
    if (trimmed.length === 1) {
      const kanji = localDictService.searchKanji(trimmed);
      if (kanji) {
        setResult({
          word: kanji.character,
          reading: kanji.kun_reading || kanji.on_reading,
          hanviet: kanji.hanviet,
          meaning: kanji.meaning_vi,
          jlpt_level: kanji.jlpt,
          source: 'local',
        });
        setSource('local');
        return;
      }
    }

    // ─── L2: Tra IndexedDB cache (async, ~5ms) ───
    const cached = await localDictService.getCached(trimmed);
    if (cached) {
      setResult({
        word: cached.word,
        reading: cached.reading,
        hanviet: cached.hanviet,
        meaning: cached.meaning,
        word_type: cached.word_type,
        jlpt_level: cached.jlpt_level,
        examples: cached.examples,
        source: 'cache',
      });
      setSource('cache');
      return;
    }

    // ─── L3: Fallback → invoke('lookup-word') (~1.5s) ───
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-word', {
        body: { word: trimmed },
      });

      if (error || !data) throw new Error(error?.message ?? 'No data');

      const r: WordLookupResult = {
        word: data.word ?? trimmed,
        reading: data.reading ?? '',
        hanviet: data.hanviet ?? '',
        meaning: data.meaning ?? '',
        word_type: data.word_type,
        jlpt_level: data.jlpt_level ?? data.level,
        examples: data.examples ?? [],
        source: 'api',
      };

      setResult(r);
      setSource('api');

      // Lưu vào L2 cache để lần sau dùng được ngay
      await localDictService.cacheAPIResult({
        word: r.word,
        reading: r.reading,
        hanviet: r.hanviet,
        meaning: r.meaning,
        word_type: r.word_type,
        jlpt_level: r.jlpt_level,
        examples: r.examples,
      });
    } catch {
      // API fail → không hiện error, giữ nguyên UI hiện tại
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setSource(null);
  }, []);

  return { result, isLoading, source, lookup, clear };
}
