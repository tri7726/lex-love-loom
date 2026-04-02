// Supabase Edge Function: Japanese Chat
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Message {
  role: "user" | "assistant";
  content: string | Record<string, unknown>[];
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
interface RAGContext {
  content: string;
  source_type: string;
  metadata: Record<string, unknown>;
  similarity?: number;
}

function hasConfidentContext(context: RAGContext[]): boolean {
  if (!context || context.length === 0) return false;

  // Profile entries are ALWAYS injected (they're user identity, not topic-match)
  const hasProfile = context.some((c: RAGContext) => c.source_type === 'profile');
  if (hasProfile) return true;

  // For non-profile entries, require at least one result with similarity >= 0.58
  const similarities = context.map((c: RAGContext) => c.similarity ?? 0);
  const maxSimilarity = similarities.length > 0 ? Math.max(...similarities) : 0;
  const isConfident = maxSimilarity >= 0.58;

  if (!isConfident) {
    console.log(`CRAG: Context rejected — max similarity ${maxSimilarity.toFixed(3)} < 0.58`);
  }
  return isConfident;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, user_id } = await req.json();
    const lastUserMessage = messages.slice().reverse().find((m: Message) => m.role === 'user')?.content ?? '';

    let ragContextContent = "";

    // ── ADAPTIVE RAG: Decide whether to retrieve ─────────────────
    const queryClass = classifyQuery(typeof lastUserMessage === 'string' ? lastUserMessage : "");
    const shouldRetrieve = user_id && queryClass === 'complex';

    console.log(`Query class: ${queryClass} | Retrieve: ${shouldRetrieve} | Msg: "${typeof lastUserMessage === 'string' ? lastUserMessage.slice(0, 40) : 'complex content'}"`);

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
          if (hasConfidentContext(context as RAGContext[])) {
            const profileEntry = (context as RAGContext[]).find((c: RAGContext) => c.source_type === 'profile');
            const learningHistory = (context as RAGContext[])
              .filter((c: RAGContext) => c.source_type !== 'profile' && (c.similarity ?? 0) >= 0.52)
              .slice(0, 4);

            if (profileEntry) {
              ragContextContent += `\n\n👤 **Hồ sơ kiến thức của người học:**\n${profileEntry.content}`;
            }

            if (learningHistory.length > 0) {
              ragContextContent +=
                `\n\n📖 **Lịch sử học liên quan (độ tương đồng cao):**\n` +
                learningHistory
                  .map((c: RAGContext) => `• [${c.source_type}] ${c.content}`)
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
      Deno.env.get("GROQ_API_KEY"),  // fallback: single key without number
    ].filter(Boolean);
    
    // Check if any message contains an image for model switching
    const hasImage = messages.some((m: Message) => 
      Array.isArray(m.content) && m.content.some((c: Record<string, unknown>) => c.type === 'image_url')
    );
    const model = hasImage ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

    if (apiKeys.length === 0) {
      // Graceful: return a message instead of crashing
      console.error("CRITICAL: No Groq API keys configured!");
      return new Response(
        JSON.stringify({ role: "assistant", content: "⚠️ Sensei đang bảo trì hệ thống AI. Vui lòng thử lại sau ít phút!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    async function streamGroq(msgs: Message[], sysPrompt: string) {
      for (const apiKey of apiKeys) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: model,
              messages: [{ role: "system", content: sysPrompt }, ...msgs],
              stream: true,
              temperature: 0.7,
              max_tokens: 1024,
            }),
          });
          if (response.ok) return response;
          const errText = await response.text();
          console.warn(`Groq key failed (${response.status}): ${errText.slice(0, 200)}`);
        } catch (e) {
          console.error("Groq fetch error:", e);
        }
      }
      return null;
    }

    const SOCRATIC_INSTRUCTION = `
🔍 **CHẾ ĐỘ THÁM TỬ (Socratic Mode) — ĐƯỢC BẬT**
Thay vì giải thích trực tiếp, hãy giúp người học TỰ KHÁM PHÁ câu trả lời bằng cách:
1. Đặt câu hỏi gợi ý: "Em nghĩ tại sao...?", "Nếu so với X, thì Y có điểm gì khác?"
2. Nếu người học trả lời đúng → xác nhận và khen ngợi
3. Nếu trả lời sai → gợi ý thêm, không nói thẳng đáp án
4. Nếu người học bỏ cuộc (nói "không biết", "chịu thua") → giải thích đầy đủ
Hãy dùng phong cách hỏi thân thiện, không phán xét.`;

    const isSocraticMode = lastUserMessage.startsWith('[SOCRATIC_MODE]');
    const finalMessages = isSocraticMode
      ? messages.map((m: Message) =>
          m.role === 'user' && typeof m.content === 'string' && m.content.startsWith('[SOCRATIC_MODE]')
            ? { ...m, content: m.content.replace('[SOCRATIC_MODE]', '').trim() }
            : m
        )
      : messages;

    const finalSystemPrompt = (systemPrompt || "Bạn là Sensei Pro Max.")
      + ragContextContent
      + (isSocraticMode ? SOCRATIC_INSTRUCTION : '');

    const groqRes = await streamGroq(finalMessages, finalSystemPrompt);

    if (groqRes && groqRes.body) {
      // Create a direct pass-through stream for SSE
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const reader = groqRes.body.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // Just pass through the raw chunks from Groq (already in SSE format)
            await writer.write(value);
          }
        } catch (e) {
          console.error("Streaming error:", e);
          const errorMsg = encoder.encode(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
          await writer.write(errorMsg);
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Fallback if no keys work
    return new Response(
      JSON.stringify({ role: "assistant", content: "Sensei tạm thời không thể trả lời. Có thể do giới hạn API. Hãy thử lại sau 1 phút nhé! 🌸" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Chat function CRITICAL error:", error);
    return new Response(
      JSON.stringify({ role: "assistant", content: "Có lỗi xảy ra với Sensei. Vui lòng thử lại! 🙏" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
