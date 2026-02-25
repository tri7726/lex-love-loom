// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAMMAR_SYSTEM_PROMPT = `あなたは日本語の文法チェッカーです。
ユーザーが入力した日本語の文法をチェックし、以下のJSON形式で返答してください。
修正内容や解説はベトナム語で行ってください。

{
  "isCorrect": boolean,
  "corrected": "string",
  "explanation": "string (in Vietnamese)",
  "rules": ["string (in Japanese)"],
  "suggestions": ["string (in Japanese)"]
}`;

const ENHANCED_SYSTEM_PROMPT = `You are an expert Japanese language analyzer specialized in Vietnamese learners.

Analyze the provided Japanese text and return a detailed JSON response with the following structure:

{
  "overall_analysis": {
    "jlpt_level": "Estimated JLPT level (N5, N4, N3, N2, N1, or 'Mixed' if multiple levels)",
    "politeness_level": "formal/casual/mixed",
    "text_type": "conversation/news/literature/daily/academic",
    "summary": "Brief overall analysis summary in Vietnamese (2-3 sentences)"
  },
  "sentences": [
    {
      "japanese": "Original sentence in Japanese",
      "vietnamese": "Vietnamese translation",
      "breakdown": {
        "words": [
          {
            "word": "Word in kanji/kana",
            "reading": "Hiragana reading",
            "hanviet": "Hán Việt reading (if kanji, otherwise omit)",
            "meaning": "Vietnamese meaning",
            "word_type": "noun/verb/adjective/adverb/particle/conjunction/etc",
            "jlpt_level": "N5/N4/N3/N2/N1 (if known, otherwise omit)"
          }
        ],
        "grammar_patterns": [
          {
            "pattern": "Grammar pattern (e.g., 〜ですね, 〜ている)",
            "meaning": "Explanation in Vietnamese",
            "usage": "Usage context/nuance in Vietnamese"
          }
        ]
      }
    }
  ],
  "suggested_flashcards": [
    {
      "word": "Important word in kanji/kana (select 5-10 most valuable words, NOT particles or extremely common words)",
      "reading": "Hiragana reading",
      "hanviet": "Hán Việt (if applicable)",
      "meaning": "Vietnamese meaning",
      "example_sentence": "Sentence from the original text",
      "example_translation": "Vietnamese translation of example",
      "jlpt_level": "N5/N4/N3/N2/N1",
      "word_type": "noun/verb/adjective/etc",
      "notes": "Additional learning notes (optional)"
    }
  ],
  "grammar_summary": {
    "particles_used": ["List of particles found: は, が, を, に, で, と, etc"],
    "verb_forms": ["List of verb forms: masu-form, te-form, ta-form, nai-form, etc"],
    "key_patterns": ["List of important grammar patterns found"]
  },
  "cultural_notes": [
    "Cultural insights, usage contexts, or important notes in Vietnamese (if applicable)"
  ]
}

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON, no markdown code blocks, no additional text
- All readings must be in hiragana (not romaji)
- All explanations and translations must be in Vietnamese
- For suggested_flashcards: prioritize intermediate/advanced vocabulary (N3-N1) over basic words
- Exclude particles (は, が, を, に, etc) from suggested_flashcards
- Include example sentences from the original text when possible
- Grammar patterns should explain WHY and WHEN to use them, not just WHAT they mean
- Be encouraging and educational in tone`;

const VISION_SYSTEM_PROMPT = `You are an expert Japanese tutor. 
Analyze the image provided and identify the main object or scene.
Return a JSON response with the following structure:
{
  "object_name": "Main object name in Japanese (Kanji/Kana)",
  "reading": "Hiragana reading",
  "vietnamese_meaning": "Meaning in Vietnamese",
  "description": "Brief description of what is in the image in Vietnamese",
  "vocabulary": [
    {
      "word": "Related Japanese word",
      "reading": "Reading",
      "meaning": "Vietnamese meaning"
    }
  ],
  "sample_sentences": [
    {
      "japanese": "A natural sample sentence using the object name",
      "translation": "Vietnamese translation"
    }
  ]
}
Return ONLY valid JSON.`;

async function callLovableAI(apiKey: string, systemPrompt: string, userContent: string, model = "google/gemini-2.5-flash") {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
    }),
  });

  if (response.status === 429) {
    throw new Error("Rate limits exceeded, please try again later.");
  }
  if (response.status === 402) {
    throw new Error("Payment required, please add funds to your Lovable AI workspace.");
  }
  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callLovableAIWithImage(apiKey: string, systemPrompt: string, imageBase64: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Gateway error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, content, image, isImageAnalysis, isGrammar } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // 0. Grammar Check Mode
    if (isGrammar) {
      console.log("Grammar check requested via analysis function...");
      
      const resultText = await callLovableAI(LOVABLE_API_KEY, GRAMMAR_SYSTEM_PROMPT, content);
      const cleaned = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const raw = JSON.parse(cleaned || "{}");
      
      return new Response(JSON.stringify({
        isCorrect: raw.isCorrect ?? true,
        corrected: raw.corrected || content,
        explanation: raw.explanation || "",
        rules: raw.rules || [],
        suggestions: raw.suggestions || []
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Image Analysis
    if (isImageAnalysis && image) {
      console.log("Sending request to Lovable AI Vision...");
      
      const resultText = await callLovableAIWithImage(LOVABLE_API_KEY, VISION_SYSTEM_PROMPT, image);
      const cleaned = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleaned);

      return new Response(JSON.stringify({ format: 'vision', result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Text analysis
    console.log("Routing to Lovable AI for text analysis...");
    
    const userContent = prompt 
      ? `Analyze this Japanese text and answer the question.\n\nText: ${content}\n\nQuestion: ${prompt}`
      : `Analyze this Japanese text in detail:\n\n${content}`;

    const resultText = await callLovableAI(LOVABLE_API_KEY, ENHANCED_SYSTEM_PROMPT, userContent, "google/gemini-2.5-flash");

    let parsedResponse = null;
    let isStructured = false;

    try {
      const cleanedText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleanedText);
      isStructured = true;
    } catch (parseError) {
      console.warn("Failed to parse JSON, returning as markdown text:", parseError);
    }

    if (isStructured && parsedResponse) {
      return new Response(JSON.stringify({ format: 'structured', analysis: parsedResponse, engine: 'lovable-ai' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ format: 'text', response: resultText, engine: 'lovable-ai' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Analysis function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
