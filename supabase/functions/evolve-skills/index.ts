// @ts-nocheck: suppressing standard TS errors in Deno edge function
// @ts-ignore Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Bạn là **EvoSkill AI** — một chuyên gia thiết kế bài học cá nhân hóa.
Nhiệm vụ của bạn là xem xét dữ liệu người dùng đang gặp khó khăn (từ vựng quên nhiều, điểm phát âm thấp, cấu trúc ngữ pháp sai) và đề xuất MỘT "Kỹ năng tiến hóa" (Evolved Skill) duy nhất dưới dạng nhiệm vụ đặc biệt.

Output format phải là JSON tuân thủ cấu trúc sau:
{
  "title": "Tên nhiệm vụ ngắn gọn, hấp dẫn (VD: Chinh phục trợ từ Ni)",
  "description": "Mô tả nhiệm vụ và lý do tại sao người dùng cần nó.",
  "type": "vocabulary" | "pronunciation" | "grammar",
  "challenge_data": {
    "questions": [
      {
        "question": "Câu hỏi trắc nghiệm hoặc thực hành",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "explanation": "Giải thích chi tiết bằng tiếng Việt"
      }
    ]
  },
  "xp_reward": number (từ 50 đến 150)
}

QUY TẮC:
- Dữ liệu 'challenge_data.questions' phải có 3-5 câu hỏi cụ thể giải quyết đúng vấn đề người dùng đang gặp.
- Chỉ trả về duy nhất một chuỗi định dạng JSON hợp lệ, không kèm theo văn bản nào khác.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_id } = await req.json();
    if (!user_id) throw new Error("Missing user_id");

    // Fetch poor performing flashcards
    const { data: flashcards } = await supabaseClient
      .from("flashcards")
      .select("word, reading, meaning, ease_factor")
      .eq("user_id", user_id)
      .lt("ease_factor", 1.8) // Low ease factor indicates difficulty
      .limit(10);

    // Prompt context
    let context = "Bạn học này đang học rất tốt. Hãy tạo một bài ôn tập từ vựng tổng hợp.";
    if (flashcards && flashcards.length > 0) {
      context = `Người dùng đang gặp khó khăn với các từ sau: ${JSON.stringify(flashcards)}. Hãy thiết kế một Skill Quest để giúp họ khắc phục.`;
    }

    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3"),
      Deno.env.get("GROQ_API_KEY"),
    ].filter(Boolean) as string[];

    // Use 8B for EvoSkill generation: high volume (14,400 req/day),
    // fast enough for JSON task generation, 70B as quality fallback
    const modelPriority = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];

    let groqData: Record<string, unknown> | null = null;
    outer: for (const model of modelPriority) {
      for (const apiKey of apiKeys) {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: context }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
          }),
        });
        if (groqRes.ok) {
          groqData = await groqRes.json() as Record<string, unknown>;
          console.log(`✅ EvoSkill generated with ${model}`);
          break outer;
        }
        const errText = await groqRes.text();
        console.warn(`EvoSkill: model ${model} / key failed: ${errText.slice(0, 80)}`);
      }
    }
    if (!groqData) throw new Error("All AI models failed to generate skill");
    const choices = groqData.choices as Array<Record<string, unknown>>;
    if (!choices || choices.length === 0) {
      throw new Error("AI failed to generate skill");
    }
    
    const message = choices[0].message as Record<string, unknown>;
    const content = message.content as string;
    const skillData = JSON.parse(content);

    // Insert into database
    const { data: insertedData, error: insertError } = await supabaseClient
      .from("user_evolved_skills")
      .insert({
        user_id,
        title: skillData.title,
        description: skillData.description,
        type: skillData.type,
        challenge_data: skillData.challenge_data,
        xp_reward: skillData.xp_reward || 50,
        status: 'discovered'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify(insertedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const err = error as Error;
    console.error("EvoSkill error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
