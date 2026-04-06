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
