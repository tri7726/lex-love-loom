// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { grammar_point, level, explanation } = await req.json();
    const GROQ_API_KEY = (Deno as any).env.get("GROQ_API_KEY");

    if (!GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY");
    }

    console.log(`Generating grammar quiz for ${grammar_point} using Groq...`);

    const userPrompt = `Hãy tạo 3 câu hỏi luyện tập cho cấu trúc ngữ pháp sau:
Cấu trúc: ${grammar_point}
Trình độ: ${level}
Giải nghĩa: ${explanation}

Yêu cầu các câu hỏi phải sát với thực tế và giúp người dùng hiểu rõ cách dùng.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "";
    
    const cleanedText = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    // Verify it's valid JSON
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Parse failed for:", cleanedText);
      throw new Error("AI returned invalid JSON");
    }

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error generating grammar quiz:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
