// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WORKSHEET_SYSTEM_PROMPT = `You are a Senior Japanese Language Educator and Worksheet Designer.
Your task is to generate high-quality educational content for a Kanji Worksheet based on a provide list of Kanji.

For each Kanji provided, you must generate:
1. "tracing_data": 3 contextually relevant, simple Japanese sentences using the Kanji (at their appropriate JLPT level).
2. "matching_quiz": A set of matching questions where students connect the Kanji to its Hán Việt or Meaning.
3. "context_quiz": "Fill in the blank" sentences where the Kanji is missing.

CRITICAL RULES:
- Return ONLY valid JSON.
- Use Vietnamese for all meanings, Hán Việt, and explanations.
- Avoid common particles in matching quizzes.
- Ensure the difficulty matches the JLPT level of the Kanji.
- For Anti-hallucination: Only use the Kanji characters provided in the input list.

Output JSON Structure:
{
  "kanji_data": [
    {
      "character": "新",
      "hanviet": "NHẤT",
      "meaning": "Mới",
      "examples": [
        { "japanese": "新しい本を買いました。", "vietnamese": "Tôi đã mua một cuốn sách mới." }
      ],
      "quiz": {
        "matching": { "options": ["Mới", "Cũ", "Đỏ"], "correct": "Mới" },
        "fill_blank": { "sentence": "このバッグは[___]しいです。", "answer": "新" }
      }
    }
  ]
}`;

// Helper to extract JSON from AI text
function extractJSON(text: string) {
  try {
    return JSON.parse(text.trim());
  } catch (_e) {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[1] || match[0]);
      } catch (_e2) {
        throw new Error("AI returned invalid JSON structure");
      }
    }
    throw new Error("Could not find JSON in AI response");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { kanji_list } = await req.json();
    if (!kanji_list || !Array.isArray(kanji_list)) throw new Error("Invalid kanji_list");

    const keys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3")
    ].filter(Boolean);

    if (keys.length === 0) throw new Error("Groq API keys are not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: kanjiDetails, error: dbError } = await supabase
      .from("kanji")
      .select("character, hanviet, meaning_vi, jlpt_level")
      .in("character", kanji_list);

    if (dbError) throw dbError;

    // Call Groq with rotation
    let result = null;
    for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i];
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: WORKSHEET_SYSTEM_PROMPT },
                        { role: "user", content: `Input Kanji Data (Ground Truth): ${JSON.stringify(kanjiDetails)}` }
                    ],
                    response_format: { type: "json_object" }
                }),
            });
            if (response.ok) {
                const data = await response.json();
                result = extractJSON(data.choices[0]?.message?.content || "{}");
                break;
            }
            if (response.status === 429) continue;
        } catch (e) {
            console.error(`Kanji Key ${i + 1} error:`, e);
        }
    }

    if (!result) throw new Error("AI worksheet generation failed on all keys");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Worksheet Generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
