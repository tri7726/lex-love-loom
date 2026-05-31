// @ts-nocheck: suppressing standard TS errors in Deno edge function
// Japanese Analysis Edge Function
// @ts-ignore Deno imports
import { serve } from "std/http/server.ts";
// @ts-ignore Deno imports
import { createClient } from "@supabase/supabase-js";
// @ts-ignore Deno npm specifier
import { z } from "npm:zod@3.23.8";
import { checkRateLimit } from "../_shared/rate-limit.ts";

// ── Zod schemas (lenient: missing arrays default to [], unknown keys passthrough) ──
const StructuredAnalysisSchema = z.object({
  overall_analysis: z.object({
    jlpt_level: z.string().default('N?'),
    politeness_level: z.string().default(''),
    register: z.string().optional(),
    dialect: z.string().optional(),
    text_type: z.string().default(''),
    summary: z.string().default(''),
  }).passthrough().default({} as any),
  sentences: z.array(z.object({
    japanese: z.string().default(''),
    vietnamese: z.string().default(''),
    structure: z.any().optional(),
    breakdown: z.object({
      words: z.array(z.any()).default([]),
      grammar_patterns: z.array(z.any()).default([]),
    }).passthrough().default({ words: [], grammar_patterns: [] } as any),
  }).passthrough()).default([]),
  suggested_flashcards: z.array(z.any()).default([]),
  grammar_summary: z.object({
    particles_used: z.array(z.string()).default([]),
    verb_forms: z.array(z.string()).default([]),
    key_patterns: z.array(z.any()).default([]),
  }).passthrough().optional().default({} as any),
  cultural_notes: z.array(z.string()).default([]),
}).passthrough();

const OverviewSchema = z.object({
  overall_analysis: z.object({
    jlpt_level: z.string().default('N?'),
    politeness_level: z.string().default(''),
    register: z.string().optional(),
    dialect: z.string().optional(),
    text_type: z.string().default(''),
    summary: z.string().default(''),
  }).passthrough().default({} as any),
  key_vocab_preview: z.array(z.any()).default([]),
  cultural_notes: z.array(z.string()).default([]),
}).passthrough();

const RewriteSchema = z.object({
  original: z.string().default(''),
  variants: z.array(z.object({
    label: z.string().default(''),
    japanese: z.string().default(''),
    reading: z.string().default(''),
    vietnamese: z.string().default(''),
    nuance: z.string().default(''),
  }).passthrough()).default([]),
  recommendation: z.string().default(''),
}).passthrough();

const EtymologySchema = z.object({
  word: z.string().default(''),
  reading: z.string().default(''),
  meaning: z.string().default(''),
  kanji_breakdown: z.array(z.any()).default([]),
  etymology: z.string().default(''),
  synonyms: z.array(z.any()).default([]),
  antonyms: z.array(z.any()).default([]),
  collocations: z.array(z.string()).default([]),
}).passthrough();

const GrammarSchema = z.object({
  isCorrect: z.boolean().default(false),
  corrected: z.string().default(''),
  corrected_formal: z.string().optional(),
  corrected_casual: z.string().optional(),
  corrected_natural: z.string().optional(),
  errors: z.array(z.any()).default([]),
  explanation: z.string().default(''),
  rules_detail: z.array(z.any()).default([]),
}).passthrough();

const CompareSchema = z.object({
  sentences: z.array(z.any()).default([]),
  verdict: z.string().default(''),
  differences: z.array(z.any()).default([]),
}).passthrough();

const VisionSchema = z.object({
  object_name: z.string().default(''),
  reading: z.string().default(''),
  vietnamese_meaning: z.string().default(''),
  description: z.string().default(''),
  vocabulary: z.array(z.any()).default([]),
  sample_sentences: z.array(z.any()).default([]),
}).passthrough();

/** Safe-parse: returns normalized data with defaults, never throws. */
function safeNormalize<T>(schema: z.ZodType<T>, raw: unknown, label: string): T {
  const r = schema.safeParse(raw ?? {});
  if (!r.success) {
    console.warn(`[zod:${label}] validation issues, using defaults:`, r.error.flatten());
    // Re-parse empty object to get full default shape
    return schema.parse({}) as T;
  }
  return r.data;
}

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
  mode?: string;
  engine?: "gemini" | "groq";
  saveToHistory?: boolean;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  user_level?: string;
  isComparison?: boolean;
  compare_sentences?: string[];
  // Sensei capability extensions
  pass?: 'overview' | 'deep';
  reasoning_mode?: 'fast' | 'standard' | 'deep';
  rewrite_mode?: 'politeness' | 'jlpt';
  target_word?: string; // for etymology task
}

const GRAMMAR_SYSTEM_PROMPT = `Bạn là một giáo viên tiếng Nhật (Sensei) chuyên môn cao, chuyên hỗ trợ người học tiếng Việt.
Nhiệm vụ của bạn là kiểm tra, sửa lỗi ngữ pháp hoặc dịch câu nhập vào sang TIẾNG NHẬT TỰ NHIÊN NHẤT (Natural Japanese).

QUY TẮC QUAN TRỌNG:
1. Nếu văn bản nhập vào bằng Tiếng Anh hoặc Tiếng Việt, hãy DỊCH nó sang một câu tiếng Nhật thật tự nhiên.
2. Nếu văn bản nhập vào là tiếng Nhật có lỗi, hãy sửa nó thành câu tiếng Nhật chuẩn.
3. Toàn bộ phần "explanation" (giải thích) PHẢI được viết bằng tiếng Việt, giọng điệu ân cần.

PHÂN TÍCH CHI TIẾT:
- Giải thích rõ các cấu trúc ngữ pháp (Ví dụ: "Câu này dùng て-form để nối 2 hành động", "Passive form: られる → bị/được làm gì").
- Cung cấp "Ví dụ tương tự" để người học dễ hình dung.

Trả về JSON sau:
{
  "isCorrect": boolean,
  "corrected": "Câu đúng",
  "corrected_formal": "Thể lịch sự",
  "corrected_casual": "Thể thân mật",
  "corrected_natural": "Tự nhiên nhất",
  "errors": [
    {
      "position": number,
      "original": "phần sai",
      "corrected": "phần đúng",
      "type": "particle_mistake" | "verb_conjugation" | "word_choice" | "politeness" | "spelling" | "structure",
      "explanation": "Giải thích chi tiết bằng tiếng Việt"
    }
  ],
  "explanation": "Giải thích tổng quát (tiếng Việt)",
  "rules_detail": [
    {
      "pattern": "Ngữ pháp",
      "jlpt": "N1-N5",
      "meaning": "Ý nghĩa",
      "similar_examples": ["Ví dụ 1", "Ví dụ 2"]
    }
  ]
}`;

const ENHANCED_SYSTEM_PROMPT = `Bạn là chuyên gia phân tích tiếng Nhật chuyên sâu dành cho người Việt.
Nhiệm vụ của bạn là phân tích văn bản tiếng Nhật và trả về kết quả JSON chi tiết.

CẤU TRÚC PHÂN TÍCH (JSON):
{
  "overall_analysis": {
    "jlpt_level": "N5-N1",
    "politeness_level": "敬語/丁寧/普通/タメ口",
    "register": "formal | casual | business | literary | spoken",
    "dialect": "standard | 関西弁 | 若者言葉 | 古文 | ...",
    "text_type": "Loại văn bản",
    "summary": "Tóm tắt chi tiết bằng tiếng Việt"
  },
  "sentences": [
    {
      "japanese": "Câu gốc",
      "vietnamese": "Dịch tự nhiên",
      "structure": {
        "subject": "Chủ ngữ (主語)",
        "predicate": "Vị ngữ (述語)",
        "object": "Tân ngữ (目的語)"
      },
      "breakdown": {
        "words": [
          {
            "word": "Từ",
            "reading": "Cách đọc",
            "meaning": "Nghĩa",
            "pos": "Loại từ (Danh từ, Động từ, Trợ từ...)",
            "hanviet": "Hán Việt",
            "pitch_pattern": "LHHH (mỗi mora 1 ký tự L hoặc H, ví dụ はし=LH 端, HL 箸)"
          }
        ],
        "grammar_patterns": [
          {
            "pattern": "Mẫu ngữ pháp",
            "meaning": "Ý nghĩa và cách dùng trong câu này",
            "jlpt_level": "N5-N1",
            "register": "spoken | written | both",
            "common_mistakes": ["Lỗi 1", "Lỗi 2"],
            "similar_patterns": ["Cấu trúc dễ nhầm 1"],
            "similar_examples": ["Ví dụ 1", "Ví dụ 2"]
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
    "particles_used": ["は","が","を"],
    "verb_forms": ["て-form","た-form"],
    "key_patterns": [
      { "pattern": "〜ている", "jlpt_level": "N5", "meaning": "Đang/Đã", "frequency": "high", "common_mistakes": [] }
    ]
  },
  "cultural_notes": ["Ghi chú văn hóa bằng tiếng Việt"]
}

CRITICAL RULES:
1. Luôn trả ĐỦ các trường overall_analysis, sentences, suggested_flashcards, grammar_summary, cultural_notes (mảng rỗng nếu không có).
2. pitch_pattern chỉ dùng L/H (không dấu phụ); nếu không chắc dùng "?".
3. Tất cả phần giải thích bằng tiếng Việt.
4. Trả về ONLY JSON, không markdown, không giải thích ngoài JSON.`;

const OVERVIEW_SYSTEM_PROMPT = `Bạn là chuyên gia tiếng Nhật. Trả về phân tích NHANH ở mức tổng quan.
JSON:
{
  "overall_analysis": {
    "jlpt_level": "N5-N1",
    "politeness_level": "敬語/丁寧/普通",
    "register": "formal | casual | business | literary | spoken",
    "dialect": "standard | 関西弁 | 若者言葉 | ...",
    "text_type": "loại văn bản",
    "summary": "tóm tắt 2-3 câu bằng tiếng Việt"
  },
  "key_vocab_preview": [
    { "word": "từ", "reading": "kana", "meaning": "nghĩa VN", "jlpt_level": "N?" }
  ],
  "cultural_notes": ["lưu ý ngắn (tuỳ chọn)"]
}
Trả về ONLY JSON. Tối đa 6 key_vocab_preview.`;

const REWRITE_SYSTEM_PROMPT = `Bạn là chuyên gia tiếng Nhật. Viết lại câu/đoạn theo nhiều biến thể.
- Nếu mode = "politeness": trả 3 phiên bản 敬語(formal), 丁寧(polite), 普通(casual).
- Nếu mode = "jlpt": trả 3 phiên bản N5, N3, N1.

JSON:
{
  "original": "câu gốc",
  "variants": [
    {
      "label": "敬語 / 丁寧 / 普通 / N5 / N3 / N1",
      "japanese": "câu viết lại",
      "reading": "cách đọc đầy đủ (hiragana)",
      "vietnamese": "dịch tự nhiên",
      "nuance": "khác biệt sắc thái / độ khó (tiếng Việt)"
    }
  ],
  "recommendation": "khuyến nghị dùng biến thể nào trong tình huống nào (tiếng Việt)"
}
Trả về ONLY JSON.`;

const ETYMOLOGY_SYSTEM_PROMPT = `Bạn là chuyên gia Hán-Nhật. Phân tích nguồn gốc cấu tạo của TỪ tiếng Nhật.
JSON:
{
  "word": "từ",
  "reading": "kana",
  "meaning": "nghĩa VN",
  "kanji_breakdown": [
    {
      "kanji": "字",
      "onyomi": ["ジ"],
      "kunyomi": ["あざ"],
      "hanviet": "TỰ",
      "meaning": "nghĩa từng chữ",
      "radicals": [{ "radical": "宀", "meaning": "mái nhà" }]
    }
  ],
  "etymology": "Nguồn gốc/lịch sử từ (tiếng Việt, ngắn gọn)",
  "synonyms": [{ "word": "同義語", "reading": "kana", "meaning": "VN" }],
  "antonyms": [{ "word": "反義語", "reading": "kana", "meaning": "VN" }],
  "collocations": ["cụm từ thường đi kèm"]
}
Trả về ONLY JSON.`;

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

const COMPARE_SYSTEM_PROMPT = `Bạn là chuyên gia tiếng Nhật. So sánh các câu sau đây và phân tích sự khác biệt.

Trả về JSON:
{
  "sentences": [
    {
      "text": "Câu tiếng Nhật",
      "naturalness_rank": 1,
      "is_most_natural": true,
      "analysis": "Phân tích sắc thái và ngữ cảnh phù hợp (tiếng Việt)",
      "formality_level": "casual/polite/formal",
      "context_suitable": ["giao tiếp hàng ngày", "viết email"]
    }
  ],
  "verdict": "Câu ... là tự nhiên nhất vì ... (tiếng Việt)",
  "differences": [
    {
      "aspect": "Cấu trúc ngữ pháp",
      "detail": "Giải thích chi tiết sự khác biệt giữa các câu (tiếng Việt)"
    }
  ]
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
    structure?: {
      subject: string;
      predicate: string;
      object: string;
    };
    breakdown: {
      words: Array<{
        word: string;
        reading: string;
        hanviet: string | null;
        meaning: string;
        pos: string;
        jlpt_level?: string;
      }>;
      grammar_patterns: Array<{
        pattern: string;
        meaning: string;
        usage?: string;
        similar_examples?: string[];
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
  cultural_notes: string[];
}

interface GrammarError {
  position: number;
  original: string;
  corrected: string;
  type: 'particle_mistake' | 'verb_conjugation' | 'word_choice' | 'politeness' | 'spelling' | 'structure';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  explanation: string;
}

interface GrammarRule {
  pattern: string;
  jlpt: string;
  meaning: string;
  similar_examples?: string[];
}

interface GrammarAnalysis {
  isCorrect: boolean;
  corrected: string;
  corrected_formal?: string;
  corrected_casual?: string;
  corrected_natural?: string;
  errors?: GrammarError[];
  explanation: string;
  rules_detail?: GrammarRule[];
}

interface VisionAnalysis {
  object_name: string;
  reading: string;
  vietnamese_meaning: string;
  description: string;
  vocabulary: Array<{ word: string; reading: string; meaning: string }>;
  sample_sentences: Array<{ japanese: string; translation: string }>;
}

interface CompareResult {
  sentences: Array<{
    text: string;
    naturalness_rank: number;
    is_most_natural: boolean;
    analysis: string;
    formality_level: string;
    context_suitable: string[];
  }>;
  verdict: string;
  differences: Array<{
    aspect: string;
    detail: string;
  }>;
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

// ── Smart Analysis Model Router ────────────────────────────────
function selectAnalysisModel(taskType: string, textContent: string, reasoningMode?: string): string {
  if (taskType === 'vision') {
    return "meta-llama/llama-4-scout-17b-16e-instruct";
  }
  // Reasoning mode override (user-controlled Sensei mode)
  if (reasoningMode === 'fast') return "llama-3.1-8b-instant";
  if (reasoningMode === 'deep') return "deepseek-r1-distill-llama-70b";
  if (reasoningMode === 'standard') return "llama-3.3-70b-versatile";
  // Pass 1 overview is always fast & cheap
  if (taskType === 'overview') return "llama-3.1-8b-instant";
  if (taskType === 'rewrite') return "llama-3.3-70b-versatile";
  if (taskType === 'etymology') return "llama-3.3-70b-versatile";
  if (taskType === 'grammar') {
    const isHardGrammar = /keigo|passive|causative|potential|conditional|volitional|て形|た形|ない形|敬語|謙譲|丁寧|させ|られ/i.test(textContent);
    if (isHardGrammar) {
      return "deepseek-r1-distill-llama-70b";
    }
  }
  return "llama-3.3-70b-versatile";
}

// ── Groq API call with key rotation ────────────────────────────
async function fetchGroqWithRotation(apiKeys: string[], model: string, system: string, user: string | Record<string, unknown>[], json = true, history: Array<{ role: string; content: string }> = []) {
  let lastError = null;
  for (const apiKey of apiKeys) {
    try {
      const messages: Array<{ role: string; content: string | Record<string, unknown>[] }> = [{ role: "system", content: system }];
      if (history && history.length > 0) {
        history.forEach(m => messages.push({ role: m.role, content: m.content }));
      }
      messages.push({ role: "user", content: Array.isArray(user) ? user as Record<string, unknown>[] : user });

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
        console.warn(`Groq key failed, trying next... ${lastError.message}`);
      }
    } catch (e) {
      lastError = e;
      console.error("Groq fetch error, trying next key...", e);
    }
  }
  throw lastError || new Error("All Groq keys failed");
}

// ── Gemini REST API call (fallback) ────────────────────────────
async function fetchGemini(apiKey: string, _model: string, system: string, user: string | Record<string, unknown>[], json = true) {
  const geminiModel = "gemini-2.0-flash";

  const contents: Array<{ role: string; parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> }> = [
    { role: "user", parts: [{ text: typeof user === "string" ? user : JSON.stringify(user) }] }
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: system }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      responseMimeType: json ? "application/json" : "text/plain",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text;
}

// ── Try Groq first, fallback to Gemini ─────────────────────────
async function fetchWithFallback(
  groqKeys: string[],
  geminiKey: string | undefined,
  model: string,
  system: string,
  user: string | Record<string, unknown>[],
  json = true,
  history: Array<{ role: string; content: string }> = []
) {
  if (groqKeys.length > 0) {
    try {
      console.log(`Trying Groq (model: ${model})...`);
      return await fetchGroqWithRotation(groqKeys, model, system, user, json, history);
    } catch (e) {
      console.warn("Groq failed, falling back to Gemini:", e);
    }
  }

  if (geminiKey) {
    console.log(`Falling back to Gemini (model: gemini-2.0-flash)...`);
    return await fetchGemini(geminiKey, model, system, user, json);
  }

  throw new Error("No AI provider available (both Groq and Gemini keys are missing or failed)");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: AnalysisRequest & Record<string, unknown> = await req.json();
    const {
      task,
      prompt,
      content,
      image,
      isImageAnalysis,
      isGrammar,
      mode,
      saveToHistory = true,
      history = [],
      pass,
      reasoning_mode,
      rewrite_mode,
      target_word,
    } = body;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rl = await checkRateLimit(req, supabase, { tier: "critical", endpoint: "japanese-analysis" });
    if (rl) return rl;

    const isGrammarRequest = isGrammar === true || mode === 'grammar' || task === 'grammar';

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwtClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: authUser }, error: authError } = await jwtClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = authUser.id;

    const groqApiKeys = [
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3"),
      Deno.env.get("GROQ_API_KEY_1")
    ].filter(Boolean) as string[];

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    let resultData: Record<string, unknown> = {};

    if (task === 'chat') {
      const systemPrompt = prompt || "You are a helpful Japanese Sensei.";
      const rawChat = await fetchWithFallback(groqApiKeys, geminiApiKey, "llama-3.3-70b-versatile", systemPrompt, content, false, history);
      resultData = { format: 'chat', text: rawChat, engine: groqApiKeys.length > 0 ? "groq" : "gemini" };
    } else if (isImageAnalysis && image) {
      const visionModel = selectAnalysisModel('vision', '');
      const userContent = [
        { type: "text", text: "Analyze the Japanese content in this image and return JSON." },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
      ];
      const rawVision = await fetchWithFallback(groqApiKeys, geminiApiKey, visionModel, VISION_SYSTEM_PROMPT, userContent);
      resultData = { format: 'vision', result: extractJSON(rawVision), engine: groqApiKeys.length > 0 ? "groq" : "gemini" };
    } else if (body.isComparison && body.compare_sentences && body.compare_sentences.length >= 2) {
      const sentences = body.compare_sentences.map((s, i) => `Câu ${i + 1}: ${s}`).join('\n');
      const raw = await fetchWithFallback(groqApiKeys, geminiApiKey, "llama-3.3-70b-versatile", COMPARE_SYSTEM_PROMPT, sentences);
      resultData = { format: 'compare', result: extractJSON(raw), engine: groqApiKeys.length > 0 ? "groq" : "gemini" };
    } else if (task === 'rewrite' || rewrite_mode) {
      const rmode = rewrite_mode || 'politeness';
      const model = selectAnalysisModel('rewrite', content || '', reasoning_mode);
      const userContent = `mode = "${rmode}"\nSentence:\n"""\n${content}\n"""`;
      const raw = await fetchWithFallback(groqApiKeys, geminiApiKey, model, REWRITE_SYSTEM_PROMPT, userContent, true);
      resultData = { format: 'rewrite', mode: rmode, result: extractJSON(raw), engine: groqApiKeys.length > 0 ? 'groq' : 'gemini' };
    } else if (task === 'etymology') {
      const model = selectAnalysisModel('etymology', content || '', reasoning_mode);
      const userContent = `Word: ${target_word || content}\nContext sentence (if any): ${content}`;
      const raw = await fetchWithFallback(groqApiKeys, geminiApiKey, model, ETYMOLOGY_SYSTEM_PROMPT, userContent, true);
      resultData = { format: 'etymology', result: extractJSON(raw), engine: groqApiKeys.length > 0 ? 'groq' : 'gemini' };
    } else if (pass === 'overview') {
      const model = selectAnalysisModel('overview', content || '', reasoning_mode);
      const userContent = `Text:\n"""\n${content}\n"""`;
      const raw = await fetchWithFallback(groqApiKeys, geminiApiKey, model, OVERVIEW_SYSTEM_PROMPT, userContent, true);
      resultData = { format: 'overview', analysis: extractJSON(raw), engine: groqApiKeys.length > 0 ? 'groq' : 'gemini' };
    } else {
      const chosenModel = selectAnalysisModel(isGrammarRequest ? 'grammar' : 'text', content || '', reasoning_mode);
      const systemPrompt = isGrammarRequest ? GRAMMAR_SYSTEM_PROMPT : ENHANCED_SYSTEM_PROMPT;
      let userContent = `Text to analyze:\n"""\n${content}\n"""`;
      if (prompt) userContent += `\n\nUser Instruction:\n"""\n${prompt}\n"""`;

      const raw = await fetchWithFallback(groqApiKeys, geminiApiKey, chosenModel, systemPrompt, userContent, true);
      const parsed = extractJSON(raw);

      if (isGrammarRequest) {
        resultData = { format: 'grammar', result: parsed, engine: groqApiKeys.length > 0 ? "groq" : "gemini" };
      } else {
        resultData = { format: 'structured', analysis: parsed, engine: groqApiKeys.length > 0 ? "groq" : "gemini" };
      }

      if (saveToHistory && userId) {
        supabase.from('analysis_history').insert({
          user_id: userId,
          content,
          analysis: parsed,
          engine: resultData.engine,
          language: 'japanese',
        }).then(() => {}).catch(e => console.warn('Failed to save history:', e));
      }
    }

    return new Response(JSON.stringify(resultData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
