import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      throw new Error("Lỗi cấu hình: GEMINI_API_KEY chưa được thiết lập trên Supabase.");
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    console.log(`Generating JLPT-style quiz for video: ${video_id}`);

    const body = {
      contents: [{
        role: "user",
        parts: [{
          text: `${SYSTEM_PROMPT}\n\nVideo: ${title}\n\nNội dung video:\n${full_text.substring(0, 15000)}\n\nLƯU Ý QUAN TRỌNG: Bạn PHẢI trả về JSON hợp lệ đúng định dạng yêu cầu.`
        }]
      }],
      generationConfig: { 
        response_mime_type: "application/json",
        temperature: 0.7,
        topP: 0.95
      }
    };

    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn("Gemini 2.0-flash failed, trying 1.5-flash...");
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Gemini API response received");
    
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      console.error("No content returned from AI:", JSON.stringify(data));
      throw new Error("AI không trả về nội dung");
    }

    let cleanJson = resultText;
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }
    
    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON parse error:", e);
      throw new Error("AI trả về định dạng JSON không hợp lệ");
    }
    
    // Flatten questions from sections
    const questions = [];
    if (parsed.sections) {
      const sectionMapping = {
        'A_vocabulary': 'vocabulary',
        'B_grammar': 'grammar',
        'C_reading': 'comprehension'
      };

      for (const [sectionKey, type] of Object.entries(sectionMapping)) {
        if (parsed.sections[sectionKey] && Array.isArray(parsed.sections[sectionKey])) {
          (parsed.sections[sectionKey] as any[]).forEach(q => {
            questions.push({
              ...q,
              question_type: type,
              jlpt_level: q.jlpt_level || null
            });
          });
        }
      }
    } else if (parsed.questions) {
      questions.push(...(Array.isArray(parsed.questions) ? parsed.questions : []));
    }

    console.log(`Successfully parsed ${questions.length} questions`);

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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    // Return 200 with error property so it avoids the generic "non-2xx" message in Supabase client
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      details: errorStack
    }), {
      status: 200, // Change to 200 to ensure we can read the JSON body
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
