// Supabase Edge Function: Sensei RAG
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Groq helper ──────────────────────────────────────────────────
async function callGroq(prompt: string, text: string): Promise<string | null> {
  const apiKeys = [
    Deno.env.get("GROQ_API_KEY_1"),
    Deno.env.get("GROQ_API_KEY_2"),
    Deno.env.get("GROQ_API_KEY_3"),
  ].filter(Boolean);

  for (const key of apiKeys) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: `${prompt}\n\n${text}` }],
          temperature: 0.2,
          max_tokens: 300,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.choices || data.choices.length === 0) return null;
        return data.choices[0].message?.content?.trim() || null;
      }
      await res.text(); // consume body
    } catch (e) {
      console.error("Groq error, trying next key:", e);
    }
  }
  return null;
}

// ── Gemini Embedding helper (replaces Jina — no extra API key needed) ──
async function getEmbedding(text: string): Promise<number[]> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text }] },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini Embedding error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.embedding.values;
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

      let embedding: number[];
      try {
        embedding = await getEmbedding(learningAtom);
      } catch (e) {
        console.error("Embedding failed, storing without vector:", e);
        // Store without embedding — still useful for keyword search
        const { error } = await supabase.from("sensei_knowledge").insert({
          user_id,
          content: learningAtom,
          source_type: source_type || "conversation",
          metadata: metadata || {},
        });
        if (error) throw error;
        return ok({ success: true, indexed: learningAtom, embedded: false });
      }

      const { error } = await supabase.from("sensei_knowledge").insert({
        user_id,
        content: learningAtom,
        embedding,
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
        .map((k: any, i: number) => `[${i + 1}] (${k.source_type}) ${k.content}`)
        .join("\n");

      const profileSnapshot = await callGroq(PROFILE_PROMPT, historyText);
      if (!profileSnapshot) return err("Profile generation failed.");

      let embedding: number[];
      try {
        embedding = await getEmbedding(profileSnapshot);
      } catch {
        // If embedding fails, skip profile update
        return err("Embedding generation failed for profile.");
      }

      await supabase
        .from("sensei_knowledge")
        .delete()
        .eq("user_id", user_id)
        .eq("source_type", "profile");

      const { error: insertErr } = await supabase.from("sensei_knowledge").insert({
        user_id,
        content: profileSnapshot,
        embedding,
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
      let embedding: number[];
      try {
        embedding = await getEmbedding(content);
      } catch {
        // Store without embedding
        const { error } = await supabase.from("sensei_knowledge").insert({
          user_id,
          content,
          source_type: source_type || "mistake",
          metadata: metadata || {},
        });
        if (error) throw error;
        return ok({ success: true, embedded: false });
      }
      const { error } = await supabase.from("sensei_knowledge").insert({
        user_id,
        content,
        embedding,
        source_type: source_type || "mistake",
        metadata: metadata || {},
      });
      if (error) throw error;
      return ok({ success: true });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: retrieve
    // ══════════════════════════════════════════════════════════════
    if (action === "retrieve") {
      if (!query) return err("query is required.", 400);

      let queryEmbedding: number[];
      try {
        queryEmbedding = await getEmbedding(query);
      } catch (e) {
        console.error("Embedding failed for retrieve:", e);
        return ok({ context: [] });
      }

      // Fetch profile separately
      const profileResult = await supabase
        .from("sensei_knowledge")
        .select("content, source_type, metadata")
        .eq("user_id", user_id)
        .eq("source_type", "profile")
        .order("created_at", { ascending: false })
        .limit(1);

      // Try hybrid search, fallback to vector-only
      let similar: Record<string, unknown>[] = [];
      try {
        const { data: hybridData, error: hybridErr } = await supabase.rpc(
          "hybrid_match_sensei_knowledge",
          {
            query_embedding: queryEmbedding,
            query_text: query,
            target_user_id: user_id,
            match_threshold: 0.40,
            match_count: 8,
          }
        );
        if (hybridErr) throw hybridErr;
        similar = hybridData || [];
      } catch {
        const { data: vecData, error: vecErr } = await supabase.rpc(
          "match_sensei_knowledge",
          {
            query_embedding: queryEmbedding,
            target_user_id: user_id,
            match_threshold: 0.45,
            match_count: 6,
          }
        );
        if (vecErr) console.error("Vector search also failed:", vecErr);
        similar = vecData || [];
      }

      // Deduplicate
      const seen = new Set();
      const deduped = similar.filter((c: Record<string, unknown>) => {
        if (c.source_type === "profile") return false;
        if (typeof c.content !== 'string') return false;
        const key = (c.content as string).slice(0, 60).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 5);

      const context: Record<string, unknown>[] = [];
      if (profileResult.data && profileResult.data.length > 0) {
        context.push({ ...profileResult.data[0], similarity: 1.0 });
      }
      context.push(...deduped);

      return ok({ context });
    }

    return err(`Invalid action: ${action}`, 400);
  } catch (error) {
    const errObj = error as Error;
    console.error("RAG function error:", errObj);
    return err(errObj.message || "Unknown error occurred");
  }
});
