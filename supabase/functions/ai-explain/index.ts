// Supabase Edge Function: AI Explain (Reasoning Sensei)
// Uses DeepSeek R1 (deepseek-r1-distill-llama-70b) for deep step-by-step
// grammar explanations triggered by "Giải thích sâu" buttons in the UI.
//
// Supports two modes:
//   stream=false (default) — returns JSON response
//   stream=true            — returns SSE streaming with real-time tokens + final result
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// ─── Config ───────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REQUEST_TIMEOUT_MS = 25_000;

// ─── RAG Memory ────────────────────────────────────────────────────────────────

function getClientFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

async function buildRAGContext(supabase: ReturnType<typeof createClient>): Promise<string> {
  try {
    const parts: string[] = [];

    // 1. Weak vocabulary items (RLS filters by user's JWT automatically)
    const { data: weakItems } = await supabase
      .from("user_vocabulary_progress")
      .select(`
        incorrect_count, correct_count,
        vocabulary:vocabulary_id (word, kana, meaning_vi)
      `)
      .gt("incorrect_count", 0)
      .order("incorrect_count", { ascending: false })
      .limit(5);

    if (weakItems && weakItems.length > 0) {
      parts.push("=== Từ vựng bạn hay nhầm / chưa vững ===");
      for (const item of weakItems) {
        const v = item.vocabulary as Record<string, unknown>;
        parts.push(
          `- ${v.word ?? ""} (${v.kana ?? ""}): ${v.meaning_vi ?? ""} — sai ${item.incorrect_count} lần, đúng ${item.correct_count} lần`,
        );
      }
    }

    if (parts.length === 0) return "";
    return `\n\n=== Ngữ cảnh học tập của bạn (từ hệ thống ghi nhớ) ===\n${parts.join("\n")}`;
  } catch (err) {
    console.warn("RAG context fetch skipped (non-critical):", err);
    return "";
  }
}

// ─── Schema types ─────────────────────────────────────────────────────────────

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
}

interface StepData {
  step: number;
  title: string;
  explanation: string;
  example?: string;
}

interface ExplanationResult {
  reasoning_steps: StepData[];
  conclusion: string;
  difficulty: string;
  related_patterns: string[];
  mnemonics?: string;
  common_mistakes?: string;
}

function isValidExplanationResult(value: unknown): value is ExplanationResult {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.reasoning_steps)) return false;
  if (typeof obj.conclusion !== "string") return false;
  if (typeof obj.difficulty !== "string") return false;
  if (!Array.isArray(obj.related_patterns)) return false;
  for (const step of obj.reasoning_steps) {
    if (typeof step !== "object" || !step) return false;
    const s = step as Record<string, unknown>;
    if (typeof s.step !== "number") return false;
    if (typeof s.title !== "string") return false;
    if (typeof s.explanation !== "string") return false;
  }
  return true;
}

function extractFirstJson(raw: string): string | null {
  try {
    JSON.parse(raw.trim());
    return raw.trim();
  } catch {
    // intentional — null handled by callers
  }
  const markdownMatch = raw.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  if (markdownMatch?.[1]) return markdownMatch[1];
  const jsonMatch = raw.match(/\{.*?\}/s);
  if (jsonMatch) return jsonMatch[0];
  return null;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const REASONING_SYSTEM_PROMPT = `Bạn là **Sensei Suy Luận** — chuyên gia giải thích ngữ pháp tiếng Nhật bằng cách suy nghĩ từng bước (step-by-step).

PHONG CÁCH:
- Luôn bắt đầu bằng "Hãy để tôi phân tích từng bước..."
- Trình bày rõ từng bước suy luận, đánh số thứ tự
- Giọng điệu thân thiện, kiên nhẫn như người thầy dạy kèm 1-1
- Kết thúc bằng tóm tắt 1-2 câu bằng tiếng Việt đơn giản

ĐỊNH DẠNG OUTPUT (JSON):
{
  "reasoning_steps": [
    { "step": 1, "title": "Tiêu đề bước", "explanation": "Giải thích chi tiết", "example": "Ví dụ tiếng Nhật nếu có" }
  ],
  "conclusion": "Tóm tắt ngắn gọn bằng tiếng Việt",
  "difficulty": "N5 | N4 | N3 | N2 | N1",
  "related_patterns": ["Cấu trúc liên quan 1", "Cấu trúc liên quan 2"],
  "mnemonics": "Mẹo ghi nhớ ngắn (1-2 câu) giúp học sinh Việt Nam nhớ cấu trúc này",
  "common_mistakes": "Phân tích 1 lỗi sai phổ biến nhất mà học sinh Việt Nam hay mắc phải với cấu trúc này"
}

QUY TẮC:
- Luôn dùng **Mẹo ghi nhớ (Mnemonics)** phù hợp với người Việt: liên tưởng bằng tiếng Việt, hình ảnh quen thuộc, âm thanh tương đồng
- Nếu có cấu trúc dễ nhầm lẫn, hãy so sánh trực tiếp (ví dụ: は wa vs が ga, て-form vs た-form, のに vs ので)
- Phân tích TẠI SAO người học hay nhầm, không chỉ nói NHƯ THẾ NÀO là đúng
- Giải thích bằng tiếng Việt, ví dụ bằng tiếng Nhật có kèm furigana trong ngoặc nếu cần
- Nếu là lỗi sai từ người dùng, chỉ ra chính xác bước nào trong suy luận của họ bị sai
- Chỉ trả về JSON hợp lệ, không có văn bản thêm`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiKeys(): string[] {
  return [
    Deno.env.get("GROQ_API_KEY_1"),
    Deno.env.get("GROQ_API_KEY_2"),
    Deno.env.get("GROQ_API_KEY_3"),
    Deno.env.get("GROQ_API_KEY"),
  ].filter(Boolean) as string[];
}

function buildUserPrompt(question: string, context?: string, explainType?: string, ragContext?: string): string {
  return [
    `Loại giải thích: ${explainType || 'grammar'}`,
    `Câu hỏi / Điểm cần phân tích:\n"""${question}"""`,
    context ? `Ngữ cảnh thêm:\n"""${context}"""` : "",
    ragContext || "",
  ].filter(Boolean).join("\n\n");
}

// ─── Streaming Handler ────────────────────────────────────────────────────────

async function handleStreaming(
  { question, context, explain_type }: Record<string, unknown>,
  apiKey: string,
  ragContext?: string,
): Promise<Response> {
  const model = "deepseek-r1-distill-llama-70b";

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: REASONING_SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(question as string, context as string, explain_type as string, ragContext) },
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text();
    throw new Error(`Groq streaming error (${groqRes.status}): ${errText.slice(0, 200)}`);
  }

  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const payload = trimmed.slice(6);
            if (payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload);
              const content: string = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                fullText += content;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`),
                );
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }

        // Parse and validate final JSON
        const jsonStr = extractFirstJson(fullText);
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr) as unknown;
            if (isValidExplanationResult(parsed)) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "result", data: { ...parsed, model_used: model } })}\n\n`,
                ),
              );
            }
          } catch {
            // intentional — parser error, skip to next tick
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`),
        );
      } finally {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...CORS_HEADERS,
    },
  });
}

// ─── Non-Streaming Handler (existing logic) ──────────────────────────────────

async function handleNonStreaming(
  { question, context, explain_type }: Record<string, unknown>,
  apiKeys: string[],
  ragContext?: string,
): Promise<Response> {
  const userContent = [
    `Loại giải thích: ${explain_type || 'grammar'}`,
    `Câu hỏi / Điểm cần phân tích:\n"""${question}"""`,
    context ? `Ngữ cảnh thêm:\n"""${context}"""` : "",
    ragContext || "",
  ].filter(Boolean).join("\n\n");

  const MODEL_PRIORITY = [
    "deepseek-r1-distill-llama-70b",
    "llama-3.3-70b-versatile",
  ];

  let result: ExplanationResult | null = null;
  let modelUsed: string | null = null;

  outer: for (const model of MODEL_PRIORITY) {
    for (const apiKey of apiKeys) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: REASONING_SYSTEM_PROMPT },
              { role: "user", content: userContent },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 2048,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 429) {
            console.warn(`ai-explain: ${model} rate limited, trying next key`);
            continue;
          }
          if (res.status >= 400 && res.status < 500) {
            console.warn(`ai-explain: ${model} auth error (${res.status}), skipping key`);
            continue;
          }
          console.warn(`ai-explain: ${model} failed (${res.status}): ${errText.slice(0, 100)}`);
          continue;
        }

        const data = await res.json() as Record<string, unknown>;
        const choices = data.choices as Array<Record<string, unknown>>;
        const raw = (choices?.[0]?.message as Record<string, unknown>)?.content as string;
        if (!raw) continue;

        const jsonStr = extractFirstJson(raw);
        if (!jsonStr) {
          console.warn(`ai-explain: ${model} no valid JSON found, trying next`);
          continue;
        }

        const parsed = JSON.parse(jsonStr) as unknown;
        if (!isValidExplanationResult(parsed)) {
          console.warn(`ai-explain: ${model} returned invalid schema, trying next`);
          continue;
        }

        result = parsed;
        modelUsed = model;
        console.log(`✅ ai-explain succeeded with ${model}`);
        break outer;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          console.warn(`ai-explain: ${model} timed out after ${REQUEST_TIMEOUT_MS}ms`);
        } else {
          console.error(`ai-explain: ${model} fetch error:`, err);
        }
      } finally {
        clearTimeout(timer);
      }
    }
  }

  if (!result || !modelUsed) {
    throw new Error("All models failed to generate explanation");
  }

  return new Response(
    JSON.stringify({ ...result, model_used: modelUsed }),
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}

// ─── Vocab Extraction: Text ──────────────────────────────────────────────────

async function handleTextVocab(
  body: Record<string, unknown>,
  _apiKeys: string[],
): Promise<Response> {
  const { text, prompt } = body;
  if (!text) throw new Error("Missing text");

  const systemPrompt = `You are a multilingual vocabulary extraction expert.
Extract all important vocabulary words from the given text.
Return ONLY a valid JSON array (no markdown, no explanation) with objects:
[
  {
    "word": "original form",
    "reading": "pronunciation/furigana if Japanese/Chinese, else omit",
    "meaning": "meaning in Vietnamese",
    "language": "Japanese|Korean|Chinese|English|Vietnamese",
    "part_of_speech": "noun|verb|adjective|adverb|phrase",
    "example": "short example sentence",
    "level": "JLPT level (N5-N1) if Japanese, CEFR level (A1-C2) for other languages, or empty string if uncertain"
  }
]`;

  const userMsg = (prompt as string) || `Extract vocabulary from: "${text as string}"`;

  // Use Google AI Studio directly
  const GOOGLE_AI_KEY = "AIzaSyDcv5Y4-f0f7UYsgebSJTm4T10FrfADwXo"; 

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt + "\n\n" + userMsg },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google AI Studio text failed: ${errText.slice(0, 200)}`);
    }

    const json = await res.json() as GeminiResponse;
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Text model did not return JSON array");

    return new Response(
      JSON.stringify({ result: match[0] }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── Vocab Extraction: Image ──────────────────────────────────────────────────

async function handleImageVocab(
  body: Record<string, unknown>,
  apiKeys: string[],
): Promise<Response> {
  const { imageBase64, imageType, wordCount, prompt } = body;
  if (!imageBase64) throw new Error("Missing imageBase64");

  const count = wordCount === "auto" ? "all visible" : `exactly ${wordCount}`;
  const systemPrompt = `You are a multilingual vocabulary extraction expert for language learners.
Analyze the provided image and extract ${count} vocabulary words related to objects, text, scenes, or themes visible.
Return ONLY a valid JSON array (no markdown, no extra text):
[
  {
    "word": "word in its source language",
    "reading": "pronunciation if Japanese/Chinese",
    "meaning": "meaning in Vietnamese",
    "language": "Japanese|Korean|Chinese|English|Vietnamese",
    "part_of_speech": "noun|verb|adjective|phrase",
    "example": "short example sentence using the word",
    "level": "JLPT level (N5-N1) if Japanese, CEFR level (A1-C2) for other languages, or empty string if uncertain"
  }
]`;

  const userMsg = (prompt as string) || `Extract vocabulary from this image.`;

  // Use Google AI Studio directly
  const GOOGLE_AI_KEY = "AIzaSyDcv5Y4-f0f7UYsgebSJTm4T10FrfADwXo"; // Provided directly from user
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt + "\\n\\n" + userMsg },
              {
                inline_data: {
                  mime_type: imageType ?? "image/jpeg",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Google AI Studio vision failed:", errText.slice(0, 200));
      return handleTextVocab(
        { text: `Describe objects/words seen in an image and extract vocabulary. Context: ${userMsg}`, ...body },
        apiKeys,
      );
    }

    const json = await res.json() as GeminiResponse;
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Vision model did not return JSON array");

    return new Response(
      JSON.stringify({ result: match[0] }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const body = await req.json() as Record<string, unknown>;
    const { type } = body;

    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) throw new Error("No API keys configured");

    // ── Route by type ──
    if (type === "text_vocab") {
      return await handleTextVocab(body, apiKeys);
    }
    if (type === "image_vocab") {
      return await handleImageVocab(body, apiKeys);
    }

    // ── Default: grammar explanation (existing flow) ──
    const { question } = body;
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── RAG Memory: fetch user's weak areas ──
    let ragContext = "";
    try {
      const supabase = getClientFromRequest(req);
      ragContext = await buildRAGContext(supabase);
    } catch {
      // fail open — RAG is a nice-to-have
    }

    // Streaming mode
    if (body.stream === true) {
      return await handleStreaming(body, apiKeys[0], ragContext);
    }

    // Non-streaming mode (default, backward compatible)
    return await handleNonStreaming(body, apiKeys, ragContext);
  } catch (error) {
    const err = error as Error;
    console.error("ai-explain critical error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
