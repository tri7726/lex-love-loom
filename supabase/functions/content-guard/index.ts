// @ts-nocheck: suppressing standard TS errors in Deno edge function
// Supabase Edge Function: Content Guard v2
// Uses Llama Guard 4 to screen messages for unsafe content.
// Fails open (safe=true) on any error — never blocks legitimate learners.
// @ts-ignore Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── In-memory cache: hash → result (cleared when function restarts) ────────
// Prevents redundant API calls for the same text within a session.
const resultCache = new Map<string, { safe: boolean; category: string | null }>();
const MAX_CACHE_SIZE = 200;

// ── Simple hash for cache key ─────────────────────────────────────────────
async function hashText(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text.slice(0, 500).toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Sanitize input: remove control chars, limit length ───────────────────
function sanitizeInput(text: string): string {
  return text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // Remove control characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .slice(0, 1000); // Hard limit
}

// ── Quick pre-filter: obviously safe short educational content ────────────
const OBVIOUSLY_SAFE_PATTERNS = [
  /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\s、。！？・ー]+$/u, // Pure Japanese
  /^[a-zA-Z\s\-']+$/, // Pure English words
  /^[\d\s\-+*/=()]+$/, // Math/numbers only
];

function isObviouslySafe(text: string): boolean {
  const t = text.trim();
  if (t.length < 5) return true;
  return OBVIOUSLY_SAFE_PATTERNS.some(p => p.test(t));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const safeResponse = (extra?: Record<string, unknown>) =>
    new Response(
      JSON.stringify({ safe: true, ...extra }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  try {
    const body = await req.json();
    const { text, context = "Japanese language learning app for students" } = body;

    // ── Input validation ─────────────────────────────────────────────────
    if (!text || typeof text !== "string") {
      return safeResponse({ reason: "no_text" });
    }

    const cleaned = sanitizeInput(text);

    if (cleaned.length < 5) {
      return safeResponse({ reason: "too_short" });
    }

    // ── Quick pre-filter: skip API call for obviously safe content ────────
    if (isObviouslySafe(cleaned)) {
      return safeResponse({ reason: "pre_filter", model: "local" });
    }

    // ── Cache lookup ─────────────────────────────────────────────────────
    const cacheKey = await hashText(cleaned);
    const cached = resultCache.get(cacheKey);
    if (cached) {
      console.log(`ContentGuard: cache hit for key=${cacheKey}, safe=${cached.safe}`);
      return new Response(
        JSON.stringify({ ...cached, source: "cache", model: "llama-guard-4-12b" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── API key resolution ───────────────────────────────────────────────
    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3"),
      Deno.env.get("GROQ_API_KEY"),
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      console.warn("ContentGuard: No API keys configured — failing open");
      return safeResponse({ reason: "no_api_keys" });
    }

    // ── Try each API key ─────────────────────────────────────────────────
    for (const apiKey of apiKeys) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-guard-4-12b",
            messages: [
              {
                role: "user",
                content: `Context: ${context}\n\nMessage to screen:\n"""\n${cleaned.slice(0, 800)}\n"""`,
              },
            ],
            max_tokens: 50,
            temperature: 0,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`ContentGuard: key failed (HTTP ${res.status}): ${errText.slice(0, 120)}`);
          continue; // Try next key
        }

        const data = await res.json() as Record<string, unknown>;
        const choices = (data.choices as Array<Record<string, unknown>>) ?? [];

        if (!choices.length) {
          console.warn("ContentGuard: AI returned empty choices");
          continue;
        }

        const decision = ((choices[0]?.message as Record<string, unknown>)?.content as string ?? "").trim();

        // Llama Guard returns "safe" or "unsafe\n<S1>\nViolation category: ..."
        const isSafe = decision.toLowerCase().startsWith("safe");
        const lines = decision.split("\n").filter(Boolean);
        const categoryLine = lines.length > 1 ? lines[1].trim() : "";

        const result = {
          safe: isSafe,
          category: isSafe ? null : (categoryLine || "flagged"),
        };

        // Store in cache (evict oldest if full)
        if (resultCache.size >= MAX_CACHE_SIZE) {
          const firstKey = resultCache.keys().next().value;
          resultCache.delete(firstKey);
        }
        resultCache.set(cacheKey, result);

        console.log(`ContentGuard: "${decision.slice(0, 60)}" → safe=${isSafe}${isSafe ? "" : `, cat=${categoryLine}`}`);

        return new Response(
          JSON.stringify({ ...result, model: "llama-guard-4-12b" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (fetchErr) {
        console.error("ContentGuard: fetch exception:", fetchErr);
        // Continue to next key
      }
    }

    // ── All keys failed — fail open (never block users due to our error) ─
    console.warn("ContentGuard: all keys exhausted — failing open");
    return safeResponse({ reason: "all_keys_failed" });

  } catch (error) {
    console.error("ContentGuard: critical error:", error);
    // Fail open — never block users due to our own error
    return safeResponse({ reason: "internal_error" });
  }
});
