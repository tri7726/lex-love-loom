/**
 * Kanji Index — P1 của Local Dictionary Engine
 * Build Map<string, LocalKanjiEntry> từ KANJI_DB ở module load time.
 */
import { KANJI_DB } from '../kanji-db';

export interface LocalKanjiEntry {
  character: string;  // 食
  meaning_vi: string; // Ăn, thức ăn
  hanviet: string;    // THỰC
  on_reading: string; // ショク・ジキ
  kun_reading: string;// た.べる・く.う
  jlpt: 'N5' | 'N4';
}

/**
 * Map kanji → entry, O(1) lookup
 */
export const KANJI_MAP: Map<string, LocalKanjiEntry> = new Map(
  KANJI_DB.map((k) => [
    k.character,
    {
      character: k.character,
      meaning_vi: k.meaning_vi,
      hanviet: k.hanviet,
      on_reading: k.on_reading,
      kun_reading: k.kun_reading,
      jlpt: k.level,
    },
  ])
);

export const KANJI_MAP_SIZE = KANJI_MAP.size;
