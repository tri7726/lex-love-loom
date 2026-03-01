import { useState, useEffect } from 'react';

export type MasteryLevel = 'new' | 'learning' | 'mastered';

interface MasteryData {
  progress: number;
  level: MasteryLevel;
  lastPracticed: string;
}

export const useGrammarMastery = () => {
  const [mastery, setMastery] = useState<Record<string, MasteryData>>({});

  useEffect(() => {
    const saved = localStorage.getItem('grammar_mastery');
    if (saved) {
      try {
        setMastery(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading grammar mastery:', e);
      }
    }
  }, []);

  const updateMastery = (id: string, scorePercent: number) => {
    setMastery(prev => {
      const current = prev[id] || { progress: 0, level: 'new', lastPracticed: '' };
      
      // Calculate new progress (average of old progress and new score)
      // or some other logic. Let's say +10% per successful session up to 100%
      let newProgress = current.progress + (scorePercent / 10);
      if (newProgress > 100) newProgress = 100;

      let newLevel: MasteryLevel = 'new';
      if (newProgress >= 100) {
        newLevel = 'mastered';
      } else if (newProgress > 0) {
        newLevel = 'learning';
      }

      const newData = {
        ...prev,
        [id]: {
          progress: Math.round(newProgress),
          level: newLevel,
          lastPracticed: new Date().toISOString()
        }
      };

      localStorage.setItem('grammar_mastery', JSON.stringify(newData));
      return newData;
    });
  };

  const getMastery = (id: string): MasteryData => {
    return mastery[id] || { progress: 0, level: 'new', lastPracticed: '' };
  };

  return { mastery, updateMastery, getMastery };
};
