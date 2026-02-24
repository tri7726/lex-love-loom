// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

interface ProcessedSegment {
  segment_index: number;
  start_time: number;
  end_time: number;
  japanese_text: string;
  vietnamese_text: string;
  grammar_notes: Array<{ point: string; explanation: string }>;
  vocabulary: Array<{ word: string; reading: string; meaning: string }>;
}

interface QuizQuestion {
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

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

async function callGemini(apiKey: string, prompt: string, title: string, isQuizBatch: boolean = false) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${SYSTEM_PROMPT}\n\nVideo: ${title}\n\nDữ liệu: ${prompt}\n\n${isQuizBatch ? "HÃY TẠO 10-15 CÂU HỎI QUIZ DỰA TRÊN TOÀN BỘ NỘI DUNG TRÊN." : "HÃY XỬ LÝ CÁC SEGMENTS NÀY."}`
        }]
      }],
      generationConfig: { response_mime_type: "application/json" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(resultText);
}

async function processVideoInBackground(
  supabase: SupabaseClient,
  videoId: string,
  title: string,
  subtitles: SubtitleSegment[],
  apiKey: string
) {
  console.log(`Background: Processing ${subtitles.length} segments`);
  
  const allSegments: ProcessedSegment[] = [];
  const fullText = subtitles.map(s => s.text).join(" ");
  
  // 1. Process segments in batches
  for (let i = 0; i < subtitles.length; i += BATCH_SIZE) {
    const batch = subtitles.slice(i, i + BATCH_SIZE);
    const prompt = batch.map((s, idx) => `[${i + idx}] ${s.text}`).join("\n");
    try {
      const result = await callGemini(apiKey, prompt, title);
      if (result.segments) allSegments.push(...result.segments);
    } catch (error) {
      console.error(`Error processing segments batch ${i}:`, error);
    }
  }

  // 2. Generate Quiz (using the sample of context if too long)
  let quizQuestions: QuizQuestion[] = [];
  try {
    const quizResult = await callGemini(apiKey, fullText.substring(0, 10000), title, true);
    if (quizResult.questions) quizQuestions = quizResult.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
  }
  
  // 3. Insert results
  if (allSegments.length > 0) {
    const { error: segError } = await supabase.from("video_segments").insert(
      allSegments.map(seg => ({
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
      quizQuestions.map(q => ({
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Check existing
    const { data: existing } = await supabase.from("video_sources").select("id, processed").eq("youtube_id", youtube_id).single();
    if (existing?.processed) return new Response(JSON.stringify({ success: true, video_id: existing.id, already_processed: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Create entry
    const { data: videoSource, error: vError } = await supabase.from("video_sources").upsert({
      youtube_id, title, thumbnail_url: `https://img.youtube.com/vi/${youtube_id}/hqdefault.jpg`, processed: false
    }, { onConflict: "youtube_id" }).select().single();

    if (vError) throw new Error(vError.message);

    // Process in background
    // @ts-ignore
    EdgeRuntime.waitUntil(processVideoInBackground(supabase, videoSource.id, title, subtitles, GEMINI_API_KEY));

    return new Response(JSON.stringify({ success: true, video_id: videoSource.id, processing: true }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
