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

// ── Cooldown: only generate one new skill every 6 hours per user ───────────
const COOLDOWN_HOURS = 6;

// ── Skill types supported by DB CHECK constraint ──────────────────────────
const VALID_TYPES = ["vocabulary", "pronunciation", "grammar"] as const;
type SkillType = typeof VALID_TYPES[number];

const SYSTEM_PROMPT = `Bạn là **EvoSkill AI** — chuyên gia thiết kế bài học cá nhân hóa cho người học tiếng Nhật.
Nhiệm vụ: Phân tích dữ liệu điểm yếu của người dùng và tạo ra MỘT "Kỹ năng tiến hóa" (Evolved Skill Quest) tối ưu.

Trả về JSON hợp lệ theo đúng cấu trúc sau (không thêm bất kỳ văn bản nào khác):
{
  "title": "Tên nhiệm vụ ngắn gọn, hấp dẫn (VD: Chinh phục trợ từ に)",
  "description": "Mô tả nhiệm vụ và lý do người dùng cần ôn lại (tiếng Việt, 1-2 câu).",
  "type": "vocabulary" | "pronunciation" | "grammar",
  "difficulty": "easy" | "medium" | "hard",
  "challenge_data": {
    "questions": [
      {
        "question": "Câu hỏi hoặc bài tập cụ thể",
        "options": ["A. lựa chọn", "B. lựa chọn", "C. lựa chọn", "D. lựa chọn"],
        "correct_answer": "A. lựa chọn",
        "explanation": "Giải thích chi tiết tại sao đáp án này đúng (tiếng Việt)"
      }
    ],
    "focus_words": ["Danh sách từ/cấu trúc được ôn tập trong quest này"]
  },
  "xp_reward": 75
}

QUY TẮC BẮT BUỘC:
- "challenge_data.questions" phải có ĐÚNG 4 câu hỏi, mỗi câu có đúng 4 lựa chọn A, B, C, D.
- "correct_answer" phải khớp CHÍNH XÁC với một trong 4 giá trị trong "options".
- "type" phải là một trong: "vocabulary", "pronunciation", "grammar".
- "difficulty" phải là một trong: "easy", "medium", "hard".
- "xp_reward" phải là số nguyên từ 50 đến 200.
- Nội dung câu hỏi phải giải quyết ĐÚNG điểm yếu được phân tích, không tạo câu hỏi chung chung.
- Chỉ trả về chuỗi JSON thuần túy, không thêm markdown code block.`;

// ── Validate AI-generated skill structure before inserting ───────────────
function validateSkillData(data: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!data.title || typeof data.title !== "string") return { valid: false, error: "Missing or invalid title" };
  if (!data.description || typeof data.description !== "string") return { valid: false, error: "Missing description" };
  if (!VALID_TYPES.includes(data.type as SkillType)) return { valid: false, error: `Invalid type: ${data.type}` };

  const cd = data.challenge_data as Record<string, unknown> | undefined;
  if (!cd || !Array.isArray(cd.questions)) return { valid: false, error: "Missing challenge_data.questions" };
  if (cd.questions.length < 3) return { valid: false, error: "Need at least 3 questions" };

  for (const q of cd.questions as Record<string, unknown>[]) {
    if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
      return { valid: false, error: "Question missing required fields" };
    }
    if (!q.correct_answer) return { valid: false, error: "Question missing correct_answer" };
    if (!q.explanation) return { valid: false, error: "Question missing explanation" };
  }

  const xp = Number(data.xp_reward);
  if (isNaN(xp) || xp < 50 || xp > 200) return { valid: false, error: "xp_reward out of range (50-200)" };

  return { valid: true };
}

// ── Calculate XP reward based on weakness severity ────────────────────────
function computeXpReward(avgEaseFactor: number, mistakeCount: number): number {
  // Lower ease_factor = harder = more XP. More mistakes = more XP.
  let base = 75;
  if (avgEaseFactor < 1.3) base = 150; // Very hard
  else if (avgEaseFactor < 1.6) base = 120; // Hard
  else if (avgEaseFactor < 1.9) base = 90; // Medium
  const bonus = Math.min(mistakeCount * 5, 50);
  return Math.min(base + bonus, 200);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { user_id, force = false } = body;
    if (!user_id) throw new Error("Missing user_id");

    // ── 1. Cooldown check ────────────────────────────────────────────────
    if (!force) {
      const cooldownCutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
      const { data: recentSkills } = await supabaseClient
        .from("user_evolved_skills")
        .select("id, created_at, type")
        .eq("user_id", user_id)
        .gte("created_at", cooldownCutoff)
        .limit(1);

      if (recentSkills && recentSkills.length > 0) {
        const nextAllowed = new Date(new Date(recentSkills[0].created_at).getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
        return new Response(
          JSON.stringify({
            error: "cooldown",
            message: `EvoSkill đang hồi chiêu. Có thể tạo skill mới lúc ${nextAllowed.toISOString()}.`,
            next_available_at: nextAllowed.toISOString(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }
    }

    // ── 2. Find recently mastered skill types to avoid duplicates ─────────
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentMastered } = await supabaseClient
      .from("user_evolved_skills")
      .select("type")
      .eq("user_id", user_id)
      .eq("status", "mastered")
      .gte("created_at", oneDayAgo);

    const recentlyMasteredTypes = new Set((recentMastered || []).map((s: { type: string }) => s.type));

    // ── 3. Multi-source weakness data collection ─────────────────────────

    // 3a. Flashcards hard to remember (low ease_factor)
    const { data: hardFlashcards } = await supabaseClient
      .from("flashcards")
      .select("word, reading, meaning, ease_factor, repetitions, jlpt_level")
      .eq("user_id", user_id)
      .lt("ease_factor", 2.0)
      .order("ease_factor", { ascending: true })
      .limit(15);

    // 3b. Recent mistakes from sensei_knowledge
    const { data: mistakes } = await supabaseClient
      .from("sensei_knowledge")
      .select("content, metadata, created_at")
      .eq("user_id", user_id)
      .eq("source_type", "mistake")
      .order("created_at", { ascending: false })
      .limit(10);

    // 3c. Recent XP activity to understand what user has been doing
    const { data: recentActivity } = await supabaseClient
      .from("xp_events")
      .select("source, amount, metadata, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(20);

    // ── 4. Analyze weakness depth ────────────────────────────────────────
    const flashcards = hardFlashcards || [];
    const mistakeList = mistakes || [];

    const avgEaseFactor = flashcards.length > 0
      ? flashcards.reduce((sum: number, f: { ease_factor: number }) => sum + (f.ease_factor || 2.5), 0) / flashcards.length
      : 2.5;

    const suggestedXp = computeXpReward(avgEaseFactor, mistakeList.length);

    // Filter preferred skill type: avoid recently mastered types
    const availableTypes = VALID_TYPES.filter(t => !recentlyMasteredTypes.has(t));
    const preferredType = availableTypes[0] ?? "vocabulary"; // fallback

    // ── 5. Build rich context prompt ─────────────────────────────────────
    let context: string;

    if (flashcards.length === 0 && mistakeList.length === 0) {
      context = `Người dùng đang học tốt và chưa có điểm yếu rõ ràng. Hãy tạo một Skill Quest ôn tập từ vựng tổng hợp thú vị với difficulty="easy".
Hoạt động gần đây: ${JSON.stringify(recentActivity?.slice(0, 5) || [])}.
Đề nghị type="${preferredType}", xp_reward=${suggestedXp}.`;
    } else {
      context = `## Phân tích điểm yếu của người dùng:

**Flashcards khó nhớ nhất** (ease_factor thấp = khó):
${JSON.stringify(flashcards.slice(0, 10))}

**Lỗi sai gần đây:**
${JSON.stringify(mistakeList.slice(0, 8))}

**Avg ease_factor:** ${avgEaseFactor.toFixed(2)} (ngưỡng bình thường là 2.5)

**Hoạt động học gần đây:**
${JSON.stringify(recentActivity?.slice(0, 5) || [])}

**Yêu cầu:** Tạo một Skill Quest tập trung vào "${preferredType}" để khắc phục những điểm yếu trên.
Đề nghị xp_reward=${suggestedXp}. Difficulty phù hợp với avg ease_factor.`;
    }

    // ── 6. Call Groq AI with multi-key + multi-model fallback ─────────────
    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3"),
      Deno.env.get("GROQ_API_KEY"),
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) throw new Error("No Groq API keys configured");

    // 8B for speed + quota, 70B as quality fallback
    const modelPriority = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];

    let groqData: Record<string, unknown> | null = null;
    let usedModel = "";

    outer: for (const model of modelPriority) {
      for (const apiKey of apiKeys) {
        try {
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
                { role: "user", content: context },
              ],
              response_format: { type: "json_object" },
              temperature: 0.6,
              max_tokens: 1500,
            }),
          });

          if (groqRes.ok) {
            groqData = await groqRes.json() as Record<string, unknown>;
            usedModel = model;
            console.log(`✅ EvoSkill: AI responded with model=${model}`);
            break outer;
          }

          const errText = await groqRes.text();
          console.warn(`EvoSkill: ${model} / key failed (${groqRes.status}): ${errText.slice(0, 100)}`);
        } catch (fetchErr) {
          console.warn(`EvoSkill: fetch error for ${model}:`, fetchErr);
        }
      }
    }

    if (!groqData) throw new Error("All AI models and API keys exhausted");

    // ── 7. Parse and validate AI output ──────────────────────────────────
    const choices = groqData.choices as Array<Record<string, unknown>>;
    if (!choices || choices.length === 0) throw new Error("AI returned no choices");

    const message = choices[0].message as Record<string, unknown>;
    const rawContent = message.content as string;

    let skillData: Record<string, unknown>;
    try {
      skillData = JSON.parse(rawContent);
    } catch {
      // Try to extract JSON from markdown code block if AI ignored instructions
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        skillData = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error(`AI returned non-JSON content: ${rawContent.slice(0, 200)}`);
      }
    }

    // Sanitize type field
    if (!VALID_TYPES.includes(skillData.type as SkillType)) {
      console.warn(`EvoSkill: AI returned invalid type "${skillData.type}", defaulting to "${preferredType}"`);
      skillData.type = preferredType;
    }

    // Clamp xp_reward
    const xpRaw = Number(skillData.xp_reward);
    skillData.xp_reward = isNaN(xpRaw) ? suggestedXp : Math.min(Math.max(xpRaw, 50), 200);

    // Validate structure
    const validation = validateSkillData(skillData);
    if (!validation.valid) {
      throw new Error(`AI output failed validation: ${validation.error}`);
    }

    // ── 8. Insert into database ───────────────────────────────────────────
    const { data: insertedSkill, error: insertError } = await supabaseClient
      .from("user_evolved_skills")
      .insert({
        user_id,
        title: String(skillData.title).slice(0, 200),
        description: String(skillData.description).slice(0, 1000),
        type: skillData.type as string,
        challenge_data: skillData.challenge_data,
        xp_reward: skillData.xp_reward as number,
        status: "discovered",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`✅ EvoSkill inserted: id=${insertedSkill.id}, type=${skillData.type}, xp=${skillData.xp_reward}, model=${usedModel}`);

    return new Response(
      JSON.stringify({
        ...insertedSkill,
        _meta: {
          model: usedModel,
          avg_ease_factor: avgEaseFactor.toFixed(2),
          weakness_sources: {
            hard_flashcards: flashcards.length,
            recent_mistakes: mistakeList.length,
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const err = error as Error;
    const isCooldown = err.message === "cooldown";
    console.error("EvoSkill error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isCooldown ? 429 : 400,
      }
    );
  }
});
