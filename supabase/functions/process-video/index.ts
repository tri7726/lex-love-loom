// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const QUIZ_SYSTEM_PROMPT = `
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

const SEGMENT_SYSTEM_PROMPT = `
Bạn là chuyên gia ngôn ngữ Nhật Bản, chuyên phân tích video bài giảng.

NHIỆM VỤ:
Phân tích và dịch các đoạn hội thoại/văn bản tiếng Nhật sau đây sang tiếng Việt.
Xuất dữ liệu dưới dạng JSON có cấu trúc chính xác.

YÊU CẦU DỮ LIỆU:
1. "japanese_text": Câu tiếng Nhật gốc.
2. "vietnamese_text": Bản dịch tiếng Việt tự nhiên, chính xác.
3. "grammar_notes": Danh sách các điểm ngữ pháp quan trọng trong câu (point và explanation bằng tiếng Việt).
4. "vocabulary": Danh sách từ vựng quan trọng (word, reading, meaning bằng tiếng Việt).

ĐÁP ÁN TRẢ VỀ PHẢI LÀ JSON HỢP LỆ.
Định dạng:
{
  "segments": [
    {
      "segment_index": number,
      "japanese_text": "...",
      "vietnamese_text": "...",
      "grammar_notes": [{"point": "...", "explanation": "..."}],
      "vocabulary": [{"word": "...", "reading": "...", "meaning": "..."}]
    }
  ]
}
`;

async function callGroq(apiKey: string, prompt: string, title: string, isQuizBatch: boolean = false) {
  const currentSystemPrompt = isQuizBatch ? QUIZ_SYSTEM_PROMPT : SEGMENT_SYSTEM_PROMPT;
  
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "system",
          content: currentSystemPrompt
        }, {
          role: "user",
          content: `Video: ${title}\n\n${isQuizBatch ? "Nội dung video" : "Dữ liệu segments"}:\n${prompt}\n\n${isQuizBatch ? "HÃY TẠO ĐỀ THI JLPT (PHẢI TRẢ VỀ DẠNG JSON) DỰA TRÊN TOÀN BỘ NỘI DUNG TRÊN." : "HÃY PHÂN TÍCH VÀ TRẢ VỀ JSON CHO CÁC SEGMENTS NÀY."}`
        }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const resultText = data.choices[0]?.message?.content;
    if (!resultText) throw new Error("AI không trả về nội dung");
    
    const parsed = JSON.parse(resultText);
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
            questions.push({ 
              ...q, 
              question_type: type,
              jlpt_level: q.jlpt_level || null
            });
          });
        }
      }
      return { questions };
    }
    return parsed;
  } catch (e) {
    console.error("error in callGroq:", e);
    throw e;
  }
}

async function processVideoInBackground(
  supabase: SupabaseClient,
  videoId: string,
  title: string,
  subtitles: SubtitleSegment[],
  apiKey: string
) {
  console.log(`Background: Processing ${subtitles.length} segments using dedicated Groq Key`);
  
  const allSegments: ProcessedSegment[] = [];
  const fullText = subtitles.map(s => s.text).join(" ");
  
  // 1. Process segments in batches
  for (let i = 0; i < subtitles.length; i += BATCH_SIZE) {
    const batch = subtitles.slice(i, i + BATCH_SIZE);
    const prompt = batch.map((s, idx) => `[${i + idx}] ${s.text}`).join("\n");
    try {
      const result = await callGroq(apiKey, prompt, title);
      if (result.segments) allSegments.push(...result.segments);
    } catch (error) {
      console.error(`Error processing segments batch ${i}:`, error);
    }
  }

  // 2. Generate Quiz
  let quizQuestions: QuizQuestion[] = [];
  try {
    const quizResult = await callGroq(apiKey, fullText.substring(0, 5000), title, true);
    if (quizResult.questions) quizQuestions = quizResult.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
  }
  
  // 3. Insert results
  if (allSegments.length > 0) {
    const { error: segError } = await supabase.from("video_segments").insert(
      allSegments.map(seg => ({
        video_id: videoId,
        segment_index: subtitles[seg.segment_index]?.segment_index || seg.segment_index,
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
        correct_answer: typeof q.correct_answer === 'number' ? q.correct_answer : parseInt(String(q.correct_answer)) || 0,
        explanation: q.explanation,
        question_type: q.question_type || 'comprehension',
        difficulty: q.jlpt_level || 'medium'
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
    const apiKey = Deno.env.get("GROQ_API_KEY_3");
    
    if (!apiKey) throw new Error("GROQ_API_KEY_3 is not configured");

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
    EdgeRuntime.waitUntil(processVideoInBackground(supabase, videoSource.id, title, subtitles, apiKey));

    return new Response(JSON.stringify({ success: true, video_id: videoSource.id, processing: true }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
