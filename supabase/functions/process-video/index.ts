// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 15;

const SYSTEM_PROMPT = `Bạn là chuyên gia giáo dục tiếng Nhật. Hãy phân tích nội dung video và tạo dữ liệu học tập chi tiết.

YÊU CẦU CHO SEGMENTS:
Phân tích từng đoạn phụ đề, dịch sang tiếng Việt và trích xuất từ vựng/ngữ pháp (N5-N3).
Giữ nguyên segment_index và thời gian.

YÊU CẦU CHO QUIZ (Chỉ tạo khi được yêu cầu):
Tạo 10-15 câu hỏi trắc nghiệm khách quan dựa trên nội dung video.
Mỗi câu hỏi có 4 lựa chọn, chỉ 1 đáp án đúng.
Giải thích đáp án bằng tiếng Việt.

Định dạng JSON trả về:
{
  "segments": [
    {
      "segment_index": 0,
      "start_time": 0.0,
      "end_time": 3.5,
      "japanese_text": "...",
      "vietnamese_text": "...",
      "grammar_notes": [{"point": "...", "explanation": "..."}],
      "vocabulary": [{"word": "...", "reading": "...", "meaning": "..."}]
    }
  ],
  "questions": [
    {
      "question_text": "...",
      "options": ["...", "...", "...", "..."],
      "correct_answer": 0,
      "explanation": "..."
    }
  ]
}`;

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
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Gateway error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const resultText = data.choices?.[0]?.message?.content;
  const cleaned = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
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
