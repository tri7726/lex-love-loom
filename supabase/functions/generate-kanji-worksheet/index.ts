import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { kanji_list } = await req.json();

    if (!kanji_list || !Array.isArray(kanji_list)) {
      throw new Error("Invalid kanji_list provided");
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Fetch Kanji Metadata from Supabase to provide as ground truth to AI
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: kanjiDetails, error: dbError } = await supabase
      .from("kanji")
      .select("character, hanviet, meaning_vi, jlpt_level")
      .in("character", kanji_list);

    if (dbError) throw dbError;

    // Call Gemini to generate AI content
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { 
            parts: [
              { text: WORKSHEET_SYSTEM_PROMPT },
              { text: `Input Kanji Data (Ground Truth): ${JSON.stringify(kanjiDetails)}` }
            ] 
          }
        ],
        generationConfig: {
          response_mime_type: "application/json"
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const resultText = geminiData.candidates[0].content.parts[0].text;
    const result = JSON.parse(resultText);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Worksheet Generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
