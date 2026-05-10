import { z } from 'zod';

export const GrammarQuizSchema = z.object({
  jlptLevel: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
  count: z.number().int().min(1).max(20).default(5),
  topic: z.string().max(200).optional(),
});

export type GrammarQuizDto = z.infer<typeof GrammarQuizSchema>;
