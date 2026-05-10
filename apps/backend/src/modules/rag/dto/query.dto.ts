import { z } from 'zod';

/**
 * Mirrors the Edge Function `sensei-rag` request body for the `retrieve` action.
 * Wave 4 ports the read-path (retrieve) only; write-path actions
 * (`index`, `summarize_and_index`, `update_profile`) remain on the Edge for now.
 */
export const RagQuerySchema = z.object({
  user_id: z.string().uuid(),
  query: z.string().min(1).max(1000),
  topK: z.number().int().min(1).max(20).optional().default(5),
});

export type RagQueryDto = z.infer<typeof RagQuerySchema>;
