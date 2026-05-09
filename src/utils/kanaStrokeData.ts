/**
 * Kana stroke data loader.
 * Fetches KanjiVG SVG stroke data for hiragana/katakana from CDN,
 * parses individual stroke paths, and caches results.
 */

export interface KanaStrokeData {
  strokes: string[]; // SVG path `d` attributes, in stroke order
  viewBox: { width: number; height: number };
}

const cache = new Map<string, KanaStrokeData>();

function charToHex(char: string): string {
  return char.charCodeAt(0).toString(16).padStart(5, '0');
}

function parseKanaSVG(svgText: string): KanaStrokeData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  const viewBox = svgEl?.getAttribute('viewBox') || '0 0 109 109';
  const [, , vw, vh] = viewBox.split(/\s+/).map(Number);

  const strokes: string[] = [];
  // KanjiVG groups strokes in <g class="kvg:stroke1">, <g class="kvg:stroke2">, ...
  const strokeGroups = doc.querySelectorAll('[class*="kvg\\:stroke"]');
  strokeGroups.forEach(g => {
    const path = g.querySelector('path');
    if (path) {
      const d = path.getAttribute('d');
      if (d) strokes.push(d);
    }
  });

  // Fallback: if no kvg:stroke classes found, grab all paths in order
  if (strokes.length === 0) {
    doc.querySelectorAll('path').forEach(p => {
      const d = p.getAttribute('d');
      if (d) strokes.push(d);
    });
  }

  return { strokes, viewBox: { width: vw || 109, height: vh || 109 } };
}

export async function getKanaStrokes(char: string): Promise<KanaStrokeData> {
  if (cache.has(char)) return cache.get(char)!;

  const hex = charToHex(char);
  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`KanjiVG fetch failed for ${char} (${hex}): ${res.status}`);

  const svgText = await res.text();
  const data = parseKanaSVG(svgText);
  cache.set(char, data);
  return data;
}

/** Quick check: can this character get KanjiVG stroke data? */
export function hasKanaStrokeData(char: string): boolean {
  const code = char.charCodeAt(0);
  // Hiragana: U+3040–U+309F, Katakana: U+30A0–U+30FF
  return (code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF);
}
