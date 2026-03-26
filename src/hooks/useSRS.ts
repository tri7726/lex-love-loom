import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * SM-2 Algorithm Implementation for Spaced Repetition
 * Quality: 0-5 (0=Forgot, 5=Perfect)
 */
export const useSRS = () => {
  const { user } = useAuth();

  const updateFlashcardSRS = useCallback(async (
    flashcardId: string,
    quality: number // 0-5
  ) => {
    if (!user) return;

    // 1. Fetch current SRS state
    const { data: card, error: fetchError } = await (supabase as any)
      .from('flashcards')
      .select('ease_factor, interval, repetitions')
      .eq('id', flashcardId)
      .single();

    if (fetchError || !card) {
      console.error('Error fetching flashcard for SRS:', fetchError);
      return;
    }

    let { ease_factor, interval, repetitions } = card;

    // 2. SM-2 Algorithm Logic
    if (quality < 3) {
      // Forgot or struggle - reset
      repetitions = 0;
      interval = 1;
    } else {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.ceil(interval * ease_factor);
      }
      
      // Update EF
      ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (ease_factor < 1.3) ease_factor = 1.3;
      repetitions++;
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    // 3. Update DB
    const { error: updateError } = await (supabase as any)
      .from('flashcards')
      .update({
        ease_factor,
        interval,
        repetitions,
        next_review_date: nextReview.toISOString(),
        last_reviewed_at: new Date().toISOString(),
      })
      .eq('id', flashcardId);

    if (updateError) {
      console.error('Error updating SRS data:', updateError);
    }

    return { interval, nextReview };
  }, [user]);

  /**
   * Finds a flashcard by word text and updates its SRS state
   */
  const updateSRSByWord = useCallback(async (
    word: string, 
    quality: number
  ) => {
    if (!user) return;

    // FIND the flashcard for this word
    const { data: card, error: findError } = await (supabase as any)
      .from('flashcards')
      .select('id')
      .eq('user_id', user.id)
      .eq('word', word)
      .limit(1)
      .maybeSingle();

    if (findError || !card) {
      // If card doesn't exist, we don't update (or we could auto-create it)
      return;
    }

    return updateFlashcardSRS(card.id, quality);
  }, [user, updateFlashcardSRS]);

  /**
   * Synchronize a Kanji Lab result (0-100 score) to SRS
   */
  const syncLabResult = useCallback(async (kanji: string, score: number) => {
    // 100% -> 5, 80% -> 4, 60% -> 3...
    const quality = Math.min(5, Math.floor(score / 20));
    return updateSRSByWord(kanji, quality);
  }, [updateSRSByWord]);

  /**
   * Synchronize a Quiz result (isCorrect boolean) to SRS
   */
  const syncQuizResult = useCallback(async (word: string, isCorrect: boolean) => {
    const quality = isCorrect ? 5 : 1; // 5 for perfect, 1 for fail
    return updateSRSByWord(word, quality);
  }, [updateSRSByWord]);

  return { updateFlashcardSRS, syncLabResult, syncQuizResult, updateSRSByWord };
};
