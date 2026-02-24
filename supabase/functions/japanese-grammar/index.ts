// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `あなたは日本語の文法チェッカーです。
ユーザーが入力した日本語の文法をチェックし、以下のJSON形式で返答してください。
余計な解説や挨拶は一切含めないでください。JSONのみを返してください。

{
  "isCorrect": boolean, // 文法が正しいかどうか
  "corrected": "string", // 修正後の文章（正しい場合は元の文章）
  "explanation": "string", // 修正内容や文法ミスの解説（ベトナム語で）
  "rules": ["string"], // 関連する文法ルールのキーワード（日本語）
  "suggestions": ["string"] // 他の自然な言い回しの提案（日本語）
}

例：
入力：「私は学生います」
出力：
{
  "isCorrect": false,
  "corrected": "私は学生です",
  "explanation": "Bạn nên dùng 'です' để kết thúc câu danh từ. 'います' dùng cho sự tồn tại của người/động vật.",
  "rules": ["名詞文", "です・ます"],
  "suggestions": ["私は学生をしています"]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json() as { text: string };
    
    if (!text) {
      throw new Error("Text is required");
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0.2, // Low temperature for more predictable output
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Grammar check function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
