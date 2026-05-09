import React, { createContext, useContext, useState, useCallback } from 'react';
import { GlobalWritingModal } from '@/components/kanji/GlobalWritingModal';

export interface LabOptions {
  allWords?: string[];
  onWordComplete?: (word: string, score: number) => void;
}

interface WritingLabContextType {
  openWritingLab: (word: string, getMastery?: (word: string) => number | null, options?: LabOptions) => void;
  closeWritingLab: () => void;
}

const WritingLabContext = createContext<WritingLabContextType | undefined>(undefined);

export const WritingLabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [word, setWord] = useState('');
  const [getMastery, setGetMastery] = useState<((word: string) => number | null) | undefined>(undefined);
  const [labOptions, setLabOptions] = useState<LabOptions | undefined>(undefined);

  const openWritingLab = useCallback((newWord: string, masteryFn?: (word: string) => number | null, options?: LabOptions) => {
    setWord(newWord);
    setGetMastery(() => masteryFn);
    setLabOptions(options);
    setIsOpen(true);
  }, []);

  const closeWritingLab = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <WritingLabContext.Provider value={{ openWritingLab, closeWritingLab }}>
      {children}
      <GlobalWritingModal
        isOpen={isOpen}
        onClose={closeWritingLab}
        word={word}
        getMastery={getMastery}
        labOptions={labOptions}
      />
    </WritingLabContext.Provider>
  );
};

export const useWritingLab = () => {
  const context = useContext(WritingLabContext);
  if (context === undefined) {
    throw new Error('useWritingLab must be used within a WritingLabProvider');
  }
  return context;
};
