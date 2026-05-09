// Fetch a remote article and return cleaned title + text.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|br|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(html: string, fallback: string) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return og[1];
  const t = html.match(/<title>([^<]+)<\/title>/i);
  if (t) return t[1].trim();
  return fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const u = new URL(url);
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(u.hostname)) {
      return new Response(JSON.stringify({ error: "Forbidden host" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Lovable Reader Bot)" },
    });
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Upstream ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await resp.text();
    const title = extractTitle(html, u.hostname);

    // Try to isolate <article> or main content first
    const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
    const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
    const target = articleMatch?.[0] ?? mainMatch?.[0] ?? html;
    const content = stripTags(target);

    return new Response(
      JSON.stringify({
        title,
        content,
        url,
        source_domain: u.hostname,
        word_count: content.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
