// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHECK_PROMPT = `あなたは日本語の文法チェッカーです。
ユーザーが入力した日本語の文法をチェックし、以下のJSON形式で返答してください。
余計な解説や挨拶は一切含めないでください。JSONのみを返してください。

{
  "isCorrect": boolean, // 文法が正しいかどうか
  "corrected": "string", // 修正後の文章（正しい場合は元の文章）
  "explanation": "string", // 修正 nội dung hay lỗi ngữ pháp (bằng tiếng Việt)
  "rules": ["string"], // từ khóa quy tắc ngữ pháp liên quan (tiếng Nhật)
  "suggestions": ["string"] // các cách diễn đạt tự nhiên khác (tiếng Nhật)
}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const mode = body.mode || 'check'; // 'check', 'chat', 'compare'
    
    const GROQ_API_KEY = (Deno as any).env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

    let systemPrompt = "";
    let userPrompt = "";
    let requireJSON = false;
    let temperature = 0.1;

    if (mode === 'check') {
      const text = body.text || "";
      if (!text) throw new Error("No text provided for checking.");
      systemPrompt = CHECK_PROMPT;
      userPrompt = text;
      requireJSON = true;
    } else if (mode === 'chat') {
      const text = body.text || "";
      const history = body.history || [];
      const context = body.context || {};
      
      systemPrompt = `Bạn là một Sensei tiếng Nhật thân thiện và uyên bác. Hãy trả lời câu hỏi của học sinh bằng tiếng Việt dễ hiểu, kết hợp các thuật ngữ tiếng Nhật (Romaji/Kana). Luôn giữ thái độ khuyến khích. Nội dung đang học: ${context.title || 'Ngữ pháp chung'}.`;
      userPrompt = text;
      temperature = 0.5;
      
    } else if (mode === 'compare') {
      const grammar1 = body.grammar1 || "";
      const grammar2 = body.grammar2 || "";
      if (!grammar1 || !grammar2) throw new Error("Missing grammar points for comparison.");
      
      systemPrompt = `Bạn là chuyên gia phân tích ngữ pháp JLPT.
Hãy so sánh hai cấu trúc ngữ pháp được cung cấp và trả về kết quả dưới DẠNG JSON DUY NHẤT.
JSON Format:
{
  "comparison": [
    {
      "aspect": "Ý nghĩa",
      "grammar1_detail": "Ý nghĩa của ngữ pháp 1",
      "grammar2_detail": "Ý nghĩa của ngữ pháp 2"
    },
    {
      "aspect": "Cách nối (Sết-xư-dô-kư)",
      "grammar1_detail": "...",
      "grammar2_detail": "..."
    },
    {
      "aspect": "Sắc thái/Trường hợp dùng",
      "grammar1_detail": "...",
      "grammar2_detail": "..."
    }
  ],
  "summary": "Tóm tắt sự khác biệt cốt lõi (1-2 câu tiếng Việt)",
  "examples": [
    {
      "text": "Câu ví dụ 1 dùng ngữ pháp 1...",
      "translation": "...",
      "isGrammar1": true
    },
    {
      "text": "Câu ví dụ 2 dùng ngữ pháp 2...",
      "translation": "...",
      "isGrammar1": false
    }
  ]
}`;
      userPrompt = `Hãy so sánh: ${grammar1} và ${grammar2}`;
      requireJSON = true;
      temperature = 0.3;
    } else {
      throw new Error(`Invalid mode: ${mode}`);
    }

    // Prepare Groq call
    const messages = [{ role: "system", content: systemPrompt }];
    
    if (mode === 'chat' && body.history) {
      body.history.forEach((msg: any) => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }
    
    messages.push({ role: "user", content: userPrompt });

    const requestBody: any = {
      model: "llama-3.3-70b-versatile",
      messages: messages,
      temperature: temperature,
      max_tokens: 2048,
    };

    if (requireJSON) {
      requestBody.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "";

    if (mode === 'chat') {
      return new Response(JSON.stringify({ text: resultText, engine: 'groq' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === 'check' || mode === 'compare') {
      const cleanedText = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      let result;
      try {
        result = JSON.parse(cleanedText);
      } catch (e) {
        console.error("Parse failed for:", resultText);
        throw new Error("AI returned invalid JSON");
      }
      
      // If check mode, normalize data just in case
      if (mode === 'check') {
         result.isCorrect = typeof result.isCorrect === 'boolean' ? result.isCorrect : true;
         result.corrected = result.corrected || body.text;
         result.explanation = result.explanation || "Không có giải thích.";
         result.rules = Array.isArray(result.rules) ? result.rules : [];
         result.suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];
         result.engine = 'groq';
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error: any) {
    console.error("Grammar check error:", error);
    
    // Provide safe fallbacks so frontend doesn't crash
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal Server Error",
        isCorrect: true, // safe default for check
        corrected: "Lỗi hệ thống.", // safe default for check
        explanation: "Hệ thống AI đang quá tải. Vui lòng thử lại sau.", // safe default for check
        text: "Sensei hiện đang quá tải. Bạn chờ một lát nhé!", // safe default for chat
        rules: [],
        suggestions: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
