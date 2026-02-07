/**
 * SRS (Spaced Repetition System) utilities using SuperMemo SM-2 algorithm
 */

export interface SRSData {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
}

/**
 * Quality rating scale:
 * 0 - Complete blackout
 * 1 - Incorrect response, but upon seeing the correct answer it felt familiar
 * 2 - Incorrect response, but upon seeing the correct answer it seemed easy to remember
 * 3 - Correct response, but required significant difficulty to recall
 * 4 - Correct response, after some hesitation
 * 5 - Perfect response, immediate recall
 */
export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Calculate next review date and update SRS parameters based on user performance
 * Using SuperMemo SM-2 algorithm
 * 
 * @param quality - User performance rating (0-5)
 * @param easeFactor - Current ease factor (default 2.5)
 * @param interval - Current interval in days (default 0)
 * @param repetitions - Number of successful repetitions (default 0)
 * @returns Updated SRS data
 */
export function calculateNextReview(
  quality: QualityRating,
  easeFactor: number = 2.5,
  interval: number = 0,
  repetitions: number = 0
): SRSData {
  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  if (quality >= 3) {
    // Successful recall
    if (newRepetitions === 0) {
      newInterval = 1; // First time: 1 day
    } else if (newRepetitions === 1) {
      newInterval = 6; // Second time: 6 days
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    
    newRepetitions += 1;
    
    // Update ease factor
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    // Failed recall - restart from beginning
    newRepetitions = 0;
    newInterval = 1;
  }

  // Ease factor should not go below 1.3
  newEaseFactor = Math.max(1.3, newEaseFactor);

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate,
  };
}

/**
 * Convenience function to map common user actions to quality ratings
 */
export function getQualityFromAction(action: 'again' | 'hard' | 'good' | 'easy'): QualityRating {
  switch (action) {
    case 'again':
      return 0;
    case 'hard':
      return 3;
    case 'good':
      return 4;
    case 'easy':
      return 5;
  }
}

/**
 * Get interval text for display
 */
export function getIntervalText(interval: number): string {
  if (interval === 0) return 'New';
  if (interval === 1) return '1 day';
  if (interval < 30) return `${interval} days`;
  if (interval < 365) return `${Math.round(interval / 30)} months`;
  return `${Math.round(interval / 365)} years`;
}

/**
 * Check if a flashcard is due for review
 */
export function isDue(nextReviewDate: Date | string): boolean {
  const reviewDate = typeof nextReviewDate === 'string' ? new Date(nextReviewDate) : nextReviewDate;
  return reviewDate <= new Date();
}

/**
 * Get study progress percentage based on mastery level
 */
export function getMasteryPercentage(repetitions: number): number {
  // After 10 successful repetitions, consider it mastered
  return Math.min(100, (repetitions / 10) * 100);
}

/**
 * Get color based on mastery level
 */
export function getMasteryColor(repetitions: number): string {
  const percentage = getMasteryPercentage(repetitions);
  
  if (percentage >= 80) return 'text-green-500';
  if (percentage >= 60) return 'text-blue-500';
  if (percentage >= 40) return 'text-yellow-500';
  if (percentage >= 20) return 'text-orange-500';
  return 'text-red-500';
}
