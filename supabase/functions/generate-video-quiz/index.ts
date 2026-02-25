// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Bạn là chuyên gia giáo dục tiếng Nhật. Hãy tạo 10-15 câu hỏi trắc nghiệm khách quan dựa trên nội dung video được cung cấp.

YÊU CẦU:
1. Tạo 10-15 câu hỏi.
2. Mỗi câu hỏi có 4 lựa chọn, chỉ 1 đáp án đúng.
3. Câu hỏi tập trung vào hiểu nội dung, từ vựng và ngữ pháp có trong video (N5-N3).
4. Giải thích đáp án bằng tiếng Việt.

Định dạng JSON trả về:
{
  "questions": [
    {
      "question_text": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 2,
      "explanation": "..."
    }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { video_id, title, full_text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    console.log(`Generating quiz for video: ${video_id}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Video: ${title}\n\nNội dung video:\n${full_text.substring(0, 15000)}` }
        ],
        temperature: 0.3,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    
    if (!resultText) throw new Error("AI không trả về nội dung");

    const cleanJson = resultText.replace(/```json\n?/, "").replace(/```\n?$/, "").trim();
    const parsed = JSON.parse(cleanJson);
    const questions = parsed.questions || [];

    if (questions && questions.length > 0) {
      const { error: quizError } = await supabase.from("video_questions").insert(
        questions.map((q: any) => ({
          video_id,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          question_type: 'comprehension'
        }))
      );
      if (quizError) throw quizError;
    }

    return new Response(JSON.stringify({ success: true, count: questions?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Quiz generation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
