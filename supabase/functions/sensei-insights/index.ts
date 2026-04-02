import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Bạn là **Sensei Intelligence** — một chuyên gia phân tích dữ liệu giáo dục đẳng cấp cao.
Nhiệm vụ của bạn là phân tích dữ liệu học tập của người dùng và đưa ra báo cáo thông minh.

Dữ liệu đầu vào sẽ bao gồm:
1. Danh sách flashcards và các chỉ số SRS (ease_factor, repetitions, interval).
2. Lịch sử các lỗi sai gần đây.

Hãy trả về một JSON cấu trúc sau:
{
  "performance_summary": "Tóm tắt hiệu suất học tập trong 1 câu (Tiếng Việt).",
  "predicted_readiness": number (0-100, dự báo % sẵn sàng cho kỳ thi JLPT ở cấp độ hiện tại),
  "jlpt_forecast": "Lời khuyên chiến lược để đạt mục tiêu JLPT (Tiếng Việt).",
  "weak_areas": [
    { "type": "Kanji / Grammar / Vocab", "content": "Nội dung yếu", "reason": "Tại sao yếu? (Tiếng Việt)" }
  ],
  "focus_recommendations": ["3 hành động cụ thể cần làm ngay (Tiếng Việt)"]
}

QUY TẮC:
- Trình bày chuyên nghiệp, ân cần nhưng khách quan.
- Dựa trên chỉ số ease_fator < 1.3 để xác định điểm yếu nghiêm trọng.
- Trả về DUY NHẤT mã JSON.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_id } = await req.json();
    if (!user_id) throw new Error("Missing user_id");

    // 1. Fetch Flashcard Stats
    const { data: flashcards, error: flError } = await supabaseClient
      .from("flashcards")
      .select("word, meaning, ease_factor, repetitions, interval, jlpt_level")
      .eq("user_id", user_id);

    if (flError) throw flError;

    // 2. Fetch Mistakes from sensei_knowledge
    const { data: mistakes, error: _misError } = await supabaseClient
      .from("sensei_knowledge")
      .select("content, metadata, created_at")
      .eq("user_id", user_id)
      .eq("source_type", "mistake")
      .order("created_at", { ascending: false })
      .limit(10);

    // ── Groq API Logic ──────────────────────────────────────────
    const apiKey = Deno.env.get("GROQ_API_KEY_1") || Deno.env.get("GROQ_API_KEY");
    
    const userContext = `
      Data Flashcards: ${JSON.stringify(flashcards?.slice(0, 50) || [])} 
      (Tổng số: ${flashcards?.length || 0})
      Gần đây hay sai: ${JSON.stringify(mistakes || [])}
    `;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Hãy phân tích dữ liệu này: ${userContext}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      }),
    });

    const groqData = await groqRes.json() as Record<string, unknown>;
    const choices = groqData.choices as Array<Record<string, unknown>>;
    if (!choices || choices.length === 0) {
      throw new Error("Groq AI failed to generate response: No choices found");
    }
    
    const message = choices[0].message as Record<string, unknown>;
    const content = message.content as string;
    const result = JSON.parse(content) as Record<string, unknown>;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const err = error as Error;
    console.error("Insights error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
