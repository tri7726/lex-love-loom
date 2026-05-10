import { z } from 'zod';

export const ExplainSchema = z.object({
  text: z.string().min(1).max(2000),
  context: z.string().max(4000).optional(),
  language: z.enum(['vi', 'en', 'ja']).default('vi'),
  model: z.string().optional(),
});

export type ExplainDto = z.infer<typeof ExplainSchema>;
