// Global search across kanji, vocab, decks, videos, lessons, profiles.
// Public: callable with anon key. Returns top N matches per category using pg_trgm similarity.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
  score?: number;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function clean(q: string) {
  return q.trim().slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const q = clean(url.searchParams.get("q") ?? "");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "5"), 10);

    if (!q) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const like = `%${q}%`;
    const results: SearchResult[] = [];

    const [kanji, vocab, decks, videos, lessons, profiles, grammar] = await Promise.all([
      supabase
        .from("kanji")
        .select("id, character, meaning, meaning_vi, jlpt_level")
        .or(`character.ilike.${like},meaning.ilike.${like},meaning_vi.ilike.${like}`)
        .limit(limit),
      supabase
        .from("flashcards")
        .select("id, word, reading, meaning, jlpt_level")
        .or(`word.ilike.${like},reading.ilike.${like},meaning.ilike.${like}`)
        .limit(limit),
      supabase
        .from("vocabulary_folders")
        .select("id, name, description")
        .eq("is_public", true)
        .ilike("name", like)
        .limit(limit),
      supabase
        .from("video_sources_public")
        .select("id, title, jlpt_level")
        .ilike("title", like)
        .limit(limit),
      supabase
        .from("lessons")
        .select("id, title, description")
        .eq("is_published", true)
        .ilike("title", like)
        .limit(limit),
      supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .or(`display_name.ilike.${like},username.ilike.${like}`)
        .limit(limit),
      supabase
        .from("grammar_points")
        .select("id, title, level, structure")
        .or(`title.ilike.${like},structure.ilike.${like}`)
        .limit(limit),
    ]);

    for (const k of kanji.data ?? []) {
      results.push({
        type: "kanji",
        id: k.id,
        title: k.character,
        subtitle: `${k.meaning_vi || k.meaning} · ${k.jlpt_level ?? ""}`,
        url: `/kanji/${encodeURIComponent(k.character)}`,
        icon: "🈁",
      });
    }
    for (const v of vocab.data ?? []) {
      results.push({
        type: "vocab",
        id: v.id,
        title: v.word,
        subtitle: `${v.reading ?? ""} · ${v.meaning ?? ""}`,
        url: `/saved-vocabulary?word=${encodeURIComponent(v.word)}`,
        icon: "📝",
      });
    }
    for (const d of decks.data ?? []) {
      results.push({
        type: "deck",
        id: d.id,
        title: d.name,
        subtitle: d.description ?? "",
        url: `/folders?folder=${d.id}`,
        icon: "🃏",
      });
    }
    for (const v of videos.data ?? []) {
      results.push({
        type: "video",
        id: v.id,
        title: v.title,
        subtitle: v.jlpt_level ?? "Video",
        url: `/video-learning?video=${v.id}`,
        icon: "🎬",
      });
    }
    for (const l of lessons.data ?? []) {
      results.push({
        type: "lesson",
        id: l.id,
        title: l.title,
        subtitle: l.description ?? "Lesson",
        url: `/lessons/${l.id}/view`,
        icon: "📖",
      });
    }
    for (const p of profiles.data ?? []) {
      results.push({
        type: "friend",
        id: p.user_id,
        title: p.display_name || p.username || "User",
        subtitle: `@${p.username ?? ""}`,
        url: `/profile/${p.user_id}`,
        icon: "👤",
      });
    }
    for (const g of grammar.data ?? []) {
      results.push({
        type: "grammar",
        id: g.id,
        title: g.title,
        subtitle: `${g.level ?? ""} · ${g.structure ?? ""}`,
        url: `/grammar?point=${g.id}`,
        icon: "📐",
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("global-search error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
