// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LookupRequest {
  word: string;
  context?: string;
}

const SYSTEM_PROMPT = `You are an expert Japanese-Vietnamese dictionary. 
Provide a detailed breakdown of the Japanese word provided, including:
- Hanviet (if applicable)
- Meaning in Vietnamese
- Reading (Hiragana)
- Word type (Noun, Verb, etc.)
- JLPT level
- 3 example sentences in Japanese with Vietnamese translations.

Return the result in the following JSON format:
{
  "word": "string",
  "reading": "string",
  "hanviet": "string",
  "meaning": "string",
  "word_type": "string",
  "jlpt_level": "string",
  "examples": [
    { "japanese": "string", "vietnamese": "string" }
  ]
}`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { word, context }: LookupRequest = await req.json();

    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3")
    ].filter(Boolean);

    if (apiKeys.length === 0) {
      throw new Error("No Groq API keys are configured.");
    }

    console.log(`Lookup request for "${word}" using key rotation (${apiKeys.length} keys total)...`);

    let resultData = null;
    let engineUsed = "groq";
    
    for (const apiKey of apiKeys) {
      try {
        const userPrompt = context 
          ? `Look up word: "${word}" in context: "${context}"`
          : `Look up word: "${word}"`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
                response_format: { type: "json_object" },
                temperature: 0.3
            }),
        });
        if (response.ok) {
            const data = await response.json();
            resultData = JSON.parse(data.choices[0]?.message?.content || "{}");
            break; // Key worked, exit loop
        } else {
            const errorText = await response.text();
            console.warn(`Groq API error on Key: ${response.status} ${errorText}. Trying next key...`);
        }
      } catch (e) {
          console.error("Groq Key error in lookup-word:", e);
      }
    }

    if (!resultData) throw new Error("AI lookup failed on all keys");

    return new Response(JSON.stringify({ ...resultData, engine: engineUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Lookup error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
