// @ts-nocheck: Deno edge function
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, createCorsResponse, CORS_HEADERS } from "../_shared/rate-limit.ts";
import { classifyIntent, callGroq } from "../_shared/ai-router.ts";

interface Message {
  role: "user" | "assistant";
  content: string | Record<string, unknown>[];
}

interface RAGContext {
  content: string;
  source_type: string;
  metadata: Record<string, unknown>;
  similarity?: number;
}

function hasConfidentContext(context: RAGContext[]): boolean {
  if (!context || context.length === 0) return false;
  const hasProfile = context.some((c: RAGContext) => c.source_type === 'profile');
  if (hasProfile) return true;
  const similarities = context.map((c: RAGContext) => c.similarity ?? 0);
  const maxSimilarity = similarities.length > 0 ? Math.max(...similarities) : 0;
  return maxSimilarity >= 0.58;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return createCorsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rl = await checkRateLimit(req, supabase, { tier: "critical", endpoint: "japanese-chat" });
    if (rl) return rl;

    const authHeader = req.headers.get("Authorization") ?? "";
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    const { messages, systemPrompt, user_id } = await req.json();
    if (user_id && authUser.id !== user_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    const lastUserMsg = messages.slice().reverse().find((m: Message) => m.role === 'user')?.content ?? '';
    const lastUserText = typeof lastUserMsg === 'string' ? lastUserMsg : "complex content";

    // ── AI ROUTER: Classify and Decide RAG ──
    const intent = classifyIntent(lastUserText);
    const shouldRetrieve = user_id && intent !== "TIER_LOW";
    
    let ragContextContent = "";
    if (shouldRetrieve) {
      try {
        const ragRes = await fetch(`${supabaseUrl}/functions/v1/sensei-rag`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "retrieve", user_id, query: lastUserText }),
        });

        if (ragRes.ok) {
          const { context } = await ragRes.json();
          if (hasConfidentContext(context as RAGContext[])) {
            const profileEntry = (context as RAGContext[]).find((c: RAGContext) => c.source_type === 'profile');
            const learningHistory = (context as RAGContext[]).filter((c: RAGContext) => c.source_type !== 'profile' && (c.similarity ?? 0) >= 0.52).slice(0, 4);

            if (profileEntry) ragContextContent += `\n\n👤 **Hồ sơ:**\n${profileEntry.content}`;
            if (learningHistory.length > 0) {
              ragContextContent += `\n\n📖 **Lịch sử học:**\n` + learningHistory.map((c: RAGContext) => `• [${c.source_type}] ${c.content}`).join("\n");
            }
          }
        }
      } catch (e) { console.error("RAG error:", e); }
    }

    const hasImage = messages.some((m: Message) => Array.isArray(m.content) && m.content.some((c: Record<string, unknown>) => c.type === 'image_url'));

    const SOCRATIC_INSTRUCTION = `\n🔍 **CHẾ ĐỘ THÁM TỬ (Socratic Mode)**: Gợi ý thay vì giải thích trực tiếp.`;
    const isSocraticMode = lastUserText.startsWith('[SOCRATIC_MODE]');
    
    const finalMessages = isSocraticMode 
      ? messages.map((m: Message) => m.role === 'user' && typeof m.content === 'string' && m.content.startsWith('[SOCRATIC_MODE]') 
          ? { ...m, content: m.content.replace('[SOCRATIC_MODE]', '').trim() } : m)
      : messages;

    const finalSystemPrompt = (systemPrompt || "Bạn là Sensei Pro Max.") + ragContextContent + (isSocraticMode ? SOCRATIC_INSTRUCTION : '');

    const groqRes = await callGroq(finalMessages, { tier: intent, hasImage, systemPrompt: finalSystemPrompt });

    if (groqRes && groqRes.body) {
      return new Response(groqRes.body, {
        headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
      });
    }

    return new Response(JSON.stringify({ error: "Sensei tạm thời bận. Hãy thử lại sau!" }), {
      status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Retry-After": "30" }
    });

  } catch (error) {
    console.error("Critical error:", error);
    return new Response(JSON.stringify({ error: "Có lỗi xảy ra. Vui lòng thử lại!" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
});
