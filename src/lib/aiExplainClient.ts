/**
 * Feature-flagged client for the AI Explain endpoint.
 *
 * Routes to either:
 *  - NestJS backend (`POST /ai/explain`, SSE) when `VITE_USE_NESTJS_AI_EXPLAIN === "true"`
 *  - Supabase Edge Function `ai-explain` (existing production path) otherwise.
 *
 * This is the showcase wiring for ADR 003 Wave 1 — same input/output shape,
 * runtime-switchable so we can flip 1 endpoint at a time without redeploying.
 */
import { supabase } from "@/integrations/supabase/client";
import { streamSSE } from "@/lib/apiClient";

export interface AiExplainInput {
  question: string;
  context?: string;
  explain_type?: "grammar" | "vocab" | "kanji";
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

/** Non-streaming explain (returns full result). */
export async function explain(input: AiExplainInput): Promise<AiExplainResult> {
  if (useNestJs) {
    // NestJS path: collect SSE deltas, then parse final JSON.
    let full = "";
    await streamSSE(
      "/ai/explain",
      {
        prompt: input.question,
        context: input.context,
        // map UI explain_type → DTO `level` if needed in future
      },
      (chunk) => {
        full += chunk;
      },
    );
    try {
      return JSON.parse(full) as AiExplainResult;
    } catch {
      throw new Error("NestJS /ai/explain returned non-JSON payload");
    }
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
