// String comparison utilities for dictation scoring

export interface DiffResult {
  char: string;
  correct: boolean;
  expected?: string;
}

/**
 * Normalize Japanese text for comparison
 * Converts full-width to half-width, removes extra spaces, etc.
 */
export const normalizeJapanese = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/[！-～]/g, (char) => // Full-width ASCII to half-width
      String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
    )
    .toLowerCase();
};

/**
 * Compare user input with correct answer character by character
 * Returns array of diff results for rendering
 */
export const compareStrings = (
  userInput: string,
  correctAnswer: string
): DiffResult[] => {
  const normalizedUser = normalizeJapanese(userInput);
  const normalizedCorrect = normalizeJapanese(correctAnswer);
  
  const results: DiffResult[] = [];
  const maxLength = Math.max(normalizedUser.length, normalizedCorrect.length);
  
  for (let i = 0; i < maxLength; i++) {
    const userChar = normalizedUser[i] || '';
    const correctChar = normalizedCorrect[i] || '';
    
    if (userChar === correctChar) {
      results.push({ char: userChar, correct: true });
    } else if (userChar) {
      results.push({ char: userChar, correct: false, expected: correctChar });
    } else {
      results.push({ char: correctChar, correct: false, expected: correctChar });
    }
  }
  
  return results;
};

/**
 * Calculate score as percentage of correct characters
 */
export const calculateScore = (
  userInput: string,
  correctAnswer: string
): number => {
  const normalizedUser = normalizeJapanese(userInput);
  const normalizedCorrect = normalizeJapanese(correctAnswer);
  
  if (normalizedCorrect.length === 0) return 0;
  
  let correctCount = 0;
  const minLength = Math.min(normalizedUser.length, normalizedCorrect.length);
  
  for (let i = 0; i < minLength; i++) {
    if (normalizedUser[i] === normalizedCorrect[i]) {
      correctCount++;
    }
  }
  
  // Penalize for length difference
  const lengthPenalty = Math.abs(normalizedUser.length - normalizedCorrect.length);
  const adjustedScore = correctCount - lengthPenalty * 0.5;
  
  return Math.max(0, Math.round((adjustedScore / normalizedCorrect.length) * 100));
};

/**
 * Levenshtein distance for fuzzy matching
 */
export const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
};

/**
 * Check if answer is "close enough" (for partial credit)
 */
export const isSimilar = (
  userInput: string,
  correctAnswer: string,
  threshold = 0.8
): boolean => {
  const normalizedUser = normalizeJapanese(userInput);
  const normalizedCorrect = normalizeJapanese(correctAnswer);
  
  const distance = levenshteinDistance(normalizedUser, normalizedCorrect);
  const maxLength = Math.max(normalizedUser.length, normalizedCorrect.length);
  
  if (maxLength === 0) return true;
  
  const similarity = 1 - distance / maxLength;
  return similarity >= threshold;
};
