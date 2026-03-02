// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const mode = body.mode || 'check'; 
    
    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3")
    ].filter(Boolean);

    if (apiKeys.length === 0) throw new Error("No Groq API keys are configured");

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
      const context = body.context || {};
      systemPrompt = `Bạn là một Sensei tiếng Nhật thân thiện và uyên bác. Hãy trả lời câu hỏi của học sinh bằng tiếng Việt dễ hiểu, kết hợp các thuật ngữ tiếng Nhật (Romaji/Kana). Luôn giữ thái độ khuyến khích. Nội dung đang học: ${context.title || 'Ngữ pháp chung'}.
QUAN TRỌNG: Nếu bạn tạo ra bài tập (ví dụ: điền vào chỗ trống, dịch câu, chọn đáp án) hoặc các câu ví dụ, bạn BẮT BUỘC phải viết các câu hỏi, câu ví dụ và nội dung bài tập bằng TIẾNG NHẬT. Chỉ sử dụng tiếng Việt cho phần giải thích ngữ pháp, tiêu đề bài tập hoặc lời hướng dẫn.`;
      userPrompt = text;
      temperature = 0.5;
    } else if (mode === 'compare') {
      const grammar1 = body.grammar1 || "";
      const grammar2 = body.grammar2 || "";
      if (!grammar1 || !grammar2) throw new Error("Missing grammar points for comparison.");
      systemPrompt = `Bạn là chuyên gia phân tích ngữ pháp JLPT.
Hãy so sánh hai cấu trúc ngữ pháp được cung cấp và trả về kết quả dưới DẠNG JSON DUY NHẤT.
{
  "comparison": [
    { "aspect": "Ý nghĩa", "grammar1_detail": "...", "grammar2_detail": "..." }
  ],
  "summary": "...",
  "examples": [ { "text": "...", "translation": "...", "isGrammar1": true } ]
}`;
      userPrompt = `Hãy so sánh: ${grammar1} và ${grammar2}`;
      requireJSON = true;
      temperature = 0.3;
    }

    const messages = [{ role: "system", content: systemPrompt }];
    if (mode === 'chat' && body.history) {
      body.history.forEach((msg: any) => messages.push({ role: msg.role, content: msg.content }));
    }
    messages.push({ role: "user", content: userPrompt });

    const requestBody: any = {
      model: "llama-3.3-70b-versatile",
      messages: messages,
      temperature: temperature,
      max_tokens: 2048,
    };
    if (requireJSON) requestBody.response_format = { type: "json_object" };

    let resultText = "";
    for (const apiKey of apiKeys) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });
        if (response.ok) {
            const data = await response.json();
            resultText = data.choices?.[0]?.message?.content || "";
            break; // Key worked, exit loop
        } else {
            const errorText = await response.text();
            console.warn(`Groq API error on Key: ${response.status} ${errorText}. Trying next key...`);
        }
      } catch (e) {
        console.error("Groq Key error in japanese-grammar:", e);
      }
    }

    // Helper to extract JSON from AI text
    function extractJSON(text: string) {
      try {
        return JSON.parse(text.trim());
      } catch (_e) {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            return JSON.parse(match[1] || match[0]);
          } catch (_e2) {
            throw new Error("AI returned invalid JSON structure");
          }
        }
        throw new Error("Could not find JSON in AI response");
      }
    }

    if (!resultText) throw new Error("AI failed on all Groq keys");

    if (mode === 'chat') {
      return new Response(JSON.stringify({ text: resultText, engine: 'groq' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = extractJSON(resultText);
    if (mode === 'check') result.engine = 'groq';

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Grammar error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
