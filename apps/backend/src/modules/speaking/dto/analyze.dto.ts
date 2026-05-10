import { z } from 'zod';

export const AnalyzeSpeechSchema = z.object({
  reference: z.string().min(1).max(500),
  transcript: z.string().min(1).max(2000),
  audioUrl: z.string().url().optional(),
});

export type AnalyzeSpeechDto = z.infer<typeof AnalyzeSpeechSchema>;
