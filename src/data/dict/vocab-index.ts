/**
 * Local Vocabulary Index — P1 của Local Dictionary Engine
 * Build Map<string, LocalDictEntry> từ MINNA_N5_VOCAB + MINNA_N4_VOCAB ở module load time.
 * Tra cứu O(1), không cần API, không cần async.
 */
import { MINNA_N5_VOCAB } from '../minna-n5';
import { MINNA_N4_VOCAB } from '../minna-n4';

export interface LocalDictEntry {
  word: string;
  reading: string;
  hanviet: string;
  meaning: string;
  jlpt: 'N5' | 'N4' | 'N3';
  example?: string;
  exampleMeaning?: string;
}

/**
 * Map từ chính: word (kanji/kana) → entry
 * Bao gồm cả key reading (hiragana) để tra khi user gõ kana
 */
export const VOCAB_MAP: Map<string, LocalDictEntry> = (() => {
  const map = new Map<string, LocalDictEntry>();

  const addWords = (wordArrays: typeof MINNA_N5_VOCAB, jlpt: 'N5' | 'N4') => {
    for (const lesson of wordArrays) {
      for (const w of lesson) {
        // Bỏ qua các entry là mẫu câu dài (từ có dấu ？, ～, dài hơn 15 ký tự)
        if (!w.word || w.word.includes('？') || w.word.length > 15) continue;

        const entry: LocalDictEntry = {
          word: w.word,
          reading: w.reading,
          hanviet: w.hanviet || '',
          meaning: w.meaning,
          jlpt,
          example: (w as unknown as Record<string, unknown>)['example'] as string | undefined,
          exampleMeaning: (w as unknown as Record<string, unknown>)['exampleMeaning'] as string | undefined,
        };

        // Key chính: từ gốc (食べる, 先生, ...)
        if (!map.has(w.word)) {
          map.set(w.word, entry);
        }

        // Key phụ: reading (たべる, せんせい, ...) — chỉ thêm nếu khác với word
        if (w.reading && w.reading !== w.word && !map.has(w.reading)) {
          map.set(w.reading, entry);
        }

        // Key rút gọn dạng ます → từ gốc dạng ます để khớp khi người dùng nhập kana
        // Ví dụ: "たべます" → "食べます"
        const masusuffix = 'ます';
        if (w.reading.endsWith(masusuffix) && w.word !== w.reading) {
          const withoutMasu = w.word.slice(0, -masusuffix.length);
          if (withoutMasu && !map.has(withoutMasu)) {
            map.set(withoutMasu, entry);
          }
        }
      }
    }
  };

  addWords(MINNA_N5_VOCAB, 'N5');
  addWords(MINNA_N4_VOCAB, 'N4');

  return map;
})();

/** Số lượng entry đã load (dùng để debug / kiểm tra) */
export const VOCAB_MAP_SIZE = VOCAB_MAP.size;
