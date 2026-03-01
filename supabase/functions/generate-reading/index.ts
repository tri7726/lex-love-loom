// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert Japanese content creator. 
Generate a reading passage for Japanese learners based on the provided level and topic.
Return the result in the following JSON format:

{
  "title": "string (Japanese)",
  "content": "string (Japanese passage)",
  "vocabulary": [
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

Levels: N5, N4, N3, N2, N1. Use appropriate vocabulary and kanji for the level.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { level = "N5", topic = "daily life" } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    let resultData = null;
    let engineUsed = "none";

    // Helper for Groq
    async function tryGroq(level, topic) {
      if (!GROQ_API_KEY) return null;
      console.log(`Generating ${level} reading about "${topic}" using Groq (Primary)...`);
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `Level: ${level}, Topic: ${topic}` }],
            response_format: { type: "json_object" }
          }),
        });
        if (response.ok) {
          const d = await response.json();
          return JSON.parse(d.choices?.[0]?.message?.content || "{}");
        }
        return null;
      } catch (e) {
        console.error("Groq generation error:", e);
        return null;
      }
    }

    // Helper for Gemini
    async function tryGemini(level, topic) {
      if (!GEMINI_API_KEY) return null;
      console.log(`Generating ${level} reading about "${topic}" using Gemini (Fallback)...`);
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash",
          generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nTarget Level: ${level}\nTopic: ${topic}`);
        return JSON.parse(result.response.text());
      } catch (e) {
        console.error("Gemini generation error:", e);
        return null;
      }
    }

    // Execution
    resultData = await tryGroq(level, topic);
    if (resultData) {
      engineUsed = "groq";
    } else {
      console.log("Groq failed, trying Gemini fallback...");
      resultData = await tryGemini(level, topic);
      if (resultData) engineUsed = "gemini";
    }

    if (!resultData) throw new Error("Reading generation failed");

    return new Response(JSON.stringify({ ...resultData, engine: engineUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
