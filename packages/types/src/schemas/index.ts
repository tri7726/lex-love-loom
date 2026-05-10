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

/* ========================================================================== *
 *  Vocabulary  (saved_vocabulary table — quick-saved single words)
 * ========================================================================== */
export const SavedVocabularyRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  word: z.string(),
  reading: z.string().nullable().optional(),
  meaning: z.string(),
  example_sentence: z.string().nullable().optional(),
  mastery_level: z.number().int().min(0).max(5).nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});
export type SavedVocabularyRow = z.infer<typeof SavedVocabularyRowSchema>;

export const UpsertVocabularySchema = z.object({
  word: z.string().min(1).max(200),
  reading: z.string().max(200).nullable().optional(),
  meaning: z.string().min(1).max(2000),
  example_sentence: z.string().max(2000).nullable().optional(),
  mastery_level: z.number().int().min(0).max(5).optional(),
});
export type UpsertVocabularyDto = z.infer<typeof UpsertVocabularySchema>;

export const UpdateVocabularySchema = UpsertVocabularySchema.partial();
export type UpdateVocabularyDto = z.infer<typeof UpdateVocabularySchema>;

export const VocabularyListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
});
export type VocabularyListQueryDto = z.infer<typeof VocabularyListQuerySchema>;

/* ========================================================================== *
 *  Flashcards (rich SRS cards) + Folders
 * ========================================================================== */
export const FlashcardRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  word: z.string(),
  reading: z.string().nullable().optional(),
  hanviet: z.string().nullable().optional(),
  meaning: z.string(),
  example_sentence: z.string().nullable().optional(),
  example_translation: z.string().nullable().optional(),
  audio_url: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  jlpt_level: z.string().nullable().optional(),
  word_type: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  ease_factor: z.number().nullable().optional(),
  interval: z.number().int().nullable().optional(),
  repetitions: z.number().int().nullable().optional(),
  next_review_date: z.string().nullable().optional(),
  last_reviewed_at: z.string().nullable().optional(),
  state: z.number().int().nullable().optional(),
  reps: z.number().int().nullable().optional(),
  lapses: z.number().int().nullable().optional(),
  due: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});
export type FlashcardRow = z.infer<typeof FlashcardRowSchema>;

export const CreateFlashcardSchema = z.object({
  word: z.string().min(1).max(200),
  reading: z.string().max(200).nullable().optional(),
  hanviet: z.string().max(200).nullable().optional(),
  meaning: z.string().min(1).max(2000),
  example_sentence: z.string().max(2000).nullable().optional(),
  example_translation: z.string().max(2000).nullable().optional(),
  audio_url: z.string().url().max(2000).nullable().optional(),
  image_url: z.string().url().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  jlpt_level: z.string().max(5).nullable().optional(),
  word_type: z.string().max(50).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).nullable().optional(),
});
export type CreateFlashcardDto = z.infer<typeof CreateFlashcardSchema>;

export const UpdateFlashcardSchema = CreateFlashcardSchema.partial().extend({
  ease_factor: z.number().min(1.3).max(5).optional(),
  interval: z.number().int().min(0).optional(),
  repetitions: z.number().int().min(0).optional(),
  next_review_date: z.string().datetime().optional(),
  last_reviewed_at: z.string().datetime().optional(),
  state: z.number().int().min(0).max(4).optional(),
  reps: z.number().int().min(0).optional(),
  lapses: z.number().int().min(0).optional(),
  due: z.string().datetime().optional(),
});
export type UpdateFlashcardDto = z.infer<typeof UpdateFlashcardSchema>;

export const FlashcardListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
  jlpt_level: z.string().max(5).optional(),
  due_before: z.string().datetime().optional(),
});
export type FlashcardListQueryDto = z.infer<typeof FlashcardListQuerySchema>;

export const CreateFolderSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(20).optional(),
  description: z.string().max(500).nullable().optional(),
  jlpt_level: z.string().max(5).nullable().optional(),
});
export type CreateFolderDto = z.infer<typeof CreateFolderSchema>;

export const UpdateFolderSchema = CreateFolderSchema.partial();
export type UpdateFolderDto = z.infer<typeof UpdateFolderSchema>;

export const AddCardToFolderSchema = z.object({
  flashcard_id: z.string().uuid(),
});
export type AddCardToFolderDto = z.infer<typeof AddCardToFolderSchema>;
