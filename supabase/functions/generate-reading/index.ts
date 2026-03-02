import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { level = "N5", topic, content } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    let resultData = null;
    let engineUsed = "none";

    const userPrompt = content 
      ? `Analyze this content for level ${level}: ${content}`
      : `Generate a new ${level} reading about "${topic || 'daily life'}"`;

    // Helper to extract JSON from AI text (handles markdown blocks)
    function extractJSON(text: string) {
      try {
        // Try direct parse first
        return JSON.parse(text.trim());
      } catch (e) {
        // Try extracting from markdown blocks
        const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            return JSON.parse(match[1] || match[0]);
          } catch (e2) {
            console.error("JSON extract fail:", e2);
            throw new Error("AI returned invalid JSON structure");
          }
        }
        throw new Error("Could not find JSON in AI response");
      }
    }

    // Helper for Groq
    async function tryGroq(level: string, prompt: string) {
      if (!GROQ_API_KEY) {
        console.warn("GROQ_API_KEY is not set in secrets!");
        return null;
      }
      console.log(`Processing with Groq: ${prompt.substring(0, 50)}...`);
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
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
        console.error("Groq API error:", response.status, await response.text());
        return null;
      } catch (e) {
        console.error("Groq catch error:", e);
        return null;
      }
    }

    // Helper for Gemini
    async function tryGemini(level: string, prompt: string) {
      if (!GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set in secrets!");
        return null;
      }
      console.log(`Processing with Gemini: ${prompt.substring(0, 50)}...`);
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash",
          generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${prompt}`);
        return extractJSON(result.response.text());
      } catch (e) {
        console.error("Gemini catch error:", e);
        return null;
      }
    }

    // Execution
    resultData = await tryGroq(level, userPrompt);
    if (resultData) {
      engineUsed = "groq";
    } else {
      console.log("Groq failed or key missing, trying Gemini fallback...");
      resultData = await tryGemini(level, userPrompt);
      if (resultData) engineUsed = "gemini";
    }

    if (!resultData) {
      const missingKeys = [];
      if (!GROQ_API_KEY) missingKeys.push("GROQ_API_KEY");
      if (!GEMINI_API_KEY) missingKeys.push("GEMINI_API_KEY");
      throw new Error(`AI processing failed. ${missingKeys.length > 0 ? 'Missing secrets: ' + missingKeys.join(', ') : 'Both engines failed.'}`);
    }

    return new Response(JSON.stringify({ ...resultData, engine: engineUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
