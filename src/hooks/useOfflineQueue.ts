import { openDB, IDBPDatabase } from 'idb';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OfflineAction {
  id: string;
  type: 'flashcard_review' | 'xp_event';
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

async function processItem(item: OfflineAction): Promise<boolean> {
  try {
    if (item.type === 'flashcard_review') {
      const { flashcardId, ...fields } = item.payload as Record<string, unknown>;
      const { error } = await (supabase as any)
        .from('flashcards')
        .update(fields)
        .eq('id', flashcardId as string);
      if (error) throw error;
      return true;
    } else if (item.type === 'xp_event') {
      const { error } = await (supabase as any)
        .from('xp_events')
        .insert(item.payload);
      if (error) throw error;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function processQueue(): Promise<void> {
  const db = await getDB();
  const items: OfflineAction[] = await db.getAll(STORE_NAME);
  if (items.length === 0) return;

  let synced = 0;
  for (const item of items) {
    const ok = await processItem(item);
    if (ok) {
      await db.delete(STORE_NAME, item.id);
      synced++;
    } else {
      console.error('Failed to sync offline action:', item.id);
    }
  }

  if (synced > 0) {
    toast.success(`Đã đồng bộ ${synced} hoạt động offline`);
  }
}

export function useOfflineQueue() {
  // Register the online listener once
  useEffect(() => {
    const handler = () => { processQueue().catch(console.error); };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, []);

  return { enqueue, processQueue };
}
