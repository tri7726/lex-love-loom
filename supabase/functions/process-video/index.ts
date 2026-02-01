import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
1. 各セグメントは元の字幕のタイミングを保持する
2. 短い字幕は意味のある単位に統合してもよい（最大10秒程度）
3. 文法ポイントはJLPT N5-N3レベルで重要なものを抽出
4. 語彙は初中級学習者にとって有用なものを抽出
5. ベトナム語訳は自然で分かりやすい表現を使用
6. JSONのみを返す（説明文は不要）`;

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

    // Create video source entry first
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

    // Format subtitles for AI processing
    const subtitleText = subtitles.map((s, i) => 
      `[${i}] ${s.start.toFixed(1)}-${s.end.toFixed(1)}: ${s.text}`
    ).join("\n");

    // Call AI to process subtitles
    console.log("Calling AI to process subtitles...");
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `動画タイトル: ${title}\n\n字幕データ:\n${subtitleText}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error("Empty AI response");
    }

    console.log("AI response received, parsing...");

    // Parse AI response
    let processedData: { segments: ProcessedSegment[] };
    try {
      processedData = JSON.parse(aiContent);
    } catch (e) {
      console.error("Failed to parse AI response:", aiContent);
      throw new Error("Invalid AI response format");
    }

    if (!processedData.segments?.length) {
      throw new Error("No segments in AI response");
    }

    console.log(`Parsed ${processedData.segments.length} segments`);

    // Insert segments into database
    const segmentsToInsert = processedData.segments.map((seg) => ({
      video_id: videoSource.id,
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
      console.error("Error inserting segments:", segmentError);
      throw new Error(`Failed to save segments: ${segmentError.message}`);
    }

    // Mark video as processed
    await supabase
      .from("video_sources")
      .update({ processed: true })
      .eq("id", videoSource.id);

    console.log("Video processing complete!");

    return new Response(
      JSON.stringify({
        success: true,
        video_id: videoSource.id,
        segments_count: processedData.segments.length,
      }),
      {
        status: 200,
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
