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

    const keys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3")
    ].filter(Boolean);

    if (keys.length === 0) throw new Error("Groq API keys are not configured");

    let resultData: ReadingResponse | null = null;
    let engineUsed = "groq";

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

    // Helper for Groq Rotation
    async function tryGroqRotation(prompt: string): Promise<ReadingResponse | null> {
      console.log(`Processing with Groq Rotation: ${prompt.substring(0, 50)}...`);
      for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i];
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
              response_format: { type: "json_object" }
            }),
          });
          if (response.ok) {
            const d = await response.json();
            return extractJSON(d.choices?.[0]?.message?.content || "{}");
          }
          if (response.status === 429) continue;
        } catch (e) {
          console.error(`Groq Key ${i + 1} error:`, e);
        }
      }
      return null;
    }

    resultData = await tryGroqRotation(userPrompt);

    if (!resultData) {
      throw new Error(`AI processing failed on all ${keys.length} Groq keys.`);
    }

    return new Response(JSON.stringify({ ...resultData, engine: engineUsed }), {
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
