import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCORING_SYSTEM_PROMPT = `Bạn là một chuyên gia ngữ âm tiếng Nhật chuyên hỗ trợ người Việt.
Nhiệm vụ của bạn là so sánh "Câu gốc" và "Kết quả nhận diện giọng nói" để chấm điểm phát âm và đưa ra nhận xét chi tiết.

TIÊU CHÍ CHẤM ĐIỂM:
- Accuracy (Độ chính xác): So khớp từ ngữ.
- Phonetic Feedback (Nhận xét âm): Tìm các lỗi đặc trưng của người Việt khi nói tiếng Nhật (ví dụ: phát âm âm 'tsu', 'r', 'z', trường âm, ngắt âm).
- Intonation (Ngữ điệu): Nhận xét về độ trôi chảy.

TRẢ VỀ JSON:
{
  "score": number (0-100),
  "is_match": boolean,
  "feedback_vn": "Nhận xét tổng quát bằng tiếng Việt",
  "phonetic_tips": [
    "Âm 'り' của bạn hơi yếu",
    "Nên nhấn mạnh 'です' hơn ở cuối câu"
  ],
  "fluency_score": number,
  "accuracy_score": number
}`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rlSupabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const rl = await checkRateLimit(req, rlSupabase, { tier: "medium", endpoint: "analyze-speech" });
    if (rl) return rl;

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwtClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: authUser } } = await jwtClient.auth.getUser();
    if (!authUser) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const targetText = formData.get("target_text") as string;

    if (!file) throw new Error("No audio file");

    const groqApiKeys = [Deno.env.get("GROQ_API_KEY_1"), Deno.env.get("GROQ_API_KEY_2")].filter(Boolean) as string[];

    // 1. Transcription (Whisper)
    const groqFormData = new FormData();
    groqFormData.append("file", file, "recording.webm");
    groqFormData.append("model", "whisper-large-v3-turbo");
    groqFormData.append("language", "ja");
    groqFormData.append("response_format", "json");

    let transcript = "";
    for (const key of groqApiKeys) {
      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: groqFormData,
      });
      if (res.ok) {
        const data = await res.json();
        transcript = data.text;
        break;
      }
    }

    if (!transcript) throw new Error("Transcription failed");

    // 2. Pronunciation Evaluation (LLM)
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    interface SpeechEvaluation {
      score: number;
      is_match: boolean;
      feedback_vn: string;
      phonetic_tips: string[];
      fluency_score: number;
      accuracy_score: number;
    }

    let evaluation: SpeechEvaluation = { 
      score: 0, 
      is_match: false, 
      feedback_vn: "Chưa thể phân tích", 
      phonetic_tips: [],
      fluency_score: 0,
      accuracy_score: 0
    };

    if (geminiKey && targetText) {
      const prompt = `Câu gốc: ${targetText}\nKết quả nhận diện: ${transcript}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SCORING_SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) evaluation = JSON.parse(text);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      transcript,
      target: targetText,
      evaluation
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message, success: false }), { status: 500, headers: corsHeaders });
  }
});
