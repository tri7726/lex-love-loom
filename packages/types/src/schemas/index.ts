import { z } from "zod";

export const JlptLevelSchema = z.enum(["N5", "N4", "N3", "N2", "N1"]);
export type JlptLevel = z.infer<typeof JlptLevelSchema>;

export const ExplainTypeSchema = z.enum([
  "grammar",
  "vocab",
  "kanji",
  "error",
  "pattern",
]);
export type ExplainType = z.infer<typeof ExplainTypeSchema>;

/** POST /ai/explain — request */
export const ExplainSchema = z.object({
  question: z.string().min(1).max(2000),
  context: z.string().max(4000).optional(),
  explain_type: ExplainTypeSchema.optional().default("grammar"),
});
export type ExplainDto = z.infer<typeof ExplainSchema>;

/** POST /ai/explain — response (shared with Edge `ai-explain`) */
export const ReasoningStepSchema = z.object({
  step: z.number().int(),
  title: z.string(),
  explanation: z.string(),
  example: z.string().optional(),
});
export const DeepExplainResultSchema = z.object({
  reasoning_steps: z.array(ReasoningStepSchema),
  conclusion: z.string(),
  difficulty: z.string(),
  related_patterns: z.array(z.string()),
  mnemonics: z.string().optional(),
  common_mistakes: z.string().optional(),
  model_used: z.string().optional(),
});
export type DeepExplainResult = z.infer<typeof DeepExplainResultSchema>;

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
