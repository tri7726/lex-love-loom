// @ts-nocheck: Deno edge function
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { withCache } from "../_shared/cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KanjiDetailsRequest {
  kanji_id?: string;
  character?: string;
  include_vocabulary?: boolean;
  include_related?: boolean;
  user_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rl = await checkRateLimit(req, supabase, { tier: "high", endpoint: "kanji-details" });
    if (rl) return rl;

    const body = await req.json() as KanjiDetailsRequest;
    const { kanji_id, character, include_vocabulary, include_related, user_id } = body;

    const cacheKey = `kanji-details:v1:${kanji_id || character}:v${!!include_vocabulary}:r${!!include_related}`;

    const result = await withCache(supabase, cacheKey, 60 * 60 * 24 * 7, async () => {
      // Build query for kanji data
      let kanjiQuery = supabase.from("kanji").select("*");
      if (kanji_id) kanjiQuery = kanjiQuery.eq("id", kanji_id);
      else if (character) kanjiQuery = kanjiQuery.eq("character", character);

      const { data: kanjiData, error: kanjiError } = await kanjiQuery.single();
      if (kanjiError || !kanjiData) throw new Error("Kanji not found");

      const responseData: any = { kanji: kanjiData };

      // 1. Vocabulary
      if (include_vocabulary) {
        const { data: vocabData } = await supabase.from("kanji_vocab_junction")
          .select(`position, vocabulary:kanji_vocabulary (*)`)
          .eq("kanji_id", kanjiData.id);

        const vocabIds = (vocabData || []).map((v: any) => v.vocabulary?.id).filter(Boolean);
        const { data: textbookData } = await supabase.from("textbook_vocabulary").select("*").in("vocabulary_id", vocabIds);

        const textbookMap = new Map();
        (textbookData || []).forEach((tb: any) => {
          if (!textbookMap.has(tb.vocabulary_id)) textbookMap.set(tb.vocabulary_id, []);
          textbookMap.get(tb.vocabulary_id).push({ textbook: tb.textbook, lesson_number: tb.lesson_number });
        });

        responseData.vocabulary = (vocabData || []).map((v: any) => ({
          ...v.vocabulary,
          position: v.position,
          textbook_info: textbookMap.get(v.vocabulary?.id || '') || [],
        }));
      }

      // 2. Related
      if (include_related) {
        const { data: relatedData } = await supabase.from("kanji_relationships")
          .select(`relationship_type, strength, reason, related_kanji:kanji!kanji_relationships_related_kanji_id_fkey (*)`)
          .eq("kanji_id", kanjiData.id);

        responseData.related_kanji = (relatedData || []).map((r: any) => ({
          ...r.related_kanji,
          relationship_type: r.relationship_type,
          strength: r.strength,
        }));
      }

      // 3. Stats
      const { count: vCount } = await supabase.from("kanji_vocab_junction").select("*", { count: "exact", head: true }).eq("kanji_id", kanjiData.id);
      const { count: rCount } = await supabase.from("kanji_relationships").select("*", { count: "exact", head: true }).eq("kanji_id", kanjiData.id);
      
      responseData.stats = { vocabulary_count: vCount || 0, related_kanji_count: rCount || 0 };
      return responseData;
    });

    // Per-user data (User Progress) - NOT CACHED
    if (user_id) {
      const { data: progressData } = await supabase.from("user_kanji_progress")
        .select("*").eq("user_id", user_id).eq("kanji_id", result.kanji.id).maybeSingle();
      result.user_progress = progressData || null;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const status = error.message === "Kanji not found" ? 404 : 500;
    return new Response(JSON.stringify({ error: error.message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
