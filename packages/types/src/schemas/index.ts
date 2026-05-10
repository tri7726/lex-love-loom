import { z } from "zod";

export const JlptLevelSchema = z.enum(["N5", "N4", "N3", "N2", "N1"]);
export type JlptLevel = z.infer<typeof JlptLevelSchema>;

/** POST /ai/explain */
export const ExplainSchema = z.object({
  prompt: z.string().min(1).max(2000),
  level: JlptLevelSchema.optional(),
  context: z.string().max(4000).optional(),
});
export type ExplainDto = z.infer<typeof ExplainSchema>;

/** POST /quiz/grammar */
export const GrammarQuizSchema = z.object({
  level: JlptLevelSchema,
  topic: z.string().min(1).max(200),
  count: z.number().int().min(1).max(20).default(5),
});
export type GrammarQuizDto = z.infer<typeof GrammarQuizSchema>;

/** POST /speaking/analyze */
export const SpeakingAnalyzeSchema = z.object({
  reference: z.string().min(1),
  transcript: z.string().min(1),
});
export type SpeakingAnalyzeDto = z.infer<typeof SpeakingAnalyzeSchema>;

/** POST /rag/query */
export const RagQuerySchema = z.object({
  query: z.string().min(1).max(500),
  topK: z.number().int().min(1).max(20).default(5),
});
export type RagQueryDto = z.infer<typeof RagQuerySchema>;
