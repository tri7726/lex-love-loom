// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { messages, systemPrompt } = await req.json() as { messages: Message[], systemPrompt?: string };
    
    // Use standard OpenAI-compatible Groq API
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    console.log("Sending request to Groq API...");
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
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
      throw new Error(`Groq API error: ${response.status}`);
    }

    // Proxy the stream directly
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });

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
