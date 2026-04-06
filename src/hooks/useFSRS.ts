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
import { offlineSync } from '@/lib/offlineSync';

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

/**
 * Preview next intervals for all 4 ratings without writing to DB.
 * Returns { again, hard, good, easy } in days.
 */
export function previewIntervals(card: { fsrs_difficulty?: number; fsrs_stability?: number; fsrs_state?: string; interval?: number } | null): { again: number; hard: number; good: number; easy: number } {
  if (!card || !card.fsrs_state || card.fsrs_state === 'new') {
    // First review previews
    return {
      again: 1,
      hard: nextInterval(initStability(2)),
      good: nextInterval(initStability(3)),
      easy: nextInterval(initStability(4)),
    };
  }
  const t = card.interval ?? 1;
  const s = card.fsrs_stability ?? 1;
  const d = card.fsrs_difficulty ?? 5;
  const r = forgettingCurve(t, s);
  return {
    again: 1,
    hard: nextInterval(updateStability(d, s, r, 2)),
    good: nextInterval(updateStability(d, s, r, 3)),
    easy: nextInterval(updateStability(d, s, r, 4)),
  };
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

  const reviewCard = useCallback(async (flashcardId: string, rating: FSRSRating, providedCard?: any) => {
    if (!user) return;

    // Use provided data or fetch current state
    const card = providedCard || (await (supabase as any)
      .from('flashcards')
      .select('fsrs_difficulty, fsrs_stability, fsrs_state, interval, repetitions')
      .eq('id', flashcardId)
      .single()).data;

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

    const updateFields = {
      fsrs_difficulty: d,
      fsrs_stability: s,
      fsrs_state: newState,
      interval,
      repetitions: (card.repetitions ?? 0) + 1,
      next_review_date: nextReview.toISOString(),
      last_reviewed_at: now.toISOString(),
      ease_factor: Math.max(1.3, 1.3 + (d - 5) * 0.05),
    };

    // Check if online
    if (navigator.onLine) {
      try {
        await (supabase as any)
          .from('flashcards')
          .update(updateFields)
          .eq('id', flashcardId);

        // Try RAG log (don't block if it fails)
        const label = ['Again', 'Hard', 'Good', 'Easy'][rating - 1];
        supabase.functions.invoke('sensei-rag', {
          body: {
            action: 'index',
            user_id: user.id,
            content: `FSRS Review: rated ${label}. Stability: ${s.toFixed(2)} days.`,
            source_type: 'flashcard',
            metadata: { flashcard_id: flashcardId, rating, stability: s, interval }
          }
        }).catch(() => {});
      } catch (e) {
        // Fallback to offline queue if update fails
        await offlineSync.queueReview({
          type: 'REVIEW',
          flashcardId,
          rating,
          timestamp: now.toISOString(),
          data: updateFields
        });
      }
    } else {
      // Offline mode
      await offlineSync.queueReview({
        type: 'REVIEW',
        flashcardId,
        rating,
        timestamp: now.toISOString(),
        data: updateFields
      });
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
      .from('flashcards').select('id, fsrs_difficulty, fsrs_stability, fsrs_state, interval, repetitions').eq('user_id', user.id).eq('word', word).limit(1).maybeSingle();
    if (card) return reviewCard(card.id, isCorrect ? 3 : 1, card);
  }, [user, reviewCard]);

  const syncLabResult = useCallback(async (kanji: string, score: number) => {
    let rating: FSRSRating = 1;
    if (score >= 90) rating = 4;
    else if (score >= 70) rating = 3;
    else if (score >= 50) rating = 2;
    if (!user) return;
    const { data: card } = await (supabase as any)
      .from('flashcards').select('id, fsrs_difficulty, fsrs_stability, fsrs_state, interval, repetitions').eq('user_id', user.id).eq('word', kanji).limit(1).maybeSingle();
    if (card) return reviewCard(card.id, rating, card);
  }, [user, reviewCard]);

  /** Sync all queued actions */
  const flushSyncQueue = useCallback(async () => {
    const queue = await offlineSync.getQueue();
    if (queue.length === 0) return 0;

    let syncedCount = 0;
    for (const action of queue) {
      try {
        if (action.type === 'REVIEW') {
           const { error } = await (supabase as any)
            .from('flashcards')
            .update(action.data)
            .eq('id', action.flashcardId);
          
          if (!error) {
            await offlineSync.clearQueueItem(action.id!);
            syncedCount++;
          }
        }
      } catch (e) {
        console.error('Failed to sync item:', e);
      }
    }
    return syncedCount;
  }, []);

  return { reviewCard, updateFlashcardSRS, syncQuizResult, syncLabResult, qualityToRating, flushSyncQueue };
};
