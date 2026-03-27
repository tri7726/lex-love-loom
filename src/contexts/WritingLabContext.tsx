import React, { createContext, useContext, useState, useCallback } from 'react';
import { GlobalWritingModal } from '@/components/kanji/GlobalWritingModal';

interface WritingLabContextType {
  openWritingLab: (word: string) => void;
  closeWritingLab: () => void;
}

const WritingLabContext = createContext<WritingLabContextType | undefined>(undefined);

export const WritingLabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [word, setWord] = useState('');

  const openWritingLab = useCallback((newWord: string) => {
    setWord(newWord);
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
