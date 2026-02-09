// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query?: string;
  jlpt_level?: string;
  radical?: string;
  stroke_min?: number;
  stroke_max?: number;
  limit?: number;
  offset?: number;
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

    const {
      query,
      jlpt_level,
      radical,
      stroke_min,
      stroke_max,
      limit = 20,
      offset = 0,
    } = await req.json() as SearchRequest;

    // Build search query
    let searchQuery = supabase
      .from("kanji")
      .select("*", { count: "exact" });

    // Text search (character, hanviet, or meaning)
    if (query && query.trim()) {
      const trimmedQuery = query.trim();
      
      // Check if query is a single kanji character
      if (trimmedQuery.length === 1 && /[\u4e00-\u9faf]/.test(trimmedQuery)) {
        searchQuery = searchQuery.eq("character", trimmedQuery);
      } else {
        // Search in hanviet or meaning
        searchQuery = searchQuery.or(
          `hanviet.ilike.%${trimmedQuery}%,meaning_vi.ilike.%${trimmedQuery}%,meaning_en.ilike.%${trimmedQuery}%`
        );
      }
    }

    // Filter by JLPT level
    if (jlpt_level) {
      searchQuery = searchQuery.eq("jlpt_level", jlpt_level);
    }

    // Filter by radical
    if (radical) {
      searchQuery = searchQuery.eq("radical", radical);
    }

    // Filter by stroke count range
    if (stroke_min !== undefined) {
      searchQuery = searchQuery.gte("stroke_count", stroke_min);
    }
    if (stroke_max !== undefined) {
      searchQuery = searchQuery.lte("stroke_count", stroke_max);
    }

    // Pagination and ordering
    searchQuery = searchQuery
      .order("frequency", { ascending: true, nullsFirst: false })
      .order("stroke_count", { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await searchQuery;

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        results: data || [],
        total: count || 0,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        total_pages: count ? Math.ceil(count / limit) : 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in kanji-search function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
