// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a Japanese dictionary and language expert. 
Provide a detailed breakdown of the following Japanese word in JSON format.
Include: reading (hiragana), Hán Việt (if applicable), and clear Vietnamese meanings.
If the word is complex, break down its components.

{
  "word": "string",
  "reading": "string (hiragana)",
  "hanviet": "string",
  "meanings": ["string"],
  "parts": [
    {
      "component": "string",
      "reading": "string",
      "meaning": "string"
    }
  ],
  "jlpt_level": "N5-N1 or null",
  "common": boolean
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { word } = await req.json();
    if (!word) throw new Error("Word is required");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    let resultData = null;
    let engineUsed = "none";

    // Helper for Groq
    async function tryGroq(word) {
      if (!GROQ_API_KEY) return null;
      console.log(`Looking up word "${word}" using Groq (Primary)...`);
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: word }],
            response_format: { type: "json_object" }
          }),
        });
        if (response.ok) {
          const d = await response.json();
          return JSON.parse(d.choices?.[0]?.message?.content || "{}");
        }
        return null;
      } catch (e) {
        console.error("Groq lookup error:", e);
        return null;
      }
    }

    // Helper for Gemini
    async function tryGemini(word) {
      if (!GEMINI_API_KEY) return null;
      console.log(`Looking up word "${word}" using Gemini (Fallback)...`);
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash",
          generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nWord to look up: ${word}`);
        return JSON.parse(result.response.text());
      } catch (e) {
        console.error("Gemini lookup error:", e);
        return null;
      }
    }

    // Execution
    resultData = await tryGroq(word);
    if (resultData) {
      engineUsed = "groq";
    } else {
      console.log("Groq failed, trying Gemini fallback...");
      resultData = await tryGemini(word);
      if (resultData) engineUsed = "gemini";
    }

    if (!resultData) throw new Error("Word lookup failed");

    return new Response(JSON.stringify({ ...resultData, engine: engineUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Lookup error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
