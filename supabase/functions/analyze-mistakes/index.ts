// Analyze recent mistakes with AI and store weakness patterns.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Pattern {
  pattern_key: string;
  category: "kanji" | "grammar" | "vocab" | "pronunciation";
  label: string;
  jlpt_level?: string | null;
  score: number;
  evidence: unknown[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [grammar, pron] = await Promise.all([
      supabase
        .from("grammar_mistakes")
        .select("original_text,corrected_text,grammar_point,explanation,mistake_type,difficulty,created_at")
        .eq("user_id", user.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("pronunciation_results")
        .select("original_text,recognized_text,score,created_at")
        .eq("user_id", user.id)
        .gte("created_at", since)
        .lt("score", 70)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    const corpus = {
      grammar_mistakes: grammar.data ?? [],
      pronunciation_low_scores: pron.data ?? [],
    };

    if (
      corpus.grammar_mistakes.length === 0 &&
      corpus.pronunciation_low_scores.length === 0
    ) {
      return new Response(
        JSON.stringify({ patterns: [], message: "No recent mistakes" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Bạn là chuyên gia phân tích lỗi học tiếng Nhật. Phân loại lỗi của user thành 3-7 pattern cô đọng (vd: 'verb_group2_te_form', 'particle_wa_ga', 'homophone_kanji_kou'). Trả JSON đúng schema, label tiếng Việt ngắn gọn, score 1-5 (5 = yếu nhất).",
          },
          {
            role: "user",
            content:
              "Phân tích corpus sau và trả về danh sách pattern điểm yếu:\n" +
              JSON.stringify(corpus).slice(0, 12000),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_patterns",
              description: "Save weakness patterns",
              parameters: {
                type: "object",
                properties: {
                  patterns: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        pattern_key: { type: "string" },
                        category: {
                          type: "string",
                          enum: ["kanji", "grammar", "vocab", "pronunciation"],
                        },
                        label: { type: "string" },
                        jlpt_level: { type: "string" },
                        score: { type: "number" },
                        evidence: { type: "array", items: { type: "string" } },
                      },
                      required: ["pattern_key", "category", "label", "score"],
                    },
                  },
                },
                required: ["patterns"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_patterns" } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      return new Response(JSON.stringify({ error: "AI failed", detail: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed: { patterns: Pattern[] } = args ? JSON.parse(args) : { patterns: [] };

    const rows = parsed.patterns.map((p) => ({
      user_id: user.id,
      pattern_key: p.pattern_key,
      category: p.category,
      label: p.label,
      jlpt_level: p.jlpt_level ?? null,
      score: Math.max(0, Math.min(5, Number(p.score) || 1)),
      evidence: p.evidence ?? [],
      last_seen_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("user_weakness_patterns")
        .upsert(rows, { onConflict: "user_id,pattern_key" });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ patterns: rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
