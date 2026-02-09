// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RelatedRequest {
  kanji_id: string;
  types?: string[]; // radical, reading, meaning, component
  limit?: number;
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

    const { kanji_id, types, limit = 50 } = await req.json() as RelatedRequest;

    if (!kanji_id) {
      return new Response(
        JSON.stringify({ error: "kanji_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query
    let relatedQuery = supabase
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
          stroke_count,
          radical
        )
      `)
      .eq("kanji_id", kanji_id);

    // Filter by relationship types if specified
    if (types && types.length > 0) {
      relatedQuery = relatedQuery.in("relationship_type", types);
    }

    relatedQuery = relatedQuery
      .order("strength", { ascending: false })
      .limit(limit);

    const { data: relatedData, error } = await relatedQuery;

    if (error) {
      throw error;
    }

    const related = relatedData?.map((r: any) => ({
      kanji: r.related_kanji,
      relationship_type: r.relationship_type,
      strength: r.strength,
      reason: r.reason,
    })) || [];

    // Group by relationship type
    const groupedByType: any = {
      radical: [],
      reading: [],
      meaning: [],
      component: [],
      compound: [],
      antonym: [],
      synonym: [],
    };

    related.forEach((item: any) => {
      if (groupedByType[item.relationship_type]) {
        groupedByType[item.relationship_type].push(item);
      }
    });

    return new Response(
      JSON.stringify({
        related,
        grouped_by_type: groupedByType,
        total: related.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in kanji-related function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
