import { z } from 'zod';

export const JlptLevelSchema = z.enum(['N5', 'N4', 'N3', 'N2', 'N1']);

/**
 * Mirrors the Edge Function `generate-grammar-quiz` request body.
 * Two modes:
 *  - `quiz` (default): generates 3 questions about a specific grammar point.
 *  - `assessment`: generates 5 level-test questions for `currentLevel`.
 */
export const GrammarQuizSchema = z.object({
  mode: z.enum(['quiz', 'assessment']).optional().default('quiz'),
  grammar_point: z.string().max(500).optional(),
  level: JlptLevelSchema.optional(),
  explanation: z.string().max(2000).optional(),
  currentLevel: JlptLevelSchema.optional(),
});

export type GrammarQuizDto = z.infer<typeof GrammarQuizSchema>;

export const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correct_answer: z.number().int().min(0).max(3),
  explanation: z.string(),
  furigana: z.string().optional().default(''),
});

export const QuizResultSchema = z.object({
  level_tested: JlptLevelSchema.optional(),
  questions: z.array(QuizQuestionSchema).min(1),
});

export type QuizResult = z.infer<typeof QuizResultSchema>;
