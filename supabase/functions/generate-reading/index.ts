// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GenerateReadingRequest {
  level?: string;
  topic?: string;
  content?: string;
}

const SYSTEM_PROMPT = `You are an expert Japanese content creator. 
If 'content' is provided, analyze it and return furigana and vocabulary.
If 'topic' is provided, generate a NEW reading passage based on the topic.

Return the result in the following JSON format:

{
  "title": "string (Japanese)",
  "content_with_furigana": "string (Japanese passage with HTML <ruby> tags)",
  "vocabulary_list": [
    {
      "word": "string",
      "reading": "string (hiragana)",
      "meaning": "string (Vietnamese)"
    }
  ],
  "questions": [
    {
      "question": "string (Japanese)",
      "options": ["A", "B", "C", "D"],
      "answer": "correct string",
      "explanation": "string (Vietnamese)"
    }
  ]
}

For vocabulary and grammar, prioritize Vietnamese for meanings and explanations.
Levels: N5, N4, N3, N2, N1. Use appropriate vocabulary and kanji for the level.`;

interface ReadingResponse {
  title: string;
  content_with_furigana: string;
  vocabulary_list: Array<{
    word: string;
    reading: string;
    meaning: string;
  }>;
  questions: Array<{
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { level = "N5", topic, content }: GenerateReadingRequest = await req.json();

    let resultData: ReadingResponse | null = null;

    const userPrompt = content 
      ? `Analyze this content for level ${level}: ${content}`
      : `Generate a new ${level} reading about "${topic || 'daily life'}"`;

    // Helper to extract JSON from AI text
    function extractJSON(text: string): ReadingResponse {
      try {
        return JSON.parse(text.trim());
      } catch (e) {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            return JSON.parse(match[1] || match[0]);
          } catch (e2) {
            throw new Error("AI returned invalid JSON structure");
          }
        }
        throw new Error("Could not find JSON in AI response");
      }
    }

    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3"),
      Deno.env.get("GROQ_API_KEY_1")
    ].filter(Boolean);

    if (apiKeys.length === 0) {
      throw new Error("No Groq API keys are configured.");
    }

    console.log(`Generating reading for level ${level} using key rotation (${apiKeys.length} keys total)...`);

    for (const apiKey of apiKeys) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.7
          }),
        });

        if (response.ok) {
          const data = await response.json();
          resultData = extractJSON(data.choices[0]?.message?.content || "{}");
          break; // Key worked, exit loop
        } else {
          const errorText = await response.text();
          console.warn(`Groq API error with current key: ${response.status} ${errorText}. Trying next key...`);
        }
      } catch (e) {
        console.error("Groq Key error in generate-reading:", e);
      }
    }

    if (!resultData) throw new Error("AI reading generation failed.");

    return new Response(JSON.stringify({ ...resultData, engine: "groq" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
