// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ══════════════════════════════════════════════════════════════
// ADAPTIVE RAG: Classify query complexity to skip retrieval
// for simple messages → saves ~200-400ms per simple turn
// ══════════════════════════════════════════════════════════════
function classifyQuery(message: string): 'simple' | 'complex' {
  if (!message) return 'simple';
  const t = message.trim();

  // Rule 1: Very short messages (< 12 chars) — greetings, single words
  if (t.length < 12) return 'simple';

  // Rule 2: Pure greeting patterns (Vietnamese, Japanese, English)
  const greetingPatterns = [
    /^(こんにちは|おはよう|こんばんは|ありがとう|お疲れ|よろしく|はじめまして|おやすみ)/,
    /^(chào|xin chào|cảm ơn|cám ơn|hi|hello|hey|oke|ok)/i,
    /^(vâng|được|đúng|sai|có|không|thôi|xong|tiếp tục|tiếp)$/i,
    /^(ありがとう|すみません|ごめん|はい|いいえ)/,
  ];
  if (greetingPatterns.some((p) => p.test(t))) return 'simple';

  // Rule 3: Single word / single kanji lookup (no clause structure)
  const wordCount = t.split(/[\s　、。，,!?！？]/g).filter(Boolean).length;
  const hasSentenceStructure = /[はがをにでものから]/.test(t) || t.includes('?') || t.includes('？') || t.includes('thế nào') || t.includes('tại sao') || t.includes('giải thích') || t.includes('nghĩa là');
  if (wordCount <= 2 && !hasSentenceStructure) return 'simple';

  // Rule 4: Chitchat — no Japanese grammar/learning keywords
  const learningKeywords = /ngữ pháp|từ vựng|kanji|hiragana|katakana|jlpt|n[12345]|particle|thể |mẫu câu|conjugat|keigo|passive|causative|conditional|て形|た形|ない形|る形|potential|volitional|imperative/i;
  const isAboutLearning = learningKeywords.test(t) || /[ぁ-ん]{3,}|[ァ-ン]{3,}|[一-龥]{2,}/.test(t);
  if (!isAboutLearning && t.length < 60) return 'simple';

  return 'complex';
}

// ══════════════════════════════════════════════════════════════
// CRAG: Validate that retrieved context is confident enough
// to inject. Prevents hallucination from low-relevance context.
// ══════════════════════════════════════════════════════════════
function hasConfidentContext(context: any[]): boolean {
  if (!context || context.length === 0) return false;

  // Profile entries are ALWAYS injected (they're user identity, not topic-match)
  const hasProfile = context.some((c) => c.source_type === 'profile');
  if (hasProfile) return true;

  // For non-profile entries, require at least one result with similarity >= 0.58
  const maxSimilarity = Math.max(...context.map((c) => c.similarity ?? 0));
  const isConfident = maxSimilarity >= 0.58;

  if (!isConfident) {
    console.log(`CRAG: Context rejected — max similarity ${maxSimilarity.toFixed(3)} < 0.58`);
  }
  return isConfident;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, user_id } = await req.json();
    const lastUserMessage = messages.slice().reverse().find((m) => m.role === 'user')?.content ?? '';

    let ragContextContent = "";

    // ── ADAPTIVE RAG: Decide whether to retrieve ─────────────────
    const queryClass = classifyQuery(lastUserMessage);
    const shouldRetrieve = user_id && queryClass === 'complex';

    console.log(`Query class: ${queryClass} | Retrieve: ${shouldRetrieve} | Msg: "${lastUserMessage.slice(0, 40)}"`);

    if (shouldRetrieve) {
      try {
        const ragRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/sensei-rag`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "retrieve", user_id, query: lastUserMessage }),
          }
        );

        if (ragRes.ok) {
          const { context } = await ragRes.json();

          // ── CRAG: Only inject if context is confident enough ──
          if (hasConfidentContext(context)) {
            const profileEntry = context.find((c) => c.source_type === 'profile');
            const learningHistory = context
              .filter((c) => c.source_type !== 'profile' && (c.similarity ?? 0) >= 0.52)
              .slice(0, 4); // max 4 relevant entries

            if (profileEntry) {
              ragContextContent += `\n\n👤 **Hồ sơ kiến thức của người học:**\n${profileEntry.content}`;
            }

            if (learningHistory.length > 0) {
              ragContextContent +=
                `\n\n📖 **Lịch sử học liên quan (độ tương đồng cao):**\n` +
                learningHistory
                  .map((c) => `• [${c.source_type}] ${c.content}`)
                  .join("\n");
            }

            if (ragContextContent) {
              ragContextContent +=
                "\n\n👉 **Hãy cá nhân hóa câu trả lời** dựa trên hồ sơ và lịch sử này. " +
                "Đừng nhắc lại toàn bộ thông tin trên — chỉ dùng để hiểu ngữ cảnh người học.";
            }
          }
          // CRAG: If context is not confident → ragContextContent stays "" → no injection
        }
      } catch (e) {
        console.error("RAG Retrieval skipped due to error:", e);
      }
    }

    // ── Groq LLM with key rotation ────────────────────────────────
    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3"),
    ].filter(Boolean);

    if (apiKeys.length === 0) throw new Error("No Groq API keys configured.");

    async function tryGroq(msgs: Message[], sysPrompt: string) {
      for (const apiKey of apiKeys) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "system", content: sysPrompt }, ...msgs],
              stream: false,
              temperature: 0.7,
              max_tokens: 1024,
            }),
          });
          if (response.ok) return response;
          console.warn(`Groq key failed: ${response.status}`);
        } catch (e) {
          console.error("Groq fetch error:", e);
        }
      }
      return null;
    }

    const finalSystemPrompt = (systemPrompt || "Bạn là Sensei Pro Max.") + ragContextContent;
    const groqRes = await tryGroq(messages, finalSystemPrompt);

    if (groqRes) {
      const data = await groqRes.json();
      return new Response(
        JSON.stringify(data.choices?.[0]?.message || { content: "Sensei đang suy nghĩ..." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("All Groq API keys failed.");
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
