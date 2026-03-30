/**
 * FSRS (Free Spaced Repetition Scheduler) v4 Implementation
 * Replaces the old SM-2 algorithm with a more accurate model.
 *
 * Key concepts:
 *  D = Difficulty (1-10, higher = harder)
 *  S = Stability (days until 90% retention)
 *  R = Retrievability (current recall probability)
 *
 * Rating scale: 1=Again, 2=Hard, 3=Good, 4=Easy
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// FSRS-4 constants (tuned defaults)
const w = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61];
const DECAY = -0.5;
const FACTOR = 0.9 ** (1 / DECAY) - 1;
const REQUEST_RETENTION = 0.9;

function forgettingCurve(t: number, s: number): number {
  return (1 + FACTOR * (t / s)) ** DECAY;
}

function initDifficulty(rating: number): number {
  return Math.min(10, Math.max(1, w[4] - (rating - 3) * w[5]));
}

function initStability(rating: number): number {
  return Math.max(0.1, w[rating - 1]);
}

function nextInterval(s: number): number {
  return Math.max(1, Math.round(s / FACTOR * (REQUEST_RETENTION ** (1 / DECAY) - 1)));
}

function updateDifficulty(d: number, rating: number): number {
  const delta = -w[6] * (rating - 3);
  const mean = 5 - (5 - d) * Math.exp(-w[7] * (w[6] - 1 - delta));
  return Math.min(10, Math.max(1, mean));
}

function updateStability(d: number, s: number, r: number, rating: number): number {
  if (rating === 1) {
    // Forgetting: short-term stability
    return w[11] * d ** (-w[12]) * ((s + 1) ** w[13] - 1) * Math.exp(w[14] * (1 - r));
  }
  // Recall
  const hardPenalty = rating === 2 ? w[15] : 1;
  const easyBonus  = rating === 4 ? w[16] : 1;
  return s * (Math.exp(w[8]) * (11 - d) * s ** (-w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * hardPenalty * easyBonus + 1);
}

export type FSRSRating = 1 | 2 | 3 | 4; // Again | Hard | Good | Easy

export const useFSRS = () => {
  const { user } = useAuth();

  const reviewCard = useCallback(async (flashcardId: string, rating: FSRSRating) => {
    if (!user) return;

    // Fetch current state
    const { data: card } = await (supabase as any)
      .from('flashcards')
      .select('fsrs_difficulty, fsrs_stability, fsrs_state, interval, repetitions')
      .eq('id', flashcardId)
      .single();

    if (!card) return;

    const now = new Date();
    let d: number, s: number, newState: string;

    if (!card.fsrs_state || card.fsrs_state === 'new') {
      // First review
      d = initDifficulty(rating);
      s = initStability(rating);
      newState = rating === 1 ? 'learning' : 'review';
    } else {
      // Subsequent review
      const t = card.interval ?? 1;
      const r = forgettingCurve(t, card.fsrs_stability ?? 1);
      d = updateDifficulty(card.fsrs_difficulty ?? 5, rating);
      s = updateStability(d, card.fsrs_stability ?? 1, r, rating);
      newState = rating === 1 ? 'relearning' : 'review';
    }

    const interval = rating === 1 ? 1 : nextInterval(s);
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + interval);

    await (supabase as any)
      .from('flashcards')
      .update({
        fsrs_difficulty: d,
        fsrs_stability: s,
        fsrs_state: newState,
        interval,
        repetitions: (card.repetitions ?? 0) + 1,
        next_review_date: nextReview.toISOString(),
        last_reviewed_at: now.toISOString(),
        // Keep ease_factor compatible for old SM2 queries
        ease_factor: Math.max(1.3, 1.3 + (d - 5) * 0.05),
      })
      .eq('id', flashcardId);

    // RAG log
    const label = ['Again', 'Hard', 'Good', 'Easy'][rating - 1];
    const { data: wordData } = await (supabase as any)
      .from('flashcards').select('word, meaning').eq('id', flashcardId).single();

    if (wordData?.word) {
      supabase.functions.invoke('sensei-rag', {
        body: {
          action: 'index',
          user_id: user.id,
          content: `FSRS Review: "${wordData.word}" rated ${label}. Stability: ${s.toFixed(2)} days. Next review: ${interval} days.`,
          source_type: 'flashcard',
          metadata: { flashcard_id: flashcardId, rating, stability: s, interval }
        }
      }).catch(() => {});
    }

    return { interval, nextReview, stability: s, difficulty: d };
  }, [user]);

  /** Convert old quality (0-5) to FSRS rating (1-4) */
  const qualityToRating = (quality: number): FSRSRating => {
    if (quality <= 1) return 1; // Again
    if (quality <= 2) return 2; // Hard
    if (quality <= 4) return 3; // Good
    return 4; // Easy
  };

  /** Legacy adapter: keep old SRS calls working */
  const updateFlashcardSRS = useCallback(async (flashcardId: string, quality: number) => {
    return reviewCard(flashcardId, qualityToRating(quality));
  }, [reviewCard]);

  const syncQuizResult = useCallback(async (word: string, isCorrect: boolean) => {
    if (!user) return;
    const { data: card } = await (supabase as any)
      .from('flashcards').select('id').eq('user_id', user.id).eq('word', word).limit(1).maybeSingle();
    if (card) return reviewCard(card.id, isCorrect ? 3 : 1);
  }, [user, reviewCard]);

  const syncLabResult = useCallback(async (kanji: string, score: number) => {
    let rating: FSRSRating = 1;
    if (score >= 90) rating = 4;
    else if (score >= 70) rating = 3;
    else if (score >= 50) rating = 2;
    if (!user) return;
    const { data: card } = await (supabase as any)
      .from('flashcards').select('id').eq('user_id', user.id).eq('word', kanji).limit(1).maybeSingle();
    if (card) return reviewCard(card.id, rating);
  }, [user, reviewCard]);

  return { reviewCard, updateFlashcardSRS, syncQuizResult, syncLabResult, qualityToRating };
};
