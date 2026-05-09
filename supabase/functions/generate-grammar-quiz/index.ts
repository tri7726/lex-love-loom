// @ts-nocheck: Deno edge function — types resolved at runtime by import map
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Bạn là chuyên gia soạn thảo đề thi năng lực tiếng Nhật (JLPT).
Nhiệm vụ của bạn là tạo ra 3 câu hỏi trắc nghiệm dựa trên một cấu trúc ngữ pháp cụ thể được cung cấp.

Mỗi câu hỏi phải bao gồm:
1. Câu hỏi tiếng Nhật (có chỗ trống bằng dấu ____).
2. 4 lựa chọn (A, B, C, D) bằng tiếng Nhật.
3. Đáp án đúng (index từ 0-3).
4. Giải thích bằng tiếng Việt (tại sao chọn câu đó, ý nghĩa của cấu trúc).
5. Phiên âm Hiragana/Furigana cho các chữ Hán khó trong câu hỏi.

Đảm bảo các câu hỏi có độ khó phù hợp với trình độ của cấu trúc ngữ pháp đó.
Trả về dữ liệu dưới dạng JSON duy nhất, không thêm văn bản ngoài JSON.

Định dạng JSON:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct_answer": number,
      "explanation": "string",
      "furigana": "string"
    }
  ]
}
`;

const ASSESSMENT_SYSTEM_PROMPT = `Bạn là chuyên gia đánh giá năng lực tiếng Nhật theo chuẩn JLPT.
Nhiệm vụ của bạn là tạo ra 5 câu hỏi trắc nghiệm để kiểm tra trình độ ở một cấp độ JLPT cụ thể.

Yêu cầu:
1. Mỗi câu hỏi phải kiểm tra kiến thức ngữ pháp ĐẶC TRƯNG cho cấp độ đó.
2. Có chỗ trống (dùng dấu ____) trong câu tiếng Nhật.
3. 4 lựa chọn (A, B, C, D) bằng tiếng Nhật — chỉ 1 đáp án đúng.
4. Các lựa chọn sai phải hợp lý (gây nhiễu tốt) nhưng không đúng ngữ pháp.
5. Giải thích bằng tiếng Việt chi tiết.
6. Có furigana cho chữ Hán khó.

Trả về JSON:
{
  "level_tested": "N5|N4|N3|N2|N1",
  "questions": [
    {
      "question": "string (câu tiếng Nhật có ____)",
      "options": ["A", "B", "C", "D"],
      "correct_answer": number (0-3),
      "explanation": "string (tiếng Việt)",
      "furigana": "string (hỗ trợ đọc)"
    }
  ]
}
`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { grammar_point: _grammar_point, level: _level, explanation: _explanation, mode, currentLevel } = await req.json();

    const isAssessment = mode === 'assessment';
    const systemPrompt = isAssessment ? ASSESSMENT_SYSTEM_PROMPT : SYSTEM_PROMPT;
    const userPrompt = isAssessment
      ? `Hãy tạo 5 câu hỏi kiểm tra trình độ JLPT ${currentLevel || 'N5'}.`
      : `Tạo 3 câu hỏi về cấu trúc ngữ pháp: ${_grammar_point || 'N5 basic'}. Trình độ: ${_level || 'N5'}. ${_explanation || ''}`;

    // Rate limiting
    const rlSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const rl = await checkRateLimit(req, rlSupabase, { tier: "high", endpoint: "generate-grammar-quiz" });
    if (rl) return rl;

    // Verify JWT
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

    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_3"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_1")
    ].filter(Boolean);

    if (apiKeys.length === 0) throw new Error("No Groq API keys are configured.");

    console.log(`Generating grammar quiz using key rotation (${apiKeys.length} keys total)...`);

    let resultData = null;
    for (const apiKey of apiKeys) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
                response_format: { type: "json_object" },
                temperature: 0.7
            }),
        });
        if (response.ok) {
            const data = await response.json();
            resultData = JSON.parse(data.choices[0]?.message?.content || "{}");
            break; // Key worked, exit loop
        } else {
            const errorText = await response.text();
            console.warn(`Groq API error on Key: ${response.status} ${errorText}. Trying next key...`);
        }
      } catch (e) {
          console.error("Groq Key error in generate-grammar-quiz:", e);
      }
    }

    if (!resultData) throw new Error("AI quiz generation failed on all keys");

    return new Response(JSON.stringify(resultData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error generating grammar quiz:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
