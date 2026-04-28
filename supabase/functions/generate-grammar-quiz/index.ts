// @ts-nocheck: Deno edge function — types resolved at runtime by import map
import { serve } from "std/http/server.ts";

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { grammar_point: _grammar_point, level: _level, explanation: _explanation } = await req.json();
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
                messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
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
