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
    let text = "";
    try {
      const body = await req.json();
      text = body.text || "";
    } catch (e) {
      console.error("Error parsing request body:", e);
    }
    
    if (!text) {
      return new Response(JSON.stringify({ 
        isCorrect: true,
        corrected: "",
        explanation: "Vui lòng nhập văn bản để kiểm tra.",
        rules: [],
        suggestions: []
      }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // Smart routing: Use Gemini for longer texts or if Groq is likely to struggle
    const isLongText = text.length > 100;
    const useGemini = !!GEMINI_API_KEY && (isLongText || req.headers.get("x-ai-engine") === "gemini");

    let resultText = "";
    let engine = "groq";

    if (useGemini) {
      engine = "gemini";
      console.log("Routing grammar check to Gemini...");
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: SYSTEM_PROMPT },
              { text: `Check this Japanese text:\n\n${text}` }
            ]
          }],
          generationConfig: { response_mime_type: "application/json" }
        }),
      });

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      } else {
        console.error("Gemini API failed, falling back to Groq...");
        engine = "groq";
      }
    }

    if (!resultText && GROQ_API_KEY) {
      console.log("Routing grammar check to Groq...");
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
          temperature: 0.1,
          max_tokens: 2048,
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        resultText = data.choices?.[0]?.message?.content || "{}";
      } else {
        const errorText = await response.text();
        console.error("Groq API error:", response.status, errorText);
        throw new Error(`AI API error: ${response.status}`);
      }
    }

    // Clean and parse JSON
    const cleanedText = resultText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    const result = JSON.parse(cleanedText);
    
    const validatedResult = {
      isCorrect: typeof result.isCorrect === 'boolean' ? result.isCorrect : true,
      corrected: result.corrected || text,
      explanation: result.explanation || "Không có giải thích.",
      rules: Array.isArray(result.rules) ? result.rules : [],
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      engine
    };

    return new Response(JSON.stringify(validatedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Grammar check function technical error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal Server Error",
        isCorrect: true,
        corrected: text || "",
        explanation: "Hệ thống AI đang quá tải. Vui lòng thử lại sau giây lát.",
        rules: [],
        suggestions: []
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
