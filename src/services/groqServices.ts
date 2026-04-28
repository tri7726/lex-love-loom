/**
 * Groq AI Services — Client-side helpers for the 2 new Edge Functions
 *
 * - useContentGuard: Screen messages before sending to Sensei (Llama Guard 4)
 * - useDeepExplain:  Request step-by-step reasoning (DeepSeek R1)
 */
import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────────────────────────
// Content Guard (Llama Guard 4 — Safety Layer)
// ─────────────────────────────────────────────────────────────────

export interface ContentGuardResult {
  safe: boolean;
  category: string | null;
  model?: string;
}

/**
 * Screen a user message before sending to Sensei.
 * Always fails open (safe = true) on network error.
 */
export async function checkContentSafety(text: string): Promise<ContentGuardResult> {
  try {
    const { data, error } = await supabase.functions.invoke('content-guard', {
      body: { text, context: 'Japanese language learning app for Vietnamese students' },
    });
    if (error || !data) return { safe: true, category: null };
    return data as ContentGuardResult;
  } catch {
    return { safe: true, category: null };
  }
}

// ─────────────────────────────────────────────────────────────────
// Deep Explain (DeepSeek R1 — Reasoning Sensei)
// ─────────────────────────────────────────────────────────────────

export type ExplainType = 'grammar' | 'vocab' | 'error' | 'pattern';

export interface ReasoningStep {
  step: number;
  title: string;
  explanation: string;
  example?: string;
}

export interface DeepExplainResult {
  reasoning_steps: ReasoningStep[];
  conclusion: string;
  difficulty: string;
  related_patterns: string[];
  model_used?: string;
  mnemonics?: string;
  common_mistakes?: string;
}

/**
 * Request a deep, step-by-step reasoning explanation for a grammar point,
 * vocabulary item, or user error.
 *
 * @param question - The grammar point, pattern, or sentence to explain
 * @param context  - Optional additional context (e.g. the student's wrong answer)
 * @param explainType - "grammar" | "vocab" | "error" | "pattern"
 */
export async function deepExplain(
  question: string,
  context?: string,
  explainType: ExplainType = 'grammar'
): Promise<DeepExplainResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-explain', {
      body: {
        question,
        context,
        explain_type: explainType,
      },
    });
    if (error) throw error;
    return data as DeepExplainResult;
  } catch (err) {
    console.error('deepExplain error:', err);
    return null;
  }
}

/**
 * Streaming deep explain — returns real-time tokens via onToken callback,
 * then resolves with the final structured result.
 */
export async function streamExplain(
  question: string,
  context: string | undefined,
  explainType: ExplainType,
  onToken: (token: string) => void,
): Promise<DeepExplainResult | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Use user's session JWT if available so RLS policies apply
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || supabaseKey;

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        question,
        context,
        explain_type: explainType,
        stream: true,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: DeepExplainResult | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);

        try {
          const event = JSON.parse(payload);
          switch (event.type) {
            case 'token':
              onToken(event.content);
              break;
            case 'result':
              result = event.data as DeepExplainResult;
              break;
            case 'error':
              console.error('streamExplain error:', event.message);
              break;
            case 'done':
              break;
          }
        } catch {}
      }
    }

    return result;
  } catch (err) {
    console.error('streamExplain error:', err);
    return null;
  }
}
