// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 15;

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

<<<<<<< HEAD
async function callGemini(apiKey: string, prompt: string, title: string, isQuizBatch: boolean = false) {
  const body = {
    contents: [{
      parts: [{
        text: `${SYSTEM_PROMPT}\n\nVideo: ${title}\n\nDữ liệu: ${prompt}\n\n${isQuizBatch ? "HÃY TẠO ĐỀ THI JLPT (PHẢI TRẢ VỀ DẠNG JSON) DỰA TRÊN TOÀN BỘ NỘI DUNG TRÊN." : "HÃY XỬ LÝ CÁC SEGMENTS NÀY."}`
      }]
    }],
    generationConfig: { response_mime_type: "application/json" }
  };

  let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
=======
async function callLovableAI(apiKey: string, prompt: string, title: string, isQuizBatch: boolean = false) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Video: ${title}\n\nDữ liệu: ${prompt}\n\n${isQuizBatch ? "HÃY TẠO 10-15 CÂU HỎI QUIZ DỰA TRÊN TOÀN BỘ NỘI DUNG TRÊN." : "HÃY XỬ LÝ CÁC SEGMENTS NÀY."}`
        }
      ],
      temperature: 0.3,
    }),
>>>>>>> e9c9650e9d597620c15788c8c8d8749bd92fcd4f
  });

  if (!response.ok) {
    console.warn("Gemini 2.0-flash failed in process-video, trying 1.5-flash...");
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Gateway error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
<<<<<<< HEAD
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) throw new Error("AI không trả về nội dung");
  
  let cleanJson = resultText.trim();
  const jsonMatch = resultText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanJson = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(cleanJson);
    if (isQuizBatch && parsed.sections) {
      const questions = [];
      const sectionMapping = {
        'A_vocabulary': 'vocabulary',
        'B_grammar': 'grammar',
        'C_reading': 'comprehension'
      };

      for (const [sectionKey, type] of Object.entries(sectionMapping)) {
        if (parsed.sections[sectionKey] && Array.isArray(parsed.sections[sectionKey])) {
          parsed.sections[sectionKey].forEach(q => {
            questions.push({ ...q, question_type: type });
          });
        }
      }
      return { questions };
    }
    return parsed;
  } catch (e) {
    console.error("JSON parse error in process-video:", e);
    throw e;
  }
=======
  const resultText = data.choices?.[0]?.message?.content;
  const cleaned = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
>>>>>>> e9c9650e9d597620c15788c8c8d8749bd92fcd4f
}

async function processVideoInBackground(supabase: SupabaseClient, videoId: string, title: string, subtitles: any[], apiKey: string) {
  console.log(`Background: Processing ${subtitles.length} segments`);
  
  const allSegments: any[] = [];
  const fullText = subtitles.map((s: any) => s.text).join(" ");
  
  for (let i = 0; i < subtitles.length; i += BATCH_SIZE) {
    const batch = subtitles.slice(i, i + BATCH_SIZE);
    const prompt = batch.map((s: any, idx: number) => `[${i + idx}] ${s.text}`).join("\n");
    try {
      const result = await callLovableAI(apiKey, prompt, title);
      if (result.segments) allSegments.push(...result.segments);
    } catch (error) {
      console.error(`Error processing segments batch ${i}:`, error);
    }
  }

  let quizQuestions: any[] = [];
  try {
    const quizResult = await callLovableAI(apiKey, fullText.substring(0, 10000), title, true);
    if (quizResult.questions) quizQuestions = quizResult.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
  }
  
  if (allSegments.length > 0) {
    const { error: segError } = await supabase.from("video_segments").insert(
      allSegments.map((seg: any) => ({
        video_id: videoId,
        segment_index: seg.segment_index,
        start_time: subtitles[seg.segment_index]?.start || 0,
        end_time: subtitles[seg.segment_index]?.end || 0,
        japanese_text: seg.japanese_text,
        vietnamese_text: seg.vietnamese_text,
        grammar_notes: seg.grammar_notes || [],
        vocabulary: seg.vocabulary || [],
      }))
    );
    if (segError) console.error("Error inserting segments:", segError);
  }

  if (quizQuestions.length > 0) {
    const { error: quizError } = await supabase.from("video_questions").insert(
      quizQuestions.map((q: any) => ({
        video_id: videoId,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        question_type: 'comprehension'
      }))
    );
    if (quizError) console.error("Error inserting quiz:", quizError);
  }

  await supabase.from("video_sources").update({ processed: true }).eq("id", videoId);
  console.log(`Video ${videoId} processing complete!`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { youtube_id, title, subtitles } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: existing } = await supabase.from("video_sources").select("id, processed").eq("youtube_id", youtube_id).single();
    if (existing?.processed) return new Response(JSON.stringify({ success: true, video_id: existing.id, already_processed: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: videoSource, error: vError } = await supabase.from("video_sources").upsert({
      youtube_id, title, thumbnail_url: `https://img.youtube.com/vi/${youtube_id}/hqdefault.jpg`, processed: false
    }, { onConflict: "youtube_id" }).select().single();

    if (vError) throw new Error(vError.message);

    // @ts-ignore
    EdgeRuntime.waitUntil(processVideoInBackground(supabase, videoSource.id, title, subtitles, LOVABLE_API_KEY));

    return new Response(JSON.stringify({ success: true, video_id: videoSource.id, processing: true }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
