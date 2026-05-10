import { z } from 'zod';

export const RagQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  topK: z.number().int().min(1).max(20).default(5),
  sourceTypes: z
    .array(z.enum(['vocabulary', 'kanji', 'grammar', 'lesson', 'conversation']))
    .optional(),
});

export type RagQueryDto = z.infer<typeof RagQuerySchema>;
