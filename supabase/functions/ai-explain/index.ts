// @ts-nocheck: suppressing standard TS errors in Deno edge function
// Supabase Edge Function: AI Explain (Reasoning Sensei)
// Uses DeepSeek R1 (deepseek-r1-distill-llama-70b) for deep step-by-step
// grammar explanations triggered by "Giải thích sâu" buttons in the UI.
// @ts-ignore Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REASONING_SYSTEM_PROMPT = `Bạn là **Sensei Suy Luận** — chuyên gia giải thích ngữ pháp tiếng Nhật bằng cách suy nghĩ từng bước (step-by-step).

PHONG CÁCH:
- Luôn bắt đầu bằng "Hãy để tôi phân tích từng bước..."
- Trình bày rõ từng bước suy luận, đánh số thứ tự
- Dùng ví dụ cụ thể, ngắn gọn sau mỗi bước
- Kết thúc bằng tóm tắt 1-2 câu bằng tiếng Việt đơn giản

ĐỊNH DẠNG OUTPUT (JSON):
{
  "reasoning_steps": [
    { "step": 1, "title": "Tiêu đề bước", "explanation": "Giải thích chi tiết", "example": "Ví dụ tiếng Nhật nếu có" }
  ],
  "conclusion": "Tóm tắt ngắn gọn bằng tiếng Việt",
  "difficulty": "N5 | N4 | N3 | N2 | N1",
  "related_patterns": ["Cấu trúc liên quan 1", "Cấu trúc liên quan 2"]
}

QUY TẮC:
- Giải thích phải đủ sâu để người học hiểu TẠI SAO, không chỉ NHƯ THẾ NÀO
- Nếu là lỗi sai, giải thích tại sao người học hay nhầm
- Tất cả giải thích bằng tiếng Việt, ví dụ tiếng Nhật
- Chỉ trả về JSON hợp lệ, không có văn bản thêm`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      question,      // Câu hỏi hoặc đoạn text cần giải thích
      context,       // Ngữ cảnh (ví dụ: câu sai của user, ngữ pháp đang học)
      explain_type = "grammar", // "grammar" | "vocab" | "error" | "pattern"
    } = await req.json();

    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3"),
      Deno.env.get("GROQ_API_KEY"),
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) throw new Error("No API keys configured");

    // Build rich user prompt
    const userContent = [
      `Loại giải thích: ${explain_type}`,
      `Câu hỏi / Điểm cần phân tích:\n"""${question}"""`,
      context ? `Ngữ cảnh thêm:\n"""${context}"""` : "",
    ].filter(Boolean).join("\n\n");

    // Model priority: DeepSeek R1 for reasoning, 70B as fallback
    const modelPriority = [
      "deepseek-r1-distill-llama-70b",
      "llama-3.3-70b-versatile",
    ];

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
    }

    let result: ExplanationResult | null = null;

    outer: for (const model of modelPriority) {
      for (const apiKey of apiKeys) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: REASONING_SYSTEM_PROMPT },
                { role: "user", content: userContent },
              ],
              response_format: { type: "json_object" },
              temperature: 0.3, // Lower temp for reasoning — more deterministic
              max_tokens: 2048,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            console.warn(`ai-explain: ${model} / key failed (${res.status}): ${errText.slice(0, 100)}`);
            continue;
          }

          const data = await res.json() as Record<string, unknown>;
          const choices = data.choices as Array<Record<string, unknown>>;
          const raw = (choices?.[0]?.message as Record<string, unknown>)?.content as string;

          if (!raw) continue;

          try {
            const parsed = JSON.parse(raw.trim()) as ExplanationResult;
            result = parsed;
            console.log(`✅ ai-explain generated with ${model}`);
            break outer;
          } catch (_parseErr) {
            // Try to extract JSON from markdown block
            const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
            if (match) {
              result = JSON.parse(match[1] || match[0]) as ExplanationResult;
              break outer;
            }
            console.warn("ai-explain: JSON parse failed, trying next model");
          }
        } catch (e) {
          console.error("ai-explain fetch error:", e);
        }
      }
    }

    if (!result) {
      throw new Error("All models failed to generate explanation");
    }

    return new Response(
      JSON.stringify({ ...result, model_used: modelPriority[0] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const err = error as Error;
    console.error("ai-explain critical error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
