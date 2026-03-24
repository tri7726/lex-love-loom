import { openDB, IDBPDatabase } from 'idb';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface OfflineAction {
  id: string;
  type: 'flashcard_result' | 'quiz_result';
  payload: Record<string, unknown>;
  timestamp: number;
}

const DB_NAME = 'jp-master-offline';
const STORE_NAME = 'offline-queue';

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function enqueue(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<void> {
  const db = await getDB();
  const item: OfflineAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  await db.put(STORE_NAME, item);
}

export async function processQueue(): Promise<void> {
  const db = await getDB();
  const items: OfflineAction[] = await db.getAll(STORE_NAME);
  if (items.length === 0) return;

  let synced = 0;
  for (const item of items) {
    try {
      if (item.type === 'flashcard_result') {
        await (supabase as any)
          .from('flashcard_results')
          .upsert({ ...item.payload, offline_id: item.id }, { onConflict: 'offline_id' });
      } else if (item.type === 'quiz_result') {
        await (supabase as any)
          .from('quiz_results')
          .upsert({ ...item.payload, offline_id: item.id }, { onConflict: 'offline_id' });
      }
      await db.delete(STORE_NAME, item.id);
      synced++;
    } catch (err) {
      console.error('Failed to sync offline action:', item.id, err);
    }
  }

  if (synced > 0) {
    toast({
      title: `Đã đồng bộ ${synced} hoạt động offline`,
      description: 'Tiến độ học của bạn đã được lưu.',
    });
  }
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processQueue().catch(console.error);
  });
}

export function useOfflineQueue() {
  return { enqueue, processQueue };
}
