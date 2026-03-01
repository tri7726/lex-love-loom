// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

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
  "explanation": "string", // 修正 nội dung hay lỗi ngữ pháp (bằng tiếng Việt)
  "rules": ["string"], // từ khóa quy tắc ngữ pháp liên quan (tiếng Nhật)
  "suggestions": ["string"] // các cách diễn đạt tự nhiên khác (tiếng Nhật)
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
}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let text = "";
    let preferredEngine = "gemini";
    try {
      const body = await req.json();
      text = body.text || "";
      preferredEngine = body.engine || "gemini";
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

    let resultText = "";
    let engineUsed = "none";

    // Helper for Groq
    async function tryGroq(text) {
      if (!GROQ_API_KEY) return null;
      console.log("Routing grammar check to Groq...");
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
          return data.choices?.[0]?.message?.content || null;
        }
        return null;
      } catch (e) {
        console.error("Groq grammar error:", e);
        return null;
      }
    }

    // Helper for Gemini
    async function tryGemini(text) {
      if (!GEMINI_API_KEY) return null;
      console.log("Routing grammar check to Gemini 2.0 Flash...");
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash",
          generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nCheck this Japanese text: ${text}`);
        return result.response.text();
      } catch (e) {
        console.error("Gemini grammar error:", e);
        return null;
      }
    }

    // Execution Logic: Groq First
    resultText = await tryGroq(text);
    if (resultText) {
      engineUsed = "groq";
    } else {
      console.log("Groq failed or key missing, trying Gemini as fallback...");
      resultText = await tryGemini(text);
      if (resultText) engineUsed = "gemini";
    }

    // Fallback if both fail
    if (!resultText || resultText === "{}") {
      return new Response(JSON.stringify({
        isCorrect: true,
        corrected: text,
        explanation: "AI không phản hồi hoặc thiếu API Key. Vui lòng kiểm tra cấu hình dự án.",
        rules: [],
        suggestions: [],
        engine: "none"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean and parse JSON
    const cleanedText = resultText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
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
      engine: engineUsed
    };

    return new Response(JSON.stringify(validatedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Grammar check error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal Server Error",
        isCorrect: true,
        corrected: text || "",
        explanation: "Hệ thống AI đang quá tải. Vui lòng thử lại sau.",
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
