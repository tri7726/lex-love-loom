// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `あなたは日本語を教える優しい先生です。以下のルールに従ってください：

1. 常に日本語で返答してください
2. ユーザーのレベルに合わせて、簡単な日本語から始めてください
3. 文法の間違いがあれば、優しく訂正してください
4. 新しい単語や表現を教える時は、読み方（ふりがな）と意味を一緒に説明してください
5. 会話を続けやすいように、質問を投げかけてください
6. 励ましの言葉を忘れずに！
7. 返答は短めに（2-3文程度）して、会話のリズムを保ってください

フォーマット：
- 日本語の返答
- [翻訳] ベトナム語訳
- [Tiếng Việt] (Nếu cần thiết)

例：
こんにちは！今日はどんな勉強をしましたか？
[翻訳] Xin chào! Hôm nay bạn đã học gì?`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, engine = "gemini" } = await req.json() as { 
      messages: Message[], 
      systemPrompt?: string,
      engine?: "gemini" | "groq"
    };
    
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    console.log(`Chat request - Initial preferred engine: ${engine}`);

    // Helper to call Groq (returns response or null)
    async function tryGroq(messages, systemPrompt) {
      if (!GROQ_API_KEY) return null;
      console.log("Attempting request with Groq API...");
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt || SYSTEM_PROMPT },
              ...messages,
            ],
            stream: true,
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Groq API error:", response.status, errorText);
          return null;
        }
        return response;
      } catch (e) {
        console.error("Groq fetch error:", e);
        return null;
      }
    }

    // Helper to call Gemini (returns response or null)
    async function tryGemini(messages, systemPrompt) {
      if (!GEMINI_API_KEY) return null;
      console.log("Attempting request with Gemini 2.0 Flash SDK...");
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const chat = model.startChat({
          history: messages.slice(0, -1).map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            maxOutputTokens: 1024,
          },
        });

        const lastMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessageStream(
          (systemPrompt || SYSTEM_PROMPT) + "\n\nUser message: " + lastMessage
        );

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            try {
              for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              }
              controller.close();
            } catch (e) {
              controller.error(e);
            }
          },
        });

        return new Response(stream, {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      } catch (e) {
        console.error("Gemini SDK error:", e);
        return null;
      }
    }

    // Main logic: Groq first, then Gemini fallback
    let finalResponse = null;

    if (engine === "groq" || engine === "gemini") {
      // First try the preferred one
      if (engine === "groq") {
        const groqRes = await tryGroq(messages, systemPrompt);
        if (groqRes) {
          finalResponse = new Response(groqRes.body, {
            headers: { 
              ...corsHeaders, 
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            },
          });
        } else {
          console.log("Groq failed, falling back to Gemini...");
          finalResponse = await tryGemini(messages, systemPrompt);
        }
      } else {
        // Preferred gemini
        const geminiRes = await tryGemini(messages, systemPrompt);
        if (geminiRes) {
          finalResponse = geminiRes;
        } else {
          console.log("Gemini failed, falling back to Groq...");
          const groqRes = await tryGroq(messages, systemPrompt);
          if (groqRes) {
            finalResponse = new Response(groqRes.body, {
              headers: { 
                ...corsHeaders, 
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
              },
            });
          }
        }
      }
    }

    if (finalResponse) return finalResponse;

    throw new Error("No AI engine configured or all failed");
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
