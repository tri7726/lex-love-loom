// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JINA_API = "https://api.jina.ai/v1/embeddings";

// ── Groq helper for Smart Chunking & Profile ──────────────────────────────────
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
          model: "llama-3.3-70b-versatile",
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
    } catch (e) {
      console.error("Groq error, trying next key:", e);
    }
  }
  return null;
}

// ── Jina AI Embedding helper ──────────────────────────────────────────────────
async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(JINA_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(Deno.env.get("JINA_API_KEY")
        ? { Authorization: `Bearer ${Deno.env.get("JINA_API_KEY")}` }
        : {}),
    },
    body: JSON.stringify({
      model: "jina-embeddings-v2-base-multilingual",
      input: [text],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jina AI error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

// ── PROMPTS ───────────────────────────────────────────────────────────────────
const SMART_CHUNK_PROMPT = `Bạn là chuyên gia sư phạm tiếng Nhật. Hãy trích xuất "học điểm cốt lõi" (learning atom) từ đoạn hội thoại dưới đây thành 1–3 câu súc tích bằng tiếng Việt.

Chỉ trích xuất: từ vựng/ngữ pháp được dạy, lỗi sai cụ thể, điểm người học còn yếu hoặc chưa hiểu.
NẾU không có điểm học thuật nào đáng kể, hãy trả về chính xác: SKIP

Hội thoại:`;

const PROFILE_PROMPT = `Bạn là chuyên gia sư phạm. Dựa trên các "học điểm" dưới đây từ lịch sử học tiếng Nhật của người dùng, hãy tạo một "Hồ sơ kiến thức" ngắn gọn bằng tiếng Việt theo đúng format sau:

LEVEL: [Ước tính trình độ: N5/N4/N3/N2/N1 hoặc "Sơ cấp/Trung cấp/Cao cấp"]
STRENGTHS: [Điểm mạnh: tối đa 3 mục]
WEAKNESSES: [Điểm yếu đang gặp: tối đa 5 mục, ưu tiên gần đây nhất]
RECENT_TOPICS: [Chủ đề đã học gần đây: tối đa 4 mục]
NEVER_LEARNED: [Chủ đề chưa từng được hỏi/học]
LEARNING_STYLE: [Nhận xét về phong cách học: thích lý thuyết/ví dụ/quiz/...]

Lịch sử học:`;

// ── Main serve ────────────────────────────────────────────────────────────────
serve(async (req) => {
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
    // ACTION: summarize_and_index — Priority 1: Smart Chunking
    // ══════════════════════════════════════════════════════════════
    if (action === "summarize_and_index") {
      if (!content) return err("content is required.", 400);

      // 1. Use Groq to extract the "learning atom" from raw conversation
      const learningAtom = await callGroq(SMART_CHUNK_PROMPT, content);

      if (!learningAtom || learningAtom.toUpperCase().includes("SKIP")) {
        console.log("No significant learning moment. Skipping indexing.");
        return ok({ success: true, skipped: true });
      }

      // 2. Embed the clean, summarized text — not the noisy raw conversation
      const embedding = await getEmbedding(learningAtom);

      // 3. Store the clean learning atom
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
    // ACTION: update_profile — Priority 2: User Knowledge Map
    // ══════════════════════════════════════════════════════════════
    if (action === "update_profile") {
      // 1. Fetch the last 30 learning atoms (non-profile entries)
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

      // 2. Format history for Groq
      const historyText = recentKnowledge
        .map((k, i) => `[${i + 1}] (${k.source_type}) ${k.content}`)
        .join("\n");

      // 3. Generate profile snapshot using Groq
      const profileSnapshot = await callGroq(PROFILE_PROMPT, historyText);
      if (!profileSnapshot) return err("Profile generation failed.");

      // 4. Embed the profile
      const embedding = await getEmbedding(profileSnapshot);

      // 5. Delete old profile entries (keep only the latest)
      await supabase
        .from("sensei_knowledge")
        .delete()
        .eq("user_id", user_id)
        .eq("source_type", "profile");

      // 6. Insert fresh profile
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
    // ACTION: index — Simple direct indexing (for mistake tracking)
    // ══════════════════════════════════════════════════════════════
    if (action === "index") {
      if (!content) return err("content is required.", 400);
      const embedding = await getEmbedding(content);
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
    // ACTION: retrieve — HyDE + Hybrid Search + Profile injection
    // ══════════════════════════════════════════════════════════════
    if (action === "retrieve") {
      if (!query) return err("query is required.", 400);

      // ── HyDE: Generate a hypothetical answer to improve embedding quality ──
      // This bridges the gap between short user questions and detailed knowledge entries
      const HYDE_PROMPT = `Bạn là gia sư tiếng Nhật. Hãy viết MỘT CÂU trả lời giả định cho câu hỏi sau bằng tiếng Việt. 
Chỉ trả lời ngắn gọn (1-2 câu), tập trung vào từ vựng/ngữ pháp liên quan. Không cần chính xác 100%.

Câu hỏi:`;

      let textToEmbed = query; // fallback: embed raw query

      try {
        const hydeAnswer = await callGroq(HYDE_PROMPT, query);
        if (hydeAnswer && hydeAnswer.length > 10) {
          // Combine original query + hypothetical answer for richer embedding
          textToEmbed = `${query}\n${hydeAnswer}`;
          console.log(`HyDE: "${query}" → "${hydeAnswer.slice(0, 80)}..."`);
        }
      } catch (e) {
        console.warn("HyDE generation failed, using raw query:", e);
      }

      // ── Parallel: Profile fetch + HyDE-enhanced embedding ──
      const [profileResult, queryEmbedding] = await Promise.all([
        supabase
          .from("sensei_knowledge")
          .select("content, source_type, metadata")
          .eq("user_id", user_id)
          .eq("source_type", "profile")
          .order("created_at", { ascending: false })
          .limit(1),
        getEmbedding(textToEmbed),
      ]);

      // ── Hybrid Search: Vector (70%) + Keyword (30%) + Time-weight ──
      // Try hybrid first, fall back to vector-only if hybrid function doesn't exist
      let similar = [];
      try {
        const { data: hybridData, error: hybridErr } = await supabase.rpc(
          "hybrid_match_sensei_knowledge",
          {
            query_embedding: queryEmbedding,
            query_text: query, // raw text for keyword matching (not HyDE)
            target_user_id: user_id,
            match_threshold: 0.40,
            match_count: 8,
          }
        );

        if (hybridErr) throw hybridErr;
        similar = hybridData || [];
        console.log(`Hybrid Search: ${similar.length} results for "${query.slice(0, 40)}"`);
      } catch (hybridFallbackErr) {
        // Fallback to vector-only if hybrid function not yet deployed
        console.warn("Hybrid search unavailable, falling back to vector-only:", hybridFallbackErr);
        const { data: vecData, error: vecErr } = await supabase.rpc(
          "match_sensei_knowledge",
          {
            query_embedding: queryEmbedding,
            target_user_id: user_id,
            match_threshold: 0.45,
            match_count: 6,
          }
        );
        if (vecErr) throw vecErr;
        similar = vecData || [];
      }

      // ── Deduplicate: Remove near-duplicate entries ──
      const seen = new Set();
      const deduped = similar.filter((c) => {
        if (c.source_type === "profile") return false; // handled separately
        // Simple dedup: first 60 chars of content as key
        const key = c.content.slice(0, 60).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 5);

      // ── Assemble: Profile first, then deduplicated results ──
      const context = [];
      if (profileResult.data && profileResult.data.length > 0) {
        context.push({
          ...profileResult.data[0],
          similarity: 1.0,
        });
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
