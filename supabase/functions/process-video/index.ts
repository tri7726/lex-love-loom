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

const BATCH_SIZE = 15; // Process 15 segments at a time for faster response

const SYSTEM_PROMPT = `あなたは日本語教育の専門家です。YouTube動画の字幕を分析して、学習者向けのコンテンツを作成してください。

入力された字幕データを以下の形式のJSONで返してください:

{
  "segments": [
    {
      "segment_index": 0,
      "start_time": 0.0,
      "end_time": 3.5,
      "japanese_text": "元の日本語テキスト",
      "vietnamese_text": "ベトナム語訳",
      "grammar_notes": [
        {"point": "〜ている", "explanation": "Diễn tả trạng thái đang tiếp diễn"}
      ],
      "vocabulary": [
        {"word": "勉強", "reading": "べんきょう", "meaning": "học tập"}
      ]
    }
  ]
}

ルール:
1. 【重要】各セグメントは元の字幕のタイミングとインデックスをそのまま保持すること。字幕を統合しないでください！
2. 入力されたすべての字幕セグメントをそのまま処理すること（省略しない）
3. segment_indexは入力データの[番号]と一致させること
4. start_timeとend_timeは入力データの時間をそのまま使用すること
5. 文法ポイントはJLPT N5-N3レベルで重要なものを抽出（なければ空配列）
6. 語彙は初中級学習者にとって有用なものを抽出（なければ空配列）
7. ベトナム語訳は自然で分かりやすい表現を使用
8. JSONのみを返す（説明文は不要）`;

// Process a batch of subtitles with AI
async function processBatch(
  batch: SubtitleSegment[],
  startIndex: number,
  title: string,
  apiKey: string
): Promise<ProcessedSegment[]> {
  const subtitleText = batch.map((s, i) => 
    `[${startIndex + i}] ${s.start.toFixed(1)}-${s.end.toFixed(1)}: ${s.text}`
  ).join("\n");

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite", // Faster model for quicker processing
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `動画タイトル: ${title}\n\n字幕データ:\n${subtitleText}` },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error(`Batch ${startIndex} AI error:`, aiResponse.status, errorText);
    
    if (aiResponse.status === 429) {
      // Wait and retry on rate limit
      await new Promise(r => setTimeout(r, 2000));
      return processBatch(batch, startIndex, title, apiKey);
    }
    
    throw new Error(`AI API error: ${aiResponse.status}`);
  }

  const aiResult = await aiResponse.json();
  const aiContent = aiResult.choices?.[0]?.message?.content;
  
  if (!aiContent) {
    throw new Error("Empty AI response");
  }

  const parsed = JSON.parse(aiContent);
  return parsed.segments || [];
}

// Background processing function
async function processVideoInBackground(
  supabase: SupabaseClient,
  videoId: string,
  title: string,
  subtitles: SubtitleSegment[],
  apiKey: string
) {
  console.log(`Background: Processing ${subtitles.length} segments for video ${videoId}`);
  
  const allSegments: ProcessedSegment[] = [];
  const totalBatches = Math.ceil(subtitles.length / BATCH_SIZE);
  
  // Process in parallel batches (2 at a time to avoid rate limits)
  for (let i = 0; i < subtitles.length; i += BATCH_SIZE * 2) {
    const batch1 = subtitles.slice(i, i + BATCH_SIZE);
    const batch2 = subtitles.slice(i + BATCH_SIZE, i + BATCH_SIZE * 2);
    
    const promises: Promise<ProcessedSegment[]>[] = [];
    
    if (batch1.length > 0) {
      promises.push(processBatch(batch1, i, title, apiKey));
    }
    if (batch2.length > 0) {
      promises.push(processBatch(batch2, i + BATCH_SIZE, title, apiKey));
    }
    
    try {
      const results = await Promise.all(promises);
      results.forEach(segments => allSegments.push(...segments));
      
      const processedBatches = Math.min(Math.ceil((i + BATCH_SIZE * 2) / BATCH_SIZE), totalBatches);
      console.log(`Background: Processed ${processedBatches}/${totalBatches} batches`);
    } catch (error) {
      console.error(`Background: Error in batch starting at ${i}:`, error);
    }
  }
  
  if (allSegments.length === 0) {
    console.error("Background: No segments processed");
    return;
  }
  
  console.log(`Background: Inserting ${allSegments.length} segments`);
  
  // Insert segments into database
  const segmentsToInsert = allSegments.map((seg) => ({
    video_id: videoId,
    segment_index: seg.segment_index,
    start_time: seg.start_time,
    end_time: seg.end_time,
    japanese_text: seg.japanese_text,
    vietnamese_text: seg.vietnamese_text,
    grammar_notes: seg.grammar_notes || [],
    vocabulary: seg.vocabulary || [],
  }));

  const { error: segmentError } = await supabase
    .from("video_segments")
    .insert(segmentsToInsert);

  if (segmentError) {
    console.error("Background: Error inserting segments:", segmentError);
    return;
  }

  // Mark video as processed
  await supabase
    .from("video_sources")
    .update({ processed: true })
    .eq("id", videoId);

  console.log(`Background: Video ${videoId} processing complete!`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { youtube_id, title, subtitles } = await req.json() as {
      youtube_id: string;
      title: string;
      subtitles: SubtitleSegment[];
    };

    if (!youtube_id || !title || !subtitles?.length) {
      throw new Error("Missing required fields: youtube_id, title, subtitles");
    }

    console.log(`Processing video: ${youtube_id}, ${subtitles.length} segments`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Check if video already exists and is processed
    const { data: existingVideo } = await supabase
      .from("video_sources")
      .select("id, processed")
      .eq("youtube_id", youtube_id)
      .single();

    if (existingVideo?.processed) {
      console.log("Video already processed, returning existing data");
      return new Response(
        JSON.stringify({
          success: true,
          video_id: existingVideo.id,
          already_processed: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create or update video source entry
    const { data: videoSource, error: videoError } = await supabase
      .from("video_sources")
      .upsert({
        youtube_id,
        title,
        thumbnail_url: `https://img.youtube.com/vi/${youtube_id}/hqdefault.jpg`,
        processed: false,
        created_by: userId,
      }, { onConflict: "youtube_id" })
      .select()
      .single();

    if (videoError) {
      console.error("Error creating video source:", videoError);
      throw new Error(`Database error: ${videoError.message}`);
    }

    console.log("Video source created:", videoSource.id);

    // For small videos (< 20 segments), process immediately
    if (subtitles.length <= 20) {
      const segments = await processBatch(subtitles, 0, title, LOVABLE_API_KEY);
      
      const segmentsToInsert = segments.map((seg) => ({
        video_id: videoSource.id,
        segment_index: seg.segment_index,
        start_time: seg.start_time,
        end_time: seg.end_time,
        japanese_text: seg.japanese_text,
        vietnamese_text: seg.vietnamese_text,
        grammar_notes: seg.grammar_notes || [],
        vocabulary: seg.vocabulary || [],
      }));

      await supabase.from("video_segments").insert(segmentsToInsert);
      await supabase.from("video_sources").update({ processed: true }).eq("id", videoSource.id);

      return new Response(
        JSON.stringify({
          success: true,
          video_id: videoSource.id,
          segments_count: segments.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For larger videos, use background processing
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      processVideoInBackground(supabase, videoSource.id, title, subtitles, LOVABLE_API_KEY)
    );

    // Return immediately with processing status
    return new Response(
      JSON.stringify({
        success: true,
        video_id: videoSource.id,
        processing: true,
        estimated_time: Math.ceil(subtitles.length / BATCH_SIZE) * 3, // ~3 seconds per batch
        message: "Video đang được xử lý. Vui lòng đợi một chút rồi refresh trang.",
      }),
      {
        status: 202, // Accepted
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Process video error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
