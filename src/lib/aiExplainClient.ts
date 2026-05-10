/**
 * Feature-flagged client for the AI Explain endpoint.
 *
 * Routes to either:
 *  - NestJS backend (`POST /ai/explain` + `/ai/explain/stream`) when `VITE_USE_NESTJS_AI_EXPLAIN === "true"`
 *  - Supabase Edge Function `ai-explain` otherwise.
 *
 * Both paths share the same request/response shape. See ADR 003 (Wave 1 + Wave 2).
 */
import { supabase } from "@/integrations/supabase/client";
import { apiFetch, streamSSEEvents } from "@/lib/apiClient";

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

export interface AiExplainStreamEvent {
  type: "token" | "result" | "error" | "done";
  content?: string;
  data?: AiExplainResult;
  message?: string;
}

const useNestJs =
  ((import.meta as { env?: Record<string, string> }).env
    ?.VITE_USE_NESTJS_AI_EXPLAIN ?? "false") === "true";

/** Non-streaming explain (returns full structured result). */
export async function explain(input: AiExplainInput): Promise<AiExplainResult> {
  if (useNestJs) {
    return await apiFetch<AiExplainResult>("/ai/explain", {
      method: "POST",
      body: JSON.stringify({
        question: input.question,
        context: input.context,
        explain_type: input.explain_type ?? "grammar",
      }),
    });
  }

  const { data, error } = await supabase.functions.invoke("ai-explain", {
    body: input,
  });
  if (error) throw error;
  return data as AiExplainResult;
}

/**
 * Streaming explain — emits token-by-token + final structured result.
 * Routes to NestJS `/ai/explain/stream` when feature flag is on, otherwise
 * to Edge Function `ai-explain` with `stream:true`.
 */
export async function explainStream(
  input: AiExplainInput,
  onEvent: (evt: AiExplainStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (useNestJs) {
    await streamSSEEvents<AiExplainStreamEvent>(
      "/ai/explain/stream",
      {
        question: input.question,
        context: input.context,
        explain_type: input.explain_type ?? "grammar",
      },
      onEvent,
      signal,
    );
    return;
  }

  // Edge fallback — invoke with stream flag and parse SSE manually.
  const env =
    (import.meta as { env?: Record<string, string> }).env ?? {};
  const baseUrl = env.VITE_SUPABASE_URL ?? "";
  const publishable = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? publishable;

  const res = await fetch(`${baseUrl}/functions/v1/ai-explain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: publishable,
    },
    body: JSON.stringify({ ...input, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        onEvent(JSON.parse(payload) as AiExplainStreamEvent);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
}

/** Returns which backend is currently active (for debug UI / telemetry). */
export const aiExplainBackend = useNestJs ? "nestjs" : "edge";
