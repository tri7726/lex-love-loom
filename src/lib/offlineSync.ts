import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'sakura-offline-db';
const DB_VERSION = 2; // Bumped: always add new stores here

export interface SyncAction {
  id?: number;
  type: 'REVIEW';
  flashcardId: string;
  rating: number;
  timestamp: string;
  data: any; // Resulting FSRS data to keep it optimistic
}

class OfflineSync {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 stores — guard prevents errors on any version
        if (!db.objectStoreNames.contains('flashcards')) {
          db.createObjectStore('flashcards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        }
        // v2 stores — add future stores here with oldVersion guards:
        // if (oldVersion < 2 && !db.objectStoreNames.contains('new_store')) {
        //   db.createObjectStore('new_store', { keyPath: 'id' });
        // }
        void oldVersion; // used for future migration gates
      },
    });
  }

  async cacheDueCards(cards: any[]) {
    const db = await this.dbPromise;
    const tx = db.transaction('flashcards', 'readwrite');
    // Clear old cache as we fetch fresh due cards
    await tx.store.clear();
    for (const card of cards) {
      await tx.store.put(card);
    }
    await tx.done;
  }

  async getOfflineCards() {
    const db = await this.dbPromise;
    return db.getAll('flashcards');
  }

  async queueReview(action: SyncAction) {
    const db = await this.dbPromise;
    // Update local cache so UI reflects change offline
    const flashcard = await db.get('flashcards', action.flashcardId);
    if (flashcard) {
      Object.assign(flashcard, action.data);
      await db.put('flashcards', flashcard);
    }
    // Add to sync queue
    await db.add('sync_queue', action);
  }

  async getQueue() {
    const db = await this.dbPromise;
    return db.getAll('sync_queue');
  }

  async clearQueueItem(id: number) {
    const db = await this.dbPromise;
    await db.delete('sync_queue', id);
  }
}

export const offlineSync = new OfflineSync();
