// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ==========================================
// TypeScript Interfaces for Response Schema
// ==========================================

interface WordBreakdown {
  word: string;
  reading: string;
  hanviet?: string;
  meaning: string;
  word_type: string;
  jlpt_level?: string;
}

interface GrammarPattern {
  pattern: string;
  meaning: string;
  usage: string;
}

interface SentenceAnalysis {
  japanese: string;
  vietnamese: string;
  breakdown: {
    words: WordBreakdown[];
    grammar_patterns: GrammarPattern[];
  };
}

interface SuggestedFlashcard {
  word: string;
  reading: string;
  hanviet?: string;
  meaning: string;
  example_sentence: string;
  example_translation: string;
  jlpt_level?: string;
  word_type?: string;
  notes?: string;
}

interface AnalysisResponse {
  overall_analysis: {
    jlpt_level: string;
    politeness_level: string;
    text_type: string;
    summary: string;
  };
  sentences: SentenceAnalysis[];
  suggested_flashcards: SuggestedFlashcard[];
  grammar_summary: {
    particles_used: string[];
    verb_forms: string[];
    key_patterns: string[];
  };
  cultural_notes: string[];
}

interface GrammarResponse {
  isCorrect: boolean;
  corrected: string;
  explanation: string;
  rules: string[];
  suggestions: string[];
}

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

// ==========================================
// Enhanced System Prompt for Structured Analysis
// ==========================================

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

// ==========================================
// Edge Function Handler
// ==========================================

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, content, image, isImageAnalysis, isGrammar } = await req.json();
    
    // 0. Grammar Check Mode (New)
    if (isGrammar) {
      const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      
      console.log("Grammar check requested via analysis function...");
      
      const useGemini = !!GEMINI_API_KEY && (content?.length > 100 || req.headers.get("x-ai-engine") === "gemini");
      let resultText = "";
      
      if (useGemini) {
        const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: GRAMMAR_SYSTEM_PROMPT }, { text: content }] }],
            generationConfig: { response_mime_type: "application/json" }
          }),
        });
        if (geminiResp.ok) {
          const d = await geminiResp.json();
          resultText = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      }
      
      if (!resultText && GROQ_API_KEY) {
        const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: GRAMMAR_SYSTEM_PROMPT }, { role: "user", content: content }],
            response_format: { type: "json_object" }
          }),
        });
        if (groqResp.ok) {
          const d = await groqResp.json();
          resultText = d.choices?.[0]?.message?.content || "";
        }
      }

      const cleaned = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const raw = JSON.parse(cleaned || "{}");
      
      // Map to the format GrammarCheckInput expects
      return new Response(JSON.stringify({
        isCorrect: raw.isCorrect ?? true,
        corrected: raw.corrected || content,
        explanation: raw.explanation || "",
        rules: raw.rules || [],
        suggestions: raw.suggestions || []
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Image Analysis Logic... (unchanged)
    if (isImageAnalysis && image) {
      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      console.log("Sending request to Gemini Vision API...");
      
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: VISION_SYSTEM_PROMPT },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: image // base64 string
                  }
                }
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
      const result = JSON.parse(geminiData.candidates[0].content.parts[0].text);

      return new Response(JSON.stringify({ format: 'vision', result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: Text analysis
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    // Smart Routing Logic
    const complexKeywords = [
      "why", "explain", "culture", "difference", "honne", "tatemae", "nuance", "history", "social", "context", 
      "tại sao", "giải thích", "văn hóa", "khác biệt", "sắc thái", "lịch sử", "phân tích", "analysis", "breakdown", "giải mã"
    ];
    const isComplex = (prompt || "").toLowerCase().split(" ").some(word => complexKeywords.includes(word)) || (content || "").length > 500;
    
    // Explicit override or smart check
    const useGemini = req.headers.get("x-ai-engine") === "gemini" || isComplex;

    console.log(`Routing to ${useGemini ? 'Gemini' : 'Groq'}... (Complex: ${isComplex})`);

    if (useGemini && GEMINI_API_KEY) {
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: ENHANCED_SYSTEM_PROMPT },
              { text: prompt 
                ? `Analyze this Japanese text and answer the question.\n\nText: ${content}\n\nQuestion: ${prompt}`
                : `Analyze this Japanese text in detail:\n\n${content}` 
              }
            ]
          }],
          generationConfig: { response_mime_type: "application/json" }
        }),
      });

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const rawText = geminiData.candidates[0].content.parts[0].text;
        const cleanedText = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const result = JSON.parse(cleanedText);
        return new Response(JSON.stringify({ format: 'structured', analysis: result, engine: 'gemini' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Gemini fallback failed, trying Groq...");
    }

    // Groq execution (Fallback or default)
    const analysisMessages = [
      { role: "user", content: ENHANCED_SYSTEM_PROMPT },
      { 
        role: "user", 
        content: prompt 
          ? `Analyze this Japanese text and answer the question.\n\nText: ${content}\n\nQuestion: ${prompt}`
          : `Analyze this Japanese text in detail:\n\n${content}`
      }
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: analysisMessages,
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "No response generated.";

    let parsedResponse = null;
    let isStructured = false;

    try {
      const cleanedText = resultText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsedResponse = JSON.parse(cleanedText);
      isStructured = true;
    } catch (parseError) {
      console.warn("Failed to parse JSON, returning as markdown text:", parseError);
      isStructured = false;
    }

    if (isStructured && parsedResponse) {
      return new Response(JSON.stringify({ format: 'structured', analysis: parsedResponse, engine: 'groq' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ format: 'text', response: resultText, engine: 'groq' }), {
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


