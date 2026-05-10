/**
 * NestJS DTO for POST /ai/explain.
 * Shape mirrors the legacy Edge Function `ai-explain` so frontend can swap
 * backends transparently via VITE_USE_NESTJS_AI_EXPLAIN.
 *
 * Source-of-truth lives in `packages/types`; we mirror it here to keep the
 * backend buildable standalone (Turborepo will swap to the workspace import
 * when monorepo install is wired up — see packages/README.md).
 */
import { z } from 'zod';

export const ExplainTypeSchema = z.enum([
  'grammar',
  'vocab',
  'kanji',
  'error',
  'pattern',
]);

export const ExplainSchema = z.object({
  question: z.string().min(1).max(2000),
  context: z.string().max(4000).optional(),
  explain_type: ExplainTypeSchema.optional().default('grammar'),
});

export type ExplainDto = z.infer<typeof ExplainSchema>;

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
