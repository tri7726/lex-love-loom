// Japanese Analysis Edge Function
// @ts-ignore Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AnalysisRequest {
  task?: string;
  prompt?: string;
  content: string;
  image?: string;
  isImageAnalysis?: boolean;
  isGrammar?: boolean;
  engine?: "gemini" | "groq";
  saveToHistory?: boolean;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

const GRAMMAR_SYSTEM_PROMPT = `Bạn là một giáo viên tiếng Nhật (Sensei) chuyên môn cao, chuyên hỗ trợ người học tiếng Việt.
Nhiệm vụ của bạn là kiểm tra, sửa lỗi ngữ pháp hoặc dịch câu nhập vào sang TIẾNG NHẬT TỰ NHIÊN NHẤT (Natural Japanese).

QUY TẮC QUAN TRỌNG:
1. Nếu văn bản nhập vào bằng Tiếng Anh hoặc Tiếng Việt, hãy DỊCH nó sang một câu tiếng Nhật thật tự nhiên và đúng ngữ cảnh, đừng báo lỗi.
2. Nếu văn bản nhập vào là tiếng Nhật có lỗi, hãy sửa nó thành câu tiếng Nhật chuẩn, tự nhiên nhất. Không dịch word-by-word một cách cứng nhắc.
3. Cùng một ý nghĩa nhưng nếu có cách nói tự nhiên hơn của người bản xứ (Native style), hãy đề xuất nó trong "suggestions".
4. Toàn bộ phần "explanation" (giải thích) PHẢI được viết bằng tiếng Việt, giọng điệu ân cần, khích lệ như một giáo viên (Ví dụ: "Em chú ý nhé...", "Câu này của em ý rất tốt nhưng...").

Trả về ĐÚNG định dạng JSON sau:
{
  "isCorrect": boolean (true nếu câu tiếng Nhật đã hoàn hảo, false nếu có lỗi hoặc là văn bản tiếng Anh/Việt cần dịch),
  "corrected": "Câu tiếng Nhật đúng, tự nhiên nhất. (BẮT BUỘC có nếu isCorrect là false)",
  "explanation": "Giải thích chi tiết lỗi sai hoặc lý do chọn cách dịch này (bằng tiếng Việt).",
  "rules": ["Kiến thức/Cấu trúc ngữ pháp liên quan (bằng tiếng Nhật/Việt)"],
  "suggestions": ["Cách nói tự nhiên hơn, giống người bản xứ hơn (bằng tiếng Nhật)"]
}`;

const ENHANCED_SYSTEM_PROMPT = `You are an expert Japanese language analyzer specialized in Vietnamese learners.

Analyze the provided Japanese text and return a comprehensive, detailed JSON response. 
IMPORTANT: Your analysis should be thorough. Do not summarize too much. 

Structure your JSON as follows:

{
  "overall_analysis": {
    "jlpt_level": "Estimated JLPT level (N5-N1)",
    "politeness_level": "formal/casual/mixed",
    "text_type": "conversation/news/daily/etc",
    "summary": "Detailed summary and analysis of the main ideas, answering any specific user questions. Write 1-2 detailed paragraphs (Vietnamese)."
  },
  "sentences": [
    {
      "japanese": "Original sentence",
      "vietnamese": "Natural, high-quality translation",
      "breakdown": {
        "words": [
          {
            "word": "Word",
            "reading": "Reading (kana)",
            "hanviet": "Hán Việt (if applicable)",
            "meaning": "Meaning (VN)",
            "word_type": "type (noun/verb/etc)",
            "jlpt_level": "N5-N1"
          }
        ],
        "grammar_patterns": [
          {
            "pattern": "Pattern",
            "meaning": "Meaning (VN)",
            "usage": "In-depth explanation of how it's used in this specific sentence (VN)"
          }
        ]
      }
    }
  ],
  "suggested_flashcards": [
    {
      "word": "Key term",
      "reading": "Reading",
      "hanviet": "Hán Việt",
      "meaning": "Meaning",
      "example_sentence": "Sentence",
      "example_translation": "Translation",
      "jlpt_level": "Level",
      "word_type": "Type"
    }
  ],
  "grammar_summary": {
    "particles_used": ["List major particles (as strings ONLY)"],
    "verb_forms": ["Analyze verb conjugations (as strings ONLY)"],
    "key_patterns": ["List key structures (as strings ONLY)"]
  },
  "cultural_notes": ["Relevant cultural or contextual nuances explained in Vietnamese"]
}

CRITICAL RULES:
1. Analyse multiple key sentences (at least 3-5) if the text is long.
2. Provide a rich vocabulary list with accurate Hán Việt.
3. All explanations and summaries MUST be in Vietnamese.
4. Be as detailed as possible to help the student understand every aspect of the text.
5. Return ONLY valid JSON.`;

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

// @ts-expect-error Deno serve type
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { 
      task, 
      prompt, 
      content, 
      image, 
      isImageAnalysis, 
      isGrammar, 
      saveToHistory = true, 
      history = [] 
    }: AnalysisRequest = await req.json();
    
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

    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3"),
      Deno.env.get("GROQ_API_KEY_1")
    ].filter(Boolean);

    if (apiKeys.length === 0) throw new Error("No Groq API keys are configured.");

    // Helper to call Groq with rotation
    async function fetchGroqWithRotation(model: string, system: string, user: string | any[], json = true, history: Array<{ role: string; content: string }> = []) {
      let lastError = null;
      for (const apiKey of apiKeys) {
        try {
          const messages = [{ role: "system", content: system }];
          if (history && history.length > 0) {
            history.forEach(m => messages.push({ role: m.role, content: m.content }));
          }
          messages.push({ role: "user", content: Array.isArray(user) ? user as any : user });

          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              messages,
              response_format: json ? { type: "json_object" } : undefined,
              temperature: 0.7
            }),
          });
          if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content || "";
          } else {
            const err = await response.text();
            lastError = new Error(`Groq API error: ${response.status} ${err}`);
            console.warn(`Key failed, trying next... ${lastError.message}`);
          }
        } catch (e) {
          lastError = e;
          console.error("Fetch error, trying next key...", e);
        }
      }
      throw lastError || new Error("All Groq keys failed");
    }

    let resultData: { format: string; result?: GrammarAnalysis | VisionAnalysis; analysis?: StructuredAnalysis; text?: string; engine: string } | null = null;

    if (task === 'chat') {
      console.log("Handling Chat Task using Groq...");
      const systemPrompt = prompt || "You are a helpful Japanese Sensei.";
      const rawChat = await fetchGroqWithRotation("llama-3.3-70b-versatile", systemPrompt, content, false, history);
      resultData = { format: 'chat', text: rawChat, engine: "groq" };
    } else if (isImageAnalysis && image) {
      console.log("Analyzing image using Groq Vision (Key 2)...");
      const userContent = [
        { type: "text", text: "Analyze the Japanese content in this image and return JSON." },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
      ];
      const rawVision = await fetchGroqWithRotation("llama-3.2-11b-vision-preview", VISION_SYSTEM_PROMPT, userContent);
      resultData = { format: 'vision', result: extractJSON(rawVision) as VisionAnalysis, engine: "groq" };
    } else {
      const typeLabel = (isGrammar || task === 'grammar') ? "grammar" : "text";
      console.log(`Analyzing ${typeLabel} using Groq (Key 2)...`);
      const systemPrompt = (isGrammar || task === 'grammar') ? GRAMMAR_SYSTEM_PROMPT : ENHANCED_SYSTEM_PROMPT;
      let userContent = `Text to analyze:\n"""\n${content}\n"""`;
      if (prompt) {
        userContent += `\n\nUser Instruction/Context:\n"""\n${prompt}\n"""`;
      }
      const raw = await fetchGroqWithRotation("llama-3.3-70b-versatile", systemPrompt, userContent, true);
      const parsed = extractJSON(raw);
      resultData = (isGrammar || task === 'grammar') 
        ? { format: 'grammar', result: parsed as GrammarAnalysis, engine: "groq" }
        : { format: 'structured', analysis: parsed as StructuredAnalysis, engine: "groq" };
    }



    if (!resultData) throw new Error("AI analysis failed.");

    // Save to history if requested
    if (saveToHistory && userId && !isImageAnalysis) {
      const historyAnalysis = (resultData.format === 'grammar') ? resultData.result : resultData.analysis;
      if (historyAnalysis) {
        await supabase.from('analysis_history').insert({
          user_id: userId,
          content: content,
          analysis: historyAnalysis,
          engine: "groq"
        });
      }
    }

    return new Response(JSON.stringify({ ...resultData, engine: "groq" }), {
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


