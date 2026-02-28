import { useState, useEffect, useCallback } from 'react';

/**
 * Common types shared across the application for Notebook/Flashcard functionality.
 */
export interface VocabWord {
  id: string;
  word: string;
  reading: string | null;
  hanviet?: string | null;
  meaning: string;
  mastery_level?: number | null;
  example_sentence?: string;
  example_translation?: string;
  jlpt_level?: string;
  word_type?: string;
}

export interface CustomFolder {
  id: string;
  name: string;
  emoji: string;
  words: VocabWord[];
  createdAt: string;
}

const CUSTOM_FOLDERS_KEY = 'lex-custom-folders';

const defaultFolders: CustomFolder[] = [
  { 
    id: 'sample-folder', 
    name: 'Từ vựng mẫu', 
    emoji: '📚', 
    words: [
      { id: 'sample-1', word: '学校', reading: 'がっこう', hanviet: 'Học Hiệu', meaning: 'Trường học' },
      { id: 'sample-2', word: '先生', reading: 'せんせい', hanviet: 'Tiên Sinh', meaning: 'Giáo viên, thầy/cô' },
    ], 
    createdAt: new Date().toISOString() 
  },
];

/**
 * Hook to manage flashcard folders in localStorage with cross-tab/component synchronization.
 */
export const useFlashcardFolders = () => {
  const [folders, setFolders] = useState<CustomFolder[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_FOLDERS_KEY);
      return stored ? JSON.parse(stored) : defaultFolders;
    } catch {
      return defaultFolders;
    }
  });

  // Sync folders across components/tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CUSTOM_FOLDERS_KEY) {
        try {
          const updated = e.newValue ? JSON.parse(e.newValue) : defaultFolders;
          setFolders(updated);
        } catch { /* ignore */ }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also poll slightly or rely on local updates
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem(CUSTOM_FOLDERS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (JSON.stringify(parsed) !== JSON.stringify(folders)) {
            setFolders(parsed);
          }
        }
      } catch { /* ignore */ }
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [folders]);

  const saveFolders = useCallback((updated: CustomFolder[]) => {
    setFolders(updated);
    localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(updated));
    // Trigger local event for same-tab components
    window.dispatchEvent(new Event('storage'));
  }, []);

  const createFolder = useCallback((name: string, emoji: string = '📂') => {
    const newFolder: CustomFolder = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      emoji,
      words: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [...folders, newFolder];
    saveFolders(updated);
    return newFolder;
  }, [folders, saveFolders]);

  const deleteFolder = useCallback((folderId: string) => {
    const updated = folders.filter(f => f.id !== folderId);
    saveFolders(updated);
  }, [folders, saveFolders]);

  const addWordToFolder = useCallback((folderId: string, word: Omit<VocabWord, 'id'>) => {
    const wordWithId: VocabWord = {
      ...word,
      id: `word-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    };
    
    const updated = folders.map(f => 
      f.id === folderId ? { ...f, words: [...f.words, wordWithId] } : f
    );
    saveFolders(updated);
    return wordWithId;
  }, [folders, saveFolders]);

  const removeWordFromFolder = useCallback((folderId: string, wordId: string) => {
    const updated = folders.map(f => 
      f.id === folderId ? { ...f, words: f.words.filter(w => w.id !== wordId) } : f
    );
    saveFolders(updated);
  }, [folders, saveFolders]);

  return {
    folders,
    createFolder,
    deleteFolder,
    addWordToFolder,
    removeWordFromFolder,
    refreshFolders: () => {
      const stored = localStorage.getItem(CUSTOM_FOLDERS_KEY);
      if (stored) setFolders(JSON.parse(stored));
    }
  };
};
