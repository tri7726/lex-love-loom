/**
 * Local Dictionary Service — Tầng service trung tâm (P1)
 * Mọi lookup từ/kanji trong app đều đi qua đây.
 *
 * Luồng:
 *   L1 (sync,  ~0ms): VOCAB_MAP / KANJI_MAP lookup
 *   L2 (async, ~5ms): IndexedDB cache (kết quả AI đã tra trước)
 *   L3 (async, ~1.5s): invoke('lookup-word') Edge Function — do caller quyết định
 */
import { VOCAB_MAP, type LocalDictEntry } from '@/data/dict/vocab-index';
import { KANJI_MAP, type LocalKanjiEntry } from '@/data/dict/kanji-index';
import { dictDB, type CachedDictEntry } from '@/lib/dictDB';

export type { LocalDictEntry, LocalKanjiEntry, CachedDictEntry };

export const localDictService = {
  /**
   * L1 — Tra từ vựng local (đồng bộ, O(1), ~0ms).
   * Thử cả word gốc lẫn reading.
   */
  searchVocab(word: string): LocalDictEntry | null {
    if (!word) return null;
    return VOCAB_MAP.get(word) ?? null;
  },

  /**
   * L1 — Tra Kanji đơn lẻ (đồng bộ, O(1), ~0ms).
   */
  searchKanji(char: string): LocalKanjiEntry | null {
    if (!char) return null;
    return KANJI_MAP.get(char) ?? null;
  },

  /**
   * L2 — Tìm trong IndexedDB cache (bất đồng bộ, ~5ms).
   * Trả về null nếu không có hoặc đã hết TTL.
   */
  async getCached(word: string): Promise<CachedDictEntry | null> {
    return dictDB.get(word);
  },

  /**
   * L2 — Lưu kết quả từ API vào cache để lần sau dùng L2 thay vì L3.
   */
  async cacheAPIResult(result: Omit<CachedDictEntry, 'cachedAt' | 'source'>): Promise<void> {
    await dictDB.put({ ...result, source: 'api' });
  },

  /**
   * Dọn cache hết hạn — gọi 1 lần khi app khởi động (không block UI).
   */
  async pruneExpiredCache(): Promise<void> {
    await dictDB.pruneExpired();
  },

  /**
   * Debug helper — trả về số entry đã load vào Map local
   */
  getStats() {
    return {
      vocabEntries: VOCAB_MAP.size,
      kanjiEntries: KANJI_MAP.size,
    };
  },
};
