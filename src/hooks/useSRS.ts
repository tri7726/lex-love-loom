/**
 * useSRS — backward-compatible wrapper around the new FSRS v4 algorithm.
 * All existing callers continue to work without changes.
 */
import { useFSRS } from '@/hooks/useFSRS';

export const useSRS = () => {
  const fsrs = useFSRS();
  return {
    updateFlashcardSRS: fsrs.updateFlashcardSRS,
    syncLabResult: fsrs.syncLabResult,
    syncQuizResult: fsrs.syncQuizResult,
    updateSRSByWord: async (word: string, quality: number) =>
      fsrs.syncQuizResult(word, quality >= 3),
  };
};
