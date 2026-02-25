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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Routing grammar check to Lovable AI...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Check this Japanese text:\n\n${text}` },
        ],
        temperature: 0.1,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({
        isCorrect: true, corrected: text,
        explanation: "Hệ thống AI đang quá tải. Vui lòng thử lại sau.",
        rules: [], suggestions: [], engine: "rate-limited"
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "";

    if (!resultText || resultText === "{}") {
      return new Response(JSON.stringify({
        isCorrect: true, corrected: text,
        explanation: "AI không phản hồi. Vui lòng thử lại.",
        rules: [], suggestions: [], engine: "none"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cleanedText = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let result;
    try {
      result = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Parse failed for:", resultText);
      throw new Error("AI returned invalid JSON");
    }
    
    const validatedResult = {
      isCorrect: typeof result.isCorrect === 'boolean' ? result.isCorrect : true,
      corrected: result.corrected || text,
      explanation: result.explanation || "Không có giải thích.",
      rules: Array.isArray(result.rules) ? result.rules : [],
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      engine: "lovable-ai"
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
        corrected: "",
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
