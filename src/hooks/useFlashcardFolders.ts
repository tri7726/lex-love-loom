import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

import { VocabWord } from '@/types/vocabulary';
import {
  addCardToFolder,
  createFlashcard,
  createFolder as createFolderApi,
  deleteFolder as deleteFolderApi,
  listFolders,
  removeCardFromFolder,
  type FlashcardRow,
} from '@/lib/flashcardClient';

function mapFlashcardToVocabWord(flashcard: FlashcardRow): VocabWord {
  return {
    id: flashcard.id,
    word: flashcard.word,
    reading: flashcard.reading ?? null,
    hanviet: flashcard.hanviet ?? null,
    meaning: flashcard.meaning,
    example_sentence: flashcard.example_sentence ?? undefined,
    example_translation: flashcard.example_translation ?? undefined,
    jlpt_level: flashcard.jlpt_level ?? undefined,
    word_type: flashcard.word_type ?? undefined,
    created_at: flashcard.created_at ?? undefined,
  };
}

export interface CustomFolder {
  id: string;
  name: string;
  emoji: string;
  words: VocabWord[];
  createdAt: string;
}

/**
 * Hook to manage flashcard folders.
 *
 * Backed by `flashcardClient`, which routes to either NestJS REST or directly
 * to Supabase based on `VITE_USE_NESTJS_DATA`. The shape returned to consumers
 * is unchanged from the legacy direct-Supabase implementation.
 */
export const useFlashcardFolders = () => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFolders = useCallback(async () => {
    if (!user) {
      setFolders([]);
      setIsLoading(false);
      return;
    }

    try {
      const folderList = await listFolders(user.id);
      const mapped = folderList.map((folder) => ({
        id: folder.id,
        name: folder.name,
        emoji: folder.icon || '📂',
        words: folder.cards.map(mapFlashcardToVocabWord),
        createdAt: folder.created_at || new Date().toISOString(),
      }));
      setFolders(mapped);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Không thể tải danh mục từ vựng');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = useCallback(
    async (name: string, emoji: string = '📂') => {
      if (!user) return;
      try {
        const data = await createFolderApi(user.id, { name: name.trim(), icon: emoji });
        const newFolder: CustomFolder = {
          id: data.id,
          name: data.name,
          emoji: data.icon || '📂',
          words: [],
          createdAt: data.created_at || new Date().toISOString(),
        };
        setFolders((prev) => [...prev, newFolder]);
        toast.success('Đã tạo danh mục mới');
        return newFolder;
      } catch (error) {
        console.error('Error creating folder:', error);
        toast.error('Không thể tạo danh mục');
      }
    },
    [user],
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      if (!user) return;
      try {
        await deleteFolderApi(user.id, folderId);
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        toast.success('Đã xóa danh mục');
      } catch (error) {
        console.error('Error deleting folder:', error);
        toast.error('Không thể xóa danh mục');
      }
    },
    [user],
  );

  const addWordToFolder = useCallback(
    async (folderId: string, word: Omit<VocabWord, 'id'>) => {
      if (!user) return;
      try {
        const flashcard = await createFlashcard(user.id, {
          word: word.word,
          reading: word.reading ?? null,
          meaning: word.meaning,
          hanviet: word.hanviet ?? null,
          example_sentence: word.example_sentence ?? null,
          example_translation: word.example_translation ?? null,
          jlpt_level: word.jlpt_level ?? null,
        });
        await addCardToFolder(folderId, flashcard.id);
        const fullWord: VocabWord = mapFlashcardToVocabWord(flashcard);
        setFolders((prev) =>
          prev.map((f) =>
            f.id === folderId ? { ...f, words: [...f.words, fullWord] } : f,
          ),
        );
        toast.success('Đã lưu từ vào danh mục');
        return fullWord;
      } catch (error) {
        console.error('Error adding word to folder:', error);
        toast.error('Không thể thêm từ vào danh mục');
      }
    },
    [user],
  );

  const removeWordFromFolder = useCallback(
    async (folderId: string, wordId: string) => {
      if (!user) return;
      try {
        await removeCardFromFolder(folderId, wordId);
        setFolders((prev) =>
          prev.map((f) =>
            f.id === folderId ? { ...f, words: f.words.filter((w) => w.id !== wordId) } : f,
          ),
        );
        toast.success('Đã xóa từ khỏi danh mục');
      } catch (error) {
        console.error('Error removing word from folder:', error);
        toast.error('Không thể xóa từ khỏi danh mục');
      }
    },
    [user],
  );

  const saveToInbox = useCallback(
    async (word: Omit<VocabWord, 'id'>) => {
      let inbox = folders.find((f) => f.name === 'Hộp thư đến');
      if (!inbox) {
        inbox = await createFolder('Hộp thư đến', '📥');
      }
      if (inbox) {
        return await addWordToFolder(inbox.id, word);
      }
    },
    [folders, createFolder, addWordToFolder],
  );

  return {
    folders,
    isLoading,
    createFolder,
    deleteFolder,
    addWordToFolder,
    removeWordFromFolder,
    saveToInbox,
    refreshFolders: fetchFolders,
  };
};
