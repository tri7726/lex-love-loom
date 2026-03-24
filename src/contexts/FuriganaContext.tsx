import React, { createContext, useContext, useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';

export type FuriganaMode = 'always' | 'n5' | 'n4' | 'n3' | 'n2' | 'never' | 'smart';

interface FuriganaContextType {
  mode: FuriganaMode;
  setMode: (mode: FuriganaMode) => void;
  userLevel: string;
}

const FuriganaContext = createContext<FuriganaContextType | undefined>(undefined);

export const FuriganaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useProfile();
  const [mode, setMode] = useState<FuriganaMode>(() => {
    const saved = localStorage.getItem('furigana-mode');
    return (saved as FuriganaMode) || 'smart';
  });

  const userLevel = profile?.jlpt_level || 'N5';

  // Save to localStorage immediately
  useEffect(() => {
    localStorage.setItem('furigana-mode', mode);
  }, [mode]);

  return (
    <FuriganaContext.Provider value={{ mode, setMode, userLevel }}>
      {children}
    </FuriganaContext.Provider>
  );
};

export const useFurigana = () => {
  const context = useContext(FuriganaContext);
  if (context === undefined) {
    throw new Error('useFurigana must be used within a FuriganaProvider');
  }
  return context;
};
