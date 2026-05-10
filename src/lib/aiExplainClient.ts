/**
 * Feature-flagged client for the AI Explain endpoint.
 *
 * Routes to either:
 *  - NestJS backend (`POST /ai/explain`, JSON) when `VITE_USE_NESTJS_AI_EXPLAIN === "true"`
 *  - Supabase Edge Function `ai-explain` (existing production path) otherwise.
 *
 * Both paths share the same request/response shape so callers don't care
 * which backend served the request. See ADR 003 (Wave 1).
 */
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/lib/apiClient";

export type AiExplainType =
  | "grammar"
  | "vocab"
  | "kanji"
  | "error"
  | "pattern";

export interface AiExplainInput {
  question: string;
  context?: string;
  explain_type?: AiExplainType;
}

export interface AiExplainResult {
  reasoning_steps: Array<{
    step: number;
    title: string;
    explanation: string;
    example?: string;
  }>;
  conclusion: string;
  difficulty: string;
  related_patterns: string[];
  mnemonics?: string;
  common_mistakes?: string;
  model_used?: string;
}

const useNestJs =
  ((import.meta as { env?: Record<string, string> }).env
    ?.VITE_USE_NESTJS_AI_EXPLAIN ?? "false") === "true";

/** Non-streaming explain (returns full structured result). */
export async function explain(input: AiExplainInput): Promise<AiExplainResult> {
  if (useNestJs) {
    // NestJS path — non-stream JSON (same shape as Edge).
    return await apiFetch<AiExplainResult>("/ai/explain", {
      method: "POST",
      body: JSON.stringify({
        question: input.question,
        context: input.context,
        explain_type: input.explain_type ?? "grammar",
      }),
    });
  }

  // Legacy Edge Function path
  const { data, error } = await supabase.functions.invoke("ai-explain", {
    body: input,
  });
  if (error) throw error;
  return data as AiExplainResult;
}

/** Returns which backend is currently active (for debug UI / telemetry). */
export const aiExplainBackend = useNestJs ? "nestjs" : "edge";
