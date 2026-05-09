import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MasteryLevel = 'new' | 'learning' | 'mastered';

export interface MasteryData {
  progress: number;
  level: MasteryLevel;
  streak: number;
  lapses: number;
  nextReview: string;
  lastPracticed: string;
}

interface UseGrammarMasteryOptions {
  userId?: string | null;
}

const STORAGE_KEY = 'grammar_mastery_v2';

/** Get next review interval (in days) based on streak */
const getInterval = (streak: number): number => {
  if (streak <= 0) return 0;
  if (streak === 1) return 1;
  if (streak === 2) return 3;
  if (streak <= 5) return 7;
  return 14; // longer streaks = longer intervals
};

export const useGrammarMastery = (options?: UseGrammarMasteryOptions) => {
  const { userId } = options || {};
  const [mastery, setMastery] = useState<Record<string, MasteryData>>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMastery(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading grammar mastery:', e);
      }
    }
  }, []);

  const persist = useCallback((data: Record<string, MasteryData>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const syncToCloud = useCallback(async (id: string, data: MasteryData) => {
    if (!userId) return;
    try {
      await supabase.functions.invoke('sensei-rag', {
        body: {
          action: 'index',
          user_id: userId,
          content: `Grammar mastery: "${id}" — ${data.level} (${data.progress}%), streak=${data.streak}, lapses=${data.lapses}`,
          source_type: 'grammar_mastery',
          metadata: {
            grammar_point_id: id,
            progress: data.progress,
            level: data.level,
            streak: data.streak,
            lapses: data.lapses,
            nextReview: data.nextReview,
          }
        }
      });
    } catch (e) {
      console.warn('Failed to sync grammar mastery to cloud:', e);
    }
  }, [userId]);

  const updateMastery = useCallback((id: string, scorePercent: number) => {
    setMastery(prev => {
      const current = prev[id] || {
        progress: 0,
        level: 'new' as MasteryLevel,
        streak: 0,
        lapses: 0,
        nextReview: '',
        lastPracticed: ''
      };

      const passed = scorePercent >= 80;
      const newStreak = passed ? current.streak + 1 : 0;
      const newLapses = passed ? current.lapses : current.lapses + 1;

      // Smoothed progress: blend old progress with new score
      const weighFactor = current.progress > 0 ? 0.4 : 0.6;
      let newProgress = Math.round(
        current.progress * (1 - weighFactor) + scorePercent * weighFactor
      );
      if (newProgress > 100) newProgress = 100;
      if (newProgress < 0) newProgress = 0;

      // Determine level
      let newLevel: MasteryLevel = 'new';
      if (newProgress >= 100) {
        newLevel = 'mastered';
      } else if (newProgress >= 60) {
        newLevel = 'learning';
      }

      // FSRS-lite interval
      const intervalDays = passed ? getInterval(newStreak) : 0;
      const nextReview = passed
        ? new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 60 * 1000).toISOString(); // retry soon if failed

      const newData: MasteryData = {
        progress: newProgress,
        level: newLevel,
        streak: newStreak,
        lapses: newLapses,
        nextReview,
        lastPracticed: new Date().toISOString()
      };

      const updated = { ...prev, [id]: newData };
      persist(updated);
      syncToCloud(id, newData);

      return updated;
    });
  }, [persist, syncToCloud]);

  const getMastery = useCallback((id: string): MasteryData => {
    return mastery[id] || {
      progress: 0,
      level: 'new' as MasteryLevel,
      streak: 0,
      lapses: 0,
      nextReview: '',
      lastPracticed: ''
    };
  }, [mastery]);

  /** Count mastery stats by JLPT level. Points array must include `level` field. */
  const getMasteryStats = useCallback(<T extends { id: string; level: string }>(
    points: T[]
  ): Record<string, { mastered: number; learning: number; new: number }> => {
    const stats: Record<string, { mastered: number; learning: number; new: number }> = {};

    for (const point of points) {
      const lvl = point.level;
      if (!stats[lvl]) stats[lvl] = { mastered: 0, learning: 0, new: 0 };

      const m = mastery[point.id];
      if (!m || m.level === 'new') stats[lvl].new++;
      else if (m.level === 'mastered') stats[lvl].mastered++;
      else stats[lvl].learning++;
    }

    return stats;
  }, [mastery]);

  /** Get items due for review (nextReview <= now) */
  const getDueItems = useCallback(<T extends { id: string }>(
    points: T[]
  ): T[] => {
    const now = Date.now();
    return points.filter(p => {
      const m = mastery[p.id];
      if (!m || !m.nextReview) return false;
      return new Date(m.nextReview).getTime() <= now && m.level !== 'mastered';
    });
  }, [mastery]);

  return { mastery, updateMastery, getMastery, getMasteryStats, getDueItems };
};
