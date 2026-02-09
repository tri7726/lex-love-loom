// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, content } = await req.json();
    
    // Get Gemini API key
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Construct analysis prompt
    const fullPrompt = prompt 
      ? `${ENHANCED_SYSTEM_PROMPT}\n\nAnalyze this Japanese text and answer the question.\n\nText: ${content}\n\nQuestion: ${prompt}`
      : `${ENHANCED_SYSTEM_PROMPT}\n\nAnalyze this Japanese text in detail:\n\n${content}`;

    console.log("Sending request to Gemini API...");
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

    // Try to parse as JSON
    let parsedResponse: AnalysisResponse | null = null;
    let isStructured = false;

    try {
      // Clean up response (remove markdown code blocks if present)
      const cleanedText = resultText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsedResponse = JSON.parse(cleanedText);
      isStructured = true;
      console.log("Successfully parsed structured JSON response");
    } catch (parseError) {
      console.warn("Failed to parse JSON, returning as markdown text:", parseError);
      // Fallback to text response
      isStructured = false;
    }

    // Return structured or text response
    if (isStructured && parsedResponse) {
      return new Response(
        JSON.stringify({ 
          format: 'structured',
          analysis: parsedResponse 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // Fallback to markdown text response (backward compatible)
      return new Response(
        JSON.stringify({ 
          format: 'text',
          response: resultText 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
