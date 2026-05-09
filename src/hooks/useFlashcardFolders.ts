import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

import { VocabWord } from '@/types/vocabulary';
import type { Database } from '@/integrations/supabase/types';

type FlashcardRow = Database['public']['Tables']['flashcards']['Row'];

function mapFlashcardToVocabWord(flashcard: FlashcardRow): VocabWord {
  return {
    id: flashcard.id,
    word: flashcard.word,
    reading: flashcard.reading,
    hanviet: flashcard.hanviet,
    meaning: flashcard.meaning,
    example_sentence: flashcard.example_sentence,
    example_translation: flashcard.example_translation,
    jlpt_level: flashcard.jlpt_level,
    word_type: flashcard.word_type,
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
 * Hook to manage flashcard folders in Supabase.
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
      const { data: folderData, error: folderError } = await supabase
        .from('vocabulary_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (folderError) throw folderError;

      const folderList = folderData || [];
      if (folderList.length === 0) {
        setFolders([]);
        return;
      }

      // Batch-fetch all folder items in one query (instead of N+1)
      const folderIds = folderList.map(f => f.id);
      const { data: allItems, error: itemsError } = await supabase
        .from('vocabulary_folder_items')
        .select(`
          folder_id,
          flashcard_id,
          flashcards (*)
        `)
        .in('folder_id', folderIds);

      if (itemsError) throw itemsError;

      // Group items by folder_id
      const itemsByFolder: Record<string, VocabWord[]> = {};
      (allItems || []).forEach(item => {
        if (!item.flashcards) return;
        const word = mapFlashcardToVocabWord(item.flashcards as FlashcardRow);
        if (!itemsByFolder[item.folder_id]) itemsByFolder[item.folder_id] = [];
        itemsByFolder[item.folder_id].push(word);
      });

      const foldersWithWords = folderList.map(folder => ({
        id: folder.id,
        name: folder.name,
        emoji: folder.icon || '📂',
        words: itemsByFolder[folder.id] || [],
        createdAt: folder.created_at || new Date().toISOString()
      }));

      setFolders(foldersWithWords);
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

  const createFolder = useCallback(async (name: string, emoji: string = '📂') => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vocabulary_folders')
        .insert({
          name: name.trim(),
          icon: emoji,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      const newFolder: CustomFolder = {
        id: data.id,
        name: data.name,
        emoji: data.icon || '📂',
        words: [],
        createdAt: data.created_at || new Date().toISOString()
      };

      setFolders(prev => [...prev, newFolder]);
      toast.success('Đã tạo danh mục mới');
      return newFolder;
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Không thể tạo danh mục');
    }
  }, [user]);

  const deleteFolder = useCallback(async (folderId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('vocabulary_folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (error) throw error;

      setFolders(prev => prev.filter(f => f.id !== folderId));
      toast.success('Đã xóa danh mục');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Không thể xóa danh mục');
    }
  }, [user]);

  const addWordToFolder = useCallback(async (folderId: string, word: Omit<VocabWord, 'id'>) => {
    if (!user) return;

    try {
      // 1. Create or get the flashcard
      const { data: flashcard, error: flashcardError } = await supabase
        .from('flashcards')
        .insert({
          word: word.word,
          reading: word.reading,
          meaning: word.meaning,
          hanviet: word.hanviet,
          example_sentence: word.example_sentence,
          example_translation: word.example_translation,
          jlpt_level: word.jlpt_level,
          user_id: user.id
        })
        .select()
        .single();

      if (flashcardError) throw flashcardError;

      // 2. Link to folder
      const { error: linkError } = await supabase
        .from('vocabulary_folder_items')
        .insert({
          folder_id: folderId,
          flashcard_id: flashcard.id
        });

      if (linkError) throw linkError;

      const fullWord: VocabWord = mapFlashcardToVocabWord(flashcard);
      
      setFolders(prev => prev.map(f =>
        f.id === folderId ? { ...f, words: [...f.words, fullWord] } : f
      ));

      toast.success('Đã lưu từ vào danh mục');
      return fullWord;
    } catch (error) {
      console.error('Error adding word to folder:', error);
      toast.error('Không thể thêm từ vào danh mục');
    }
  }, [user]);

  const removeWordFromFolder = useCallback(async (folderId: string, wordId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('vocabulary_folder_items')
        .delete()
        .eq('folder_id', folderId)
        .eq('flashcard_id', wordId);

      if (error) throw error;

      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, words: f.words.filter(w => w.id !== wordId) } : f
      ));
      
      toast.success('Đã xóa từ khỏi danh mục');
    } catch (error) {
      console.error('Error removing word from folder:', error);
      toast.error('Không thể xóa từ khỏi danh mục');
    }
  }, [user]);

  const saveToInbox = useCallback(async (word: Omit<VocabWord, 'id'>) => {
    let inbox = folders.find(f => f.name === 'Hộp thư đến');
    if (!inbox) {
      inbox = await createFolder('Hộp thư đến', '📥');
    }
    if (inbox) {
      return await addWordToFolder(inbox.id, word);
    }
  }, [folders, createFolder, addWordToFolder]);

  return {
    folders,
    isLoading,
    createFolder,
    deleteFolder,
    addWordToFolder,
    removeWordFromFolder,
    saveToInbox,
    refreshFolders: fetchFolders
  };
};
