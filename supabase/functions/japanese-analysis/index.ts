// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AnalysisRequest {
  prompt?: string;
  content: string;
  image?: string;
  isImageAnalysis?: boolean;
  isGrammar?: boolean;
  engine?: "gemini" | "groq";
  saveToHistory?: boolean;
}

const GRAMMAR_SYSTEM_PROMPT = `あなたは日本語の文法チェッカーです。
ユーザーが入力した日本語の文法をチェックし、以下のJSON形式で返答してください。
修正 nội dung hay giải thích bằng tiếng Việt.

{
  "isCorrect": boolean,
  "corrected": "string",
  "explanation": "string (bằng tiếng Việt)",
  "rules": ["string (bằng tiếng Nhật)"],
  "suggestions": ["string (bằng tiếng Nhật)"]
}`;

const ENHANCED_SYSTEM_PROMPT = `You are an expert Japanese language analyzer specialized in Vietnamese learners.

Analyze the provided Japanese text and return a detailed JSON response with the following structure:

{
  "overall_analysis": {
    "jlpt_level": "Estimated JLPT level (N5, N4, N3, N2, N1, or 'Mixed')",
    "politeness_level": "formal/casual/mixed",
    "text_type": "conversation/news/literature/daily/academic",
    "summary": "Brief overall analysis summary in Vietnamese (2-3 sentences)"
  },
  "sentences": [
    {
      "japanese": "Original sentence",
      "vietnamese": "Vietnamese translation",
      "breakdown": {
        "words": [
          {
            "word": "Word",
            "reading": "Reading",
            "hanviet": "Hán Việt",
            "meaning": "Meaning",
            "word_type": "type",
            "jlpt_level": "N5-N1"
          }
        ],
        "grammar_patterns": [
          {
            "pattern": "Pattern",
            "meaning": "Meaning (VN)",
            "usage": "Usage (VN)"
          }
        ]
      }
    }
  ],
  "suggested_flashcards": [
    {
      "word": "Word",
      "reading": "Reading",
      "hanviet": "Hán Việt",
      "meaning": "Meaning",
      "example_sentence": "Example",
      "example_translation": "Translation",
      "jlpt_level": "N5-N1",
      "word_type": "type"
    }
  ],
  "grammar_summary": {
    "particles_used": ["List"],
    "verb_forms": ["List"],
    "key_patterns": ["List"]
  },
  "cultural_notes": ["Notes in VN"]
}

CRITICAL: Return ONLY valid JSON. Readings in hiragana. Vietnamese for explanations.`;

const VISION_SYSTEM_PROMPT = `You are an expert Japanese tutor. 
Analyze the image provided and identify objects. Return JSON:
{
  "object_name": "In Japanese",
  "reading": "Hiragana",
  "vietnamese_meaning": "VN",
  "description": "VN description",
  "vocabulary": [{"word": "JP", "reading": "kana", "meaning": "VN"}],
  "sample_sentences": [{"japanese": "JP", "translation": "VN"}]
}`;

interface StructuredAnalysis {
  overall_analysis: {
    jlpt_level: string;
    politeness_level: string;
    text_type: string;
    summary: string;
  };
  sentences: Array<{
    japanese: string;
    vietnamese: string;
    breakdown: {
      words: Array<{
        word: string;
        reading: string;
        hanviet: string | null;
        meaning: string;
        word_type: string;
        jlpt_level: string;
      }>;
      grammar_patterns: Array<{
        pattern: string;
        meaning: string;
        usage: string;
      }>;
    };
  }>;
  suggested_flashcards: Array<{
    word: string;
    reading: string;
    hanviet: string | null;
    meaning: string;
    example_sentence: string;
    example_translation: string;
    jlpt_level: string;
    word_type: string;
  }>;
  grammar_summary: {
    particles_used: string[];
    verb_forms: string[];
    key_patterns: string[];
  };
  cultural_notes: string[];
}

interface GrammarAnalysis {
  isCorrect: boolean;
  corrected: string;
  explanation: string;
  rules: string[];
  suggestions: string[];
}

interface VisionAnalysis {
  object_name: string;
  reading: string;
  vietnamese_meaning: string;
  description: string;
  vocabulary: Array<{ word: string; reading: string; meaning: string }>;
  sample_sentences: Array<{ japanese: string; translation: string }>;
}

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, content, image, isImageAnalysis, isGrammar, saveToHistory = true }: AnalysisRequest = await req.json();
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && authUser) {
          userId = authUser.id;
        }
      } catch (e: unknown) {
        console.error("Auth Exception:", e);
      }
    }

    const keys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3")
    ].filter(Boolean);

    if (keys.length === 0) {
      throw new Error("No Groq API keys configured.");
    }

    let resultData: 
      | { format: 'grammar'; result: GrammarAnalysis } 
      | { format: 'structured'; analysis: StructuredAnalysis } 
      | { format: 'vision'; result: VisionAnalysis } 
      | null = null;
    let engineUsed = "groq";

    // Helper for Groq Rotation
    async function tryGroqRotation(payload: any) {
      for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i];
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (response.ok) {
            const d = await response.json();
            return d.choices?.[0]?.message?.content || "{}";
          }
          if (response.status === 429) continue;
        } catch (e) {
          console.error(`Groq Key ${i + 1} error:`, e);
        }
      }
      return null;
    }

    // 0. Image Analysis (using llama-3.2-11b-vision-preview)
    if (isImageAnalysis && image) {
      console.log("Image analysis using Groq Vision...");
      const raw = await tryGroqRotation({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze the Japanese content in this image." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });
      if (raw) {
        resultData = { format: 'vision', result: extractJSON(raw) as VisionAnalysis };
      }
    } 
    // 1. Text Analysis or Grammar
    else {
      const systemPrompt = isGrammar ? GRAMMAR_SYSTEM_PROMPT : ENHANCED_SYSTEM_PROMPT;
      const userContent = prompt 
        ? `Analyze this: ${content}\n\nQuestion: ${prompt}`
        : content;
      
      const raw = await tryGroqRotation({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
        response_format: { type: "json_object" }
      });

      if (raw) {
        const parsed = extractJSON(raw);
        resultData = isGrammar 
          ? { format: 'grammar', result: parsed as GrammarAnalysis }
          : { format: 'structured', analysis: parsed as StructuredAnalysis };
      }
    }

    if (!resultData) throw new Error("AI analysis failed on all Groq keys");

    // 2. Save to history if requested
    if (saveToHistory && userId && !isImageAnalysis && resultData) {
      let historyAnalysis: unknown = null;
      if (resultData.format === 'grammar') {
        historyAnalysis = resultData.result;
      } else if (resultData.format === 'structured') {
        historyAnalysis = resultData.analysis;
      }

      if (historyAnalysis) {
        await supabase.from('analysis_history').insert({
          user_id: userId,
          content: content,
          analysis: historyAnalysis,
          engine: engineUsed
        });
      }
    }

    return new Response(JSON.stringify({ ...resultData, engine: engineUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Analysis error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


