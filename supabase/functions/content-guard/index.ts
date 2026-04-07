// @ts-nocheck: suppressing standard TS errors in Deno edge function
// Supabase Edge Function: Content Guard
// Uses Llama Guard 3 (meta-llama/llama-guard-4-12b) to screen messages
// Returns { safe: boolean, category?: string }
// @ts-ignore Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// content-guard: Uses Llama Guard 4 to detect unsafe content
// Fails open (safe=true) on any error — never blocks legitimate learners


serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, context = "Japanese language learning app for students" } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ safe: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip very short messages — definitely safe
    if (text.trim().length < 10) {
      return new Response(JSON.stringify({ safe: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3"),
      Deno.env.get("GROQ_API_KEY"),
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      // No keys: fail open (allow) to not block users
      console.warn("ContentGuard: No API keys — skipping moderation");
      return new Response(JSON.stringify({ safe: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
                content: `Context: ${context}\n\nMessage to screen:\n"""\n${text.slice(0, 800)}\n"""`,
              },
            ],
            max_tokens: 50,
            temperature: 0,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`ContentGuard: key failed (${res.status}): ${errText.slice(0, 100)}`);
          continue;
        }

        const data = await res.json() as Record<string, unknown>;
        const choices = (data.choices as Array<Record<string, unknown>>) ?? [];
        const decision = (choices[0]?.message as Record<string, unknown>)?.content as string ?? "";

        // Llama Guard returns "safe" or "unsafe\n<category>"
        const isSafe = decision.trim().toLowerCase().startsWith("safe");
        const categoryLine = decision.trim().split("\n")[1] ?? "";

        console.log(`ContentGuard result: "${decision.trim().slice(0, 60)}" → safe=${isSafe}`);

        return new Response(
          JSON.stringify({
            safe: isSafe,
            category: isSafe ? null : categoryLine || "flagged",
            model: "llama-guard-4-12b",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("ContentGuard fetch error:", e);
      }
    }

    // All keys failed: fail open
    return new Response(JSON.stringify({ safe: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("ContentGuard critical error:", error);
    // Fail open — never block users due to our own error
    return new Response(JSON.stringify({ safe: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
