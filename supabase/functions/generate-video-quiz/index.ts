// @ts-nocheck: Deno edge function — types resolved at runtime by import map
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to extract JSON from AI text
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

const SYSTEM_PROMPT = `
Bạn là chuyên gia thiết kế đề thi JLPT (N5–N3).

NHIỆM VỤ:
Tạo một đề thi hoàn chỉnh dựa hoàn toàn trên nội dung video được cung cấp.
Đề thi phải chia thành 3 phần giống cấu trúc JLPT thật: A – B – C.

========================
CẤU TRÚC ĐỀ THI
========================

PHẦN A: TỪ VỰNG (Vocabulary)
- 5–8 câu
- Kiểm tra nghĩa từ, cách đọc, cách dùng từ trong ngữ cảnh
- Trình độ trải từ N5–N3

PHẦN B: NGỮ PHÁP (Grammar)
- 5–8 câu
- Điền vào chỗ trống / chọn mẫu câu đúng
- Kiểm tra chia động từ, trợ từ, cấu trúc câu xuất hiện trong video

PHẦN C: ĐỌC HIỂU & NỘI DUNG (Reading & Comprehension)
- 5–10 câu
- Kiểm tra ý chính, chi tiết, suy luận nhẹ dựa trên nội dung video
- Không hỏi ngoài nội dung được cung cấp

========================
YÊU CẦU CHẤT LƯỢNG
========================

1. Tổng số câu: 15–25 câu.
2. Mỗi câu có đúng 4 lựa chọn.
3. Câu hỏi (\`question_text\`) và các lựa chọn (\`options\`) PHẢI viết bằng tiếng Nhật.
4. Chỉ 1 đáp án đúng.
5. Đáp án sai phải hợp lý, không quá dễ đoán.
6. Không lặp lại cùng dạng câu hỏi quá 2 lần.
7. Không tạo câu hỏi ngoài nội dung video.
8. Không thêm nội dung ngoài JSON.
9. correct_answer là số từ 0–3 (index của options).
10. explanation viết bằng tiếng Việt, giải thích vì sao đúng và vì sao các đáp án khác sai.
11. Phân bổ độ khó:
   - ~40% N5
   - ~35% N4
   - ~25% N3

========================
ĐỊNH DẠNG JSON TRẢ VỀ
========================

{
  "exam_title": "JLPT Practice Test Based on Video",
  "total_questions": 20,
  "sections": {
    "A_vocabulary": [
      {
        "question_text": "...",
        "jlpt_level": "N5 | N4 | N3",
        "options": ["A", "B", "C", "D"],
        "correct_answer": 0,
        "explanation": "..."
      }
    ],
    "B_grammar": [
      {
        "question_text": "...",
        "jlpt_level": "N5 | N4 | N3",
        "options": ["A", "B", "C", "D"],
        "correct_answer": 0,
        "explanation": "..."
      }
    ],
    "C_reading": [
      {
        "question_text": "...",
        "jlpt_level": "N5 | N4 | N3",
        "options": ["A", "B", "C", "D"],
        "correct_answer": 0,
        "explanation": "..."
      }
    ]
  }
}

Không dùng markdown.
Không thêm bất kỳ văn bản nào ngoài JSON.
`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { video_id, title, full_text } = await req.json();
    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_3"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_1")
    ].filter(Boolean);

    if (apiKeys.length === 0) throw new Error("No Groq API keys are configured.");

    console.log(`Generating video quiz using key rotation (${apiKeys.length} keys total)...`);

    let resultData = null;
    for (const apiKey of apiKeys) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Video: ${title}\n\nNội dung video:\n${full_text.substring(0, 15000)}` }
                ],
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
          console.error("Groq Key error in generate-video-quiz:", e);
      }
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (!resultData) throw new Error("AI quiz generation failed on all keys");
    
    // Standardize resultData from direct parsed content
    const parsedData = extractJSON(JSON.stringify(resultData));
    const questions = [];
    
    if (parsedData.sections) {
      const sectionMapping = {
        'A_vocabulary': 'vocabulary',
        'B_grammar': 'grammar',
        'C_reading': 'comprehension'
      };

      for (const [sectionKey, type] of Object.entries(sectionMapping)) {
        if (parsedData.sections[sectionKey] && Array.isArray(parsedData.sections[sectionKey])) {
          parsedData.sections[sectionKey].forEach(q => {
            questions.push({
              ...q,
              question_type: type,
              jlpt_level: q.jlpt_level || null
            });
          });
        }
      }
    }

    if (questions.length > 0) {
      const { error: quizError } = await supabase.from("video_questions").insert(
        questions.map(q => ({
          video_id,
          question_text: q.question_text,
          options: q.options,
          correct_answer: typeof q.correct_answer === 'number' ? q.correct_answer : parseInt(String(q.correct_answer)) || 0,
          explanation: q.explanation,
          question_type: q.question_type || 'comprehension',
          difficulty: q.jlpt_level || 'medium'
        }))
      );
      if (quizError) throw quizError;
    }

    return new Response(JSON.stringify({ success: true, count: questions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Quiz generation error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
