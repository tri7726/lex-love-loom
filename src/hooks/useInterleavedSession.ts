/**
 * useInterleavedSession
 * Implements Interleaved Practice by mixing question types within a session.
 *
 * Instead of studying all Vocab then all Kanji then Grammar,
 * questions are interleaved: Vocab → Kanji → Grammar → Vocab → ...
 *
 * Research shows interleaving is harder but produces 2x better retention
 * compared to blocked (massed) practice.
 */

import { useState, useCallback, useMemo } from 'react';

export type QuestionCategory = 'vocab' | 'kanji' | 'grammar' | 'listening';

export interface InterleavedItem {
  id: string;
  category: QuestionCategory;
  data: Record<string, unknown>;
}

interface UseInterleavedSessionOptions {
  /** How many items to pull from each category per cycle */
  pattern?: QuestionCategory[];
}

/**
 * Creates an interleaved ordering from categorized items.
 * Pattern: [vocab, kanji, grammar, vocab, kanji, ...] by default
 */
function interleave(items: InterleavedItem[], pattern: QuestionCategory[]): InterleavedItem[] {
  const buckets: Record<QuestionCategory, InterleavedItem[]> = {
    vocab: [],
    kanji: [],
    grammar: [],
    listening: [],
  };

  // Shuffle and bucket items by category
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  for (const item of shuffled) {
    buckets[item.category].push(item);
  }

  const result: InterleavedItem[] = [];
  let exhausted = false;
  let cycle = 0;

  while (!exhausted) {
    exhausted = true;
    for (const cat of pattern) {
      const idx = Math.floor(cycle / 1); // one item per category per cycle
      const bucket = buckets[cat];
      const globalIdx = Math.floor(result.filter(r => r.category === cat).length);
      if (globalIdx < bucket.length) {
        result.push(bucket[globalIdx]);
        exhausted = false;
      }
    }
    cycle++;
    // Safety: avoid infinite loops
    if (cycle > 1000) break;
  }

  return result;
}

export function useInterleavedSession(options: UseInterleavedSessionOptions = {}) {
  const pattern = options.pattern ?? ['vocab', 'kanji', 'grammar', 'vocab', 'kanji'];

  const [items, setItems] = useState<InterleavedItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [history, setHistory] = useState<{ item: InterleavedItem; correct: boolean }[]>([]);

  const session = useMemo(() => interleave(items, pattern), [items, pattern]);

  const currentItem = session[currentIdx] ?? null;
  const isComplete = currentIdx >= session.length;
  const progress = session.length === 0 ? 0 : (currentIdx / session.length) * 100;

  const loadItems = useCallback((newItems: InterleavedItem[]) => {
    setItems(newItems);
    setCurrentIdx(0);
    setHistory([]);
  }, []);

  const advance = useCallback((correct: boolean) => {
    if (!currentItem) return;
    setHistory(h => [...h, { item: currentItem, correct }]);
    setCurrentIdx(i => i + 1);
  }, [currentItem]);

  const reset = useCallback(() => {
    setCurrentIdx(0);
    setHistory([]);
  }, []);

  const stats = useMemo(() => {
    const byCategory = history.reduce<Record<string, { correct: number; total: number }>>((acc, h) => {
      const cat = h.item.category;
      if (!acc[cat]) acc[cat] = { correct: 0, total: 0 };
      acc[cat].total++;
      if (h.correct) acc[cat].correct++;
      return acc;
    }, {});

    const totalCorrect = history.filter(h => h.correct).length;
    const accuracy = history.length === 0 ? 0 : Math.round((totalCorrect / history.length) * 100);

    return { byCategory, totalCorrect, accuracy, total: history.length };
  }, [history]);

  return {
    session,
    currentItem,
    currentIdx,
    isComplete,
    progress,
    history,
    stats,
    loadItems,
    advance,
    reset,
  };
}

/**
 * Convenience: convert flashcards + kanji from DB into InterleavedItem[]
 */
export function toInterleavedItems(
  flashcards: Array<{ id: string; word: string; reading: string; meaning: string }>,
  kanji?: Array<{ id: string; character: string; meaning: string }>
): InterleavedItem[] {
  const vocabItems: InterleavedItem[] = flashcards.map(f => ({
    id: f.id,
    category: 'vocab',
    data: { word: f.word, reading: f.reading, meaning: f.meaning },
  }));

  const kanjiItems: InterleavedItem[] = (kanji ?? []).map(k => ({
    id: k.id,
    category: 'kanji',
    data: { character: k.character, meaning: k.meaning },
  }));

  return [...vocabItems, ...kanjiItems];
}
