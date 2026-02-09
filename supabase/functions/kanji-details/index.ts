// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { kanji_id, character, include_vocabulary, include_related, user_id } =
      await req.json() as KanjiDetailsRequest;

    if (!kanji_id && !character) {
      return new Response(
        JSON.stringify({ error: "Either kanji_id or character is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query for kanji data
    let kanjiQuery = supabase
      .from("kanji")
      .select("*");

    if (kanji_id) {
      kanjiQuery = kanjiQuery.eq("id", kanji_id);
    } else if (character) {
      kanjiQuery = kanjiQuery.eq("character", character);
    }

    const { data: kanjiData, error: kanjiError } = await kanjiQuery.single();

    if (kanjiError || !kanjiData) {
      return new Response(
        JSON.stringify({ error: "Kanji not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: any = {
      kanji: kanjiData,
    };

    // Get user progress if user_id provided
    if (user_id) {
      const { data: progressData } = await supabase
        .from("user_kanji_progress")
        .select("*")
        .eq("user_id", user_id)
        .eq("kanji_id", kanjiData.id)
        .single();

      result.user_progress = progressData || null;
    }

    // Get vocabulary if requested
    if (include_vocabulary) {
      // Get vocabulary through junction table
      const { data: vocabData } = await supabase
        .from("kanji_vocab_junction")
        .select(`
          position,
          vocabulary:kanji_vocabulary (
            id,
            word,
            reading,
            hanviet,
            meaning_vi,
            meaning_en,
            jlpt_level,
            part_of_speech,
            example_sentence,
            example_translation
          )
        `)
        .eq("kanji_id", kanjiData.id);

      // Get textbook mappings for vocabulary
      if (vocabData && vocabData.length > 0) {
        const vocabIds = vocabData
          .map((v: any) => v.vocabulary?.id)
          .filter((id: string) => id);

        const { data: textbookData } = await supabase
          .from("textbook_vocabulary")
          .select("*")
          .in("vocabulary_id", vocabIds);

        // Group by vocabulary_id
        const textbookMap = new Map();
        textbookData?.forEach((tb: any) => {
          if (!textbookMap.has(tb.vocabulary_id)) {
            textbookMap.set(tb.vocabulary_id, []);
          }
          textbookMap.get(tb.vocabulary_id).push({
            textbook: tb.textbook,
            lesson_number: tb.lesson_number,
            page_number: tb.page_number,
          });
        });

        result.vocabulary = vocabData.map((v: any) => ({
          ...v.vocabulary,
          position: v.position,
          textbook_info: textbookMap.get(v.vocabulary?.id) || [],
        }));
      } else {
        result.vocabulary = [];
      }

      // Separate by JLPT level
      result.vocabulary_by_jlpt = {
        N5: result.vocabulary?.filter((v: any) => v.jlpt_level === "N5") || [],
        N4: result.vocabulary?.filter((v: any) => v.jlpt_level === "N4") || [],
        N3: result.vocabulary?.filter((v: any) => v.jlpt_level === "N3") || [],
        N2: result.vocabulary?.filter((v: any) => v.jlpt_level === "N2") || [],
        N1: result.vocabulary?.filter((v: any) => v.jlpt_level === "N1") || [],
      };

      // Separate textbook vocabulary
      result.textbook_vocabulary = result.vocabulary?.filter(
        (v: any) => v.textbook_info && v.textbook_info.length > 0
      ) || [];
    }

    // Get related kanji if requested
    if (include_related) {
      const { data: relatedData } = await supabase
        .from("kanji_relationships")
        .select(`
          relationship_type,
          strength,
          reason,
          related_kanji:kanji!kanji_relationships_related_kanji_id_fkey (
            id,
            character,
            hanviet,
            meaning_vi,
            jlpt_level,
            stroke_count
          )
        `)
        .eq("kanji_id", kanjiData.id)
        .order("strength", { ascending: false });

      result.related_kanji = relatedData?.map((r: any) => ({
        ...r.related_kanji,
        relationship_type: r.relationship_type,
        strength: r.strength,
        reason: r.reason,
      })) || [];

      // Group by relationship type
      result.related_by_type = {
        radical: result.related_kanji.filter((k: any) => k.relationship_type === "radical"),
        reading: result.related_kanji.filter((k: any) => k.relationship_type === "reading"),
        meaning: result.related_kanji.filter((k: any) => k.relationship_type === "meaning"),
        component: result.related_kanji.filter((k: any) => k.relationship_type === "component"),
      };
    }

    // Get vocabulary count and relationship count
    const { count: vocabCount } = await supabase
      .from("kanji_vocab_junction")
      .select("*", { count: "exact", head: true })
      .eq("kanji_id", kanjiData.id);

    const { count: relatedCount } = await supabase
      .from("kanji_relationships")
      .select("*", { count: "exact", head: true })
      .eq("kanji_id", kanjiData.id);

    result.stats = {
      vocabulary_count: vocabCount || 0,
      related_kanji_count: relatedCount || 0,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in kanji-details function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
