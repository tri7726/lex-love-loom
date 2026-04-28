// Supabase Edge Function: Sensei RAG — 100% Groq, no Gemini
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Groq helper with key rotation ────────────────────────────────
function getGroqKeys(): string[] {
  return [
    Deno.env.get("GROQ_API_KEY_1"),
    Deno.env.get("GROQ_API_KEY_2"),
    Deno.env.get("GROQ_API_KEY_3"),
  ].filter(Boolean) as string[];
}

async function callGroq(
  prompt: string,
  text: string,
  opts?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string | null> {
  const apiKeys = getGroqKeys();
  const model = opts?.model || "llama-3.1-8b-instant";
  const maxTokens = opts?.maxTokens || 300;
  const temperature = opts?.temperature ?? 0.2;

  for (const key of apiKeys) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: `${prompt}\n\n${text}` }],
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.choices || data.choices.length === 0) return null;
        return data.choices[0].message?.content?.trim() || null;
      }
      const errText = await res.text();
      console.warn(`Groq key failed (${res.status}): ${errText.slice(0, 200)}`);
    } catch (e) {
      console.error("Groq error, trying next key:", e);
    }
  }
  return null;
}

interface KnowledgeItem {
  content: string;
  source_type: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

interface ScoredItem extends KnowledgeItem {
  similarity: number;
}

// ── PROMPTS ───────────────────────────────────────────────────────
const SMART_CHUNK_PROMPT = `Bạn là chuyên gia sư phạm tiếng Nhật. Hãy trích xuất "học điểm cốt lõi" (learning atom) từ đoạn hội thoại dưới đây thành 1–3 câu súc tích bằng tiếng Việt.

Chỉ trích xuất: từ vựng/ngữ pháp được dạy, lỗi sai cụ thể, điểm người học còn yếu hoặc chưa hiểu.
NẾU không có điểm học thuật nào đáng kể, hãy trả về chính xác: SKIP

Hội thoại:`;

const PROFILE_PROMPT = `Bạn là chuyên gia sư phạm. Dựa trên các "học điểm" dưới đây từ lịch sử học tiếng Nhật của người dùng, hãy tạo một "Hồ sơ kiến thức" ngắn gọn bằng tiếng Việt theo đúng format sau:

LEVEL: [Ước tính trình độ: N5/N4/N3/N2/N1]
STRENGTHS: [Điểm mạnh: tối đa 3 mục]
WEAKNESSES: [Điểm yếu: tối đa 5 mục]
RECENT_TOPICS: [Chủ đề đã học gần đây: tối đa 4 mục]
LEARNING_STYLE: [Nhận xét về phong cách học]

Lịch sử học:`;

// ── Main serve ────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const ok = (body: unknown) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const err = (msg: string, status = 500) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();
    const { action, user_id, content, query, source_type, metadata } = body;

    if (!user_id) return err("user_id is required.", 400);

    // ══════════════════════════════════════════════════════════════
    // ACTION: summarize_and_index
    // ══════════════════════════════════════════════════════════════
    if (action === "summarize_and_index") {
      if (!content) return err("content is required.", 400);

      const learningAtom = await callGroq(SMART_CHUNK_PROMPT, content);

      if (!learningAtom || learningAtom.toUpperCase().includes("SKIP")) {
        console.log("No significant learning moment. Skipping indexing.");
        return ok({ success: true, skipped: true });
      }

      // Store without embedding — use keyword search (pg_trgm) instead
      const { error } = await supabase.from("sensei_knowledge").insert({
        user_id,
        content: learningAtom,
        source_type: source_type || "conversation",
        metadata: metadata || {},
      });

      if (error) throw error;
      return ok({ success: true, indexed: learningAtom });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: update_profile
    // ══════════════════════════════════════════════════════════════
    if (action === "update_profile") {
      const { data: recentKnowledge, error: fetchErr } = await supabase
        .from("sensei_knowledge")
        .select("content, source_type, created_at")
        .eq("user_id", user_id)
        .neq("source_type", "profile")
        .order("created_at", { ascending: false })
        .limit(30);

      if (fetchErr) throw fetchErr;

      if (!recentKnowledge || recentKnowledge.length < 3) {
        return ok({ success: true, skipped: true, reason: "Not enough data yet." });
      }

      const historyText = recentKnowledge
        .map((k: KnowledgeItem, i: number) => `[${i + 1}] (${k.source_type}) ${k.content}`)
        .join("\n");

      const profileSnapshot = await callGroq(PROFILE_PROMPT, historyText, {
        model: "llama-3.1-70b-versatile",
        maxTokens: 500,
      });
      if (!profileSnapshot) return err("Profile generation failed.");

      // Delete old profile
      await supabase
        .from("sensei_knowledge")
        .delete()
        .eq("user_id", user_id)
        .eq("source_type", "profile");

      const { error: insertErr } = await supabase.from("sensei_knowledge").insert({
        user_id,
        content: profileSnapshot,
        source_type: "profile",
        metadata: { generated_at: new Date().toISOString() },
      });

      if (insertErr) throw insertErr;
      return ok({ success: true, profile: profileSnapshot });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: index
    // ══════════════════════════════════════════════════════════════
    if (action === "index") {
      if (!content) return err("content is required.", 400);
      const { error } = await supabase.from("sensei_knowledge").insert({
        user_id,
        content,
        source_type: source_type || "mistake",
        metadata: metadata || {},
      });
      if (error) throw error;
      return ok({ success: true });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: retrieve — keyword search using pg_trgm similarity
    // ══════════════════════════════════════════════════════════════
    if (action === "retrieve") {
      if (!query) return err("query is required.", 400);

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from("sensei_knowledge")
        .select("content, source_type, metadata")
        .eq("user_id", user_id)
        .eq("source_type", "profile")
        .order("created_at", { ascending: false })
        .limit(1);

      // Keyword search: fetch recent entries and rank by text similarity
      const { data: allKnowledge } = await supabase
        .from("sensei_knowledge")
        .select("content, source_type, metadata, created_at")
        .eq("user_id", user_id)
        .neq("source_type", "profile")
        .order("created_at", { ascending: false })
        .limit(50);

      // Simple client-side relevance scoring
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter((w: string) => w.length > 1);

      const scored = (allKnowledge || []).map((item: KnowledgeItem) => {
        const contentLower = item.content.toLowerCase();
        let score = 0;

        // Exact substring match
        if (contentLower.includes(queryLower)) score += 5;

        // Word overlap
        for (const word of queryWords) {
          if (contentLower.includes(word)) score += 1;
        }

        // Recency boost
        const createdAt = item.created_at;
        const ageMs = createdAt ? Date.now() - new Date(createdAt as string).getTime() : 0;
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays < 7) score *= 1.3;
        else if (ageDays < 30) score *= 1.15;
        else if (ageDays > 90) score *= 0.85;

        return { ...item, similarity: score };
      });

      // Sort by score, take top 5
      scored.sort((a: ScoredItem, b: ScoredItem) => b.similarity - a.similarity);
      const topResults = scored.filter((s: ScoredItem) => s.similarity > 0).slice(0, 5);

      const context: Record<string, unknown>[] = [];
      if (profileData && profileData.length > 0) {
        context.push({ ...profileData[0], similarity: 1.0 });
      }
      context.push(...topResults);

      return ok({ context });
    }

    return err(`Invalid action: ${action}`, 400);
  } catch (error) {
    const errObj = error as Error;
    console.error("RAG function error:", errObj);
    return err(errObj.message || "Unknown error occurred");
  }
});
