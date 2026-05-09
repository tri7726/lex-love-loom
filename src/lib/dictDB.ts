/**
 * Local Dictionary DB — P1 của Local Dictionary Engine
 * Cache kết quả API vào IndexedDB dùng thư viện `idb` (đã có sẵn trong project).
 * TTL 7 ngày. Dọn cache hết hạn tự động khi app khởi động.
 */
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'LexDictCache';
const DB_VERSION = 1;
const STORE_NAME = 'apiCache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

export interface CachedDictEntry {
  word: string;        // PK — từ đã tra (key)
  reading: string;
  hanviet: string;
  meaning: string;
  word_type?: string;
  jlpt_level?: string;
  examples?: { japanese: string; vietnamese: string }[];
  source: 'api';
  cachedAt: number;   // Date.now()
}

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'word' });
        store.createIndex('cachedAt', 'cachedAt');
      }
    },
  });
  return _db;
}

export const dictDB = {
  /** Lấy 1 entry từ cache, trả về null nếu không có hoặc đã hết hạn */
  async get(word: string): Promise<CachedDictEntry | null> {
    try {
      const db = await getDB();
      const entry = await db.get(STORE_NAME, word) as CachedDictEntry | undefined;
      if (!entry) return null;
      if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        await db.delete(STORE_NAME, word);
        return null;
      }
      return entry;
    } catch {
      return null;
    }
  },

  /** Lưu entry vào cache */
  async put(entry: Omit<CachedDictEntry, 'cachedAt'>): Promise<void> {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, { ...entry, cachedAt: Date.now() });
    } catch {
      // Silently ignore write errors (storage full, etc.)
    }
  },

  /** Xóa các entry hết hạn — gọi 1 lần khi app khởi động */
  async pruneExpired(): Promise<void> {
    try {
      const db = await getDB();
      const cutoff = Date.now() - CACHE_TTL_MS;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('cachedAt');
      let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
    } catch {
      // Ignore cleanup errors
    }
  },
};
