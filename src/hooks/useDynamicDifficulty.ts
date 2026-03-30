/**
 * useDynamicDifficulty
 *
 * Implements Dynamic Difficulty Adjustment (DDA) — automatically
 * calibrates question difficulty based on the user's recent performance.
 *
 * - rolling_accuracy tracks last N answers (default 10)
 * - If accuracy > 80%: increase difficulty (harder vocab, less time)
 * - If accuracy < 50%: decrease difficulty (easier words, more hints)
 * - 50-80%: maintain current difficulty (Flow Zone)
 */

import { useState, useCallback, useMemo } from 'react';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'extreme';

interface DifficultyConfig {
  level: DifficultyLevel;
  timePerQuestion: number; // seconds
  showHints: boolean;
  jlptFilter: string[];   // e.g. ['N5'] for easy, ['N2', 'N1'] for hard
  optionCount: number;    // 4 (easy) or 6 (hard)
  label: string;
  emoji: string;
  color: string;
}

const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  easy: {
    level: 'easy',
    timePerQuestion: 20,
    showHints: true,
    jlptFilter: ['N5', 'N4'],
    optionCount: 3,
    label: 'Nhẹ nhàng',
    emoji: '🌸',
    color: 'text-emerald-500',
  },
  medium: {
    level: 'medium',
    timePerQuestion: 12,
    showHints: false,
    jlptFilter: ['N5', 'N4', 'N3'],
    optionCount: 4,
    label: 'Cân bằng',
    emoji: '⚡',
    color: 'text-amber-500',
  },
  hard: {
    level: 'hard',
    timePerQuestion: 8,
    showHints: false,
    jlptFilter: ['N3', 'N2'],
    optionCount: 4,
    label: 'Thử thách',
    emoji: '🔥',
    color: 'text-orange-500',
  },
  extreme: {
    level: 'extreme',
    timePerQuestion: 4,
    showHints: false,
    jlptFilter: ['N2', 'N1'],
    optionCount: 6,
    label: 'Địa ngục',
    emoji: '💀',
    color: 'text-red-600',
  },
};

const WINDOW_SIZE = 10; // number of answers to consider
const INCREASE_THRESHOLD = 0.80; // > 80% correct → harder
const DECREASE_THRESHOLD = 0.50; // < 50% correct → easier

export function useDynamicDifficulty(initialLevel: DifficultyLevel = 'medium') {
  const [level, setLevel] = useState<DifficultyLevel>(initialLevel);
  const [answers, setAnswers] = useState<boolean[]>([]); // rolling window

  const config = DIFFICULTY_CONFIGS[level];

  /** Record a new answer and adjust difficulty if needed */
  const recordAnswer = useCallback((correct: boolean) => {
    setAnswers(prev => {
      const updated = [...prev, correct].slice(-WINDOW_SIZE); // keep last N

      if (updated.length >= WINDOW_SIZE) {
        const accuracy = updated.filter(Boolean).length / updated.length;

        setLevel(currentLevel => {
          const levels: DifficultyLevel[] = ['easy', 'medium', 'hard', 'extreme'];
          const idx = levels.indexOf(currentLevel);

          if (accuracy > INCREASE_THRESHOLD && idx < levels.length - 1) {
            // Too easy — go up
            return levels[idx + 1];
          } else if (accuracy < DECREASE_THRESHOLD && idx > 0) {
            // Too hard — go down
            return levels[idx - 1];
          }
          return currentLevel;
        });
      }

      return updated;
    });
  }, []);

  const rollingAccuracy = useMemo(() => {
    if (answers.length === 0) return null;
    return Math.round((answers.filter(Boolean).length / answers.length) * 100);
  }, [answers]);

  const resetDifficulty = useCallback((newLevel?: DifficultyLevel) => {
    setLevel(newLevel ?? 'medium');
    setAnswers([]);
  }, []);

  const allConfigs = DIFFICULTY_CONFIGS;

  return {
    level,
    config,
    rollingAccuracy,
    answersWindow: answers,
    recordAnswer,
    resetDifficulty,
    allConfigs,
  };
}
