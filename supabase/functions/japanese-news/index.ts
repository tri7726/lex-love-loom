// @ts-nocheck: Deno edge function — types resolved at runtime by import map
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an expert Japanese news analyst and linguist.
Your task is to analyze a Japanese news article and provide a simplified version for learners with Furigana (HTML <ruby> tags), Vietnamese translation, and vocabulary extraction.

CRITICAL INSTRUCTIONS:
1. 'content_with_furigana': Add furigana to EVERY kanji or kanji compound using <ruby>漢字<rt>かんじ</rt></ruby>.
2. 'vietnamese_content': Provide a clear, natural Vietnamese translation of the news summary.
3. 'vocabulary_list': Extract 5-8 key words (kanji + reading + Vietnamese meaning).
4. 'jlpt_level': Estimate the JLPT level (N5 to N1).

Return the result in this JSON format:
{
  "title": "Vietnamese Title",
  "japanese_title": "Japanese Title with <ruby> tags",
  "content_with_furigana": "Japanese summary with <ruby> tags",
  "vietnamese_content": "Vietnamese summary",
  "vocabulary_list": [{"word": "漢字", "reading": "かんじ", "meaning": "Hán tự"}],
  "jlpt_level": "N3",
  "category": "Xã hội/Kinh tế/Sự kiện..."
}
`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action = "fetch_and_analyze" } = await req.json();

    if (action === "fetch_and_analyze") {
      const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      
      // 1. Fetch latest news from NHK Easy News
      console.log("Fetching news from NHK Easy News...");
      
      // Try multiple NHK endpoints
      const nhkEndpoints = [
        "https://www3.nhk.or.jp/news/easy/news-list.json",
        "https://www3.nhk.or.jp/news/easy/top-list.json",
      ];
      
      let newsList: unknown = null;
      let newsResponse: Response | null = null;
      
      for (const endpoint of nhkEndpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          newsResponse = await fetch(endpoint, {
            headers: { 
              "User-Agent": userAgent,
              "Accept": "application/json, text/plain, */*",
              "Accept-Language": "ja,en;q=0.9",
              "Referer": "https://www3.nhk.or.jp/news/easy/",
              "Origin": "https://www3.nhk.or.jp",
            }
          });
          
          if (newsResponse.ok) {
            const rawText = await newsResponse.text();
            // NHK sometimes wraps JSON in array brackets or has BOM
            const cleanText = rawText.replace(/^\uFEFF/, '').trim();
            newsList = JSON.parse(cleanText);
            console.log(`Success with endpoint: ${endpoint}`);
            break;
          } else {
            console.warn(`Endpoint ${endpoint} returned ${newsResponse.status}`);
          }
        } catch (e) {
          console.warn(`Endpoint ${endpoint} failed:`, e.message);
        }
      }
      
      // If NHK endpoints fail, use Lovable AI to generate a practice news article
      if (!newsList) {
        console.log("NHK endpoints unavailable, generating practice news with AI...");
        
        const aiResponse = await fetch("https://ojbwbbqmqxyxwwujzokm.supabase.co/functions/v1/generate-reading", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            topic: "recent Japanese current events",
            level: "N3",
            category: "news",
          }),
        });
        
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          
          // CRITICAL: Save fallback article to database so frontend can see it
          console.log("Saving AI generated fallback to database...");
          const { data: _savedData, error: saveError } = await supabaseClient
            .from("reading_passages")
            .insert({
              title: aiData.title_vi || "Tin tức AI",
              content: aiData.vietnamese_summary || "Bản tin được tạo bởi AI.",
              content_with_furigana: aiData.content_with_furigana || aiData.content,
              category: "news",
              level: "N3",
              vocabulary_list: aiData.vocabulary_list || [],
              user_id: null,
            })
            .select()
            .single();

          if (saveError) console.error("Error saving AI fallback to DB:", saveError);

          return new Response(JSON.stringify({ 
            success: true, 
            article: {
              title: aiData.title_vi || "Tin tức AI",
              japanese_title: aiData.title || "AI News",
              content_with_furigana: aiData.content_with_furigana || aiData.content,
              vietnamese_content: aiData.vietnamese_summary || "Bản tin được tạo bởi AI.",
              vocabulary_list: aiData.vocabulary_list || [],
              jlpt_level: "N3",
            },
            source: "ai_generated",
            db_saved: !!_savedData
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        throw new Error("All NHK endpoints returned errors and AI fallback failed. NHK may have changed their API.");
      }

      // Parse the news list - handle both array and object formats
      let latestNews: unknown = null;
      if (Array.isArray(newsList)) {
        latestNews = newsList[0];
      } else if (typeof newsList === 'object') {
        const dates = Object.keys(newsList).sort().reverse();
        const firstDateArticles = newsList[dates[0]];
        latestNews = Array.isArray(firstDateArticles) ? firstDateArticles[0] : firstDateArticles;
      }

      if (!latestNews) throw new Error("No news found in the list.");

      const newsId = latestNews.news_id;
      const newsTitle = latestNews.title;
      const newsBodyUrl = `https://www3.nhk.or.jp/news/easy/${newsId}/${newsId}.html`;
      
      console.log(`Found news: ${newsTitle} (${newsId}). Fetching body...`);

      // 2. Fetch the article body
      let newsContent = newsTitle;
      try {
        const bodyResponse = await fetch(newsBodyUrl, {
          headers: { "User-Agent": userAgent }
        });
        if (bodyResponse.ok) {
          const html = await bodyResponse.text();
          // Simple regex to extract text content, removing tags
          newsContent = html.replace(/<[^>]*>/g, '').trim();
          console.log("Body fetched successfully. Length:", newsContent.length);
        } else {
          console.warn("Could not fetch article body, using title only.");
        }
      } catch (e) {
        console.error("Error fetching article body:", e);
      }

      // 3. Groq Analysis
      const apiKeys = [
        Deno.env.get("GROQ_API_KEY_1"),
        Deno.env.get("GROQ_API_KEY_2"),
        Deno.env.get("GROQ_API_KEY_3")
      ].filter(Boolean);

      if (apiKeys.length === 0) {
        throw new Error("No Groq API keys found in environment variables.");
      }

      let analyzedData = null;
      for (let i = 0; i < apiKeys.length; i++) {
        console.log(`Attempting analysis with Groq key ${i+1}...`);
        try {
          const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
              Authorization: `Bearer ${apiKeys[i]}`, 
              "Content-Type": "application/json" 
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Analyze this Japanese news article: ${newsContent}` }
              ],
              response_format: { type: "json_object" },
              temperature: 0.5
            }),
          });

          if (groqResponse.ok) {
            const data = await groqResponse.json();
            const content = data.choices[0]?.message?.content;
            if (content) {
              analyzedData = JSON.parse(content);
              console.log("Groq analysis successful.");
              break;
            }
          } else {
            const errorText = await groqResponse.text();
            console.error(`Groq API key ${i+1} failed: ${groqResponse.status} - ${errorText}`);
          }
        } catch (e) {
          console.error(`Groq check iteration ${i+1} error:`, e);
        }
      }

      if (!analyzedData || !analyzedData.japanese_title) {
        throw new Error("AI analysis failed or returned invalid data structure.");
      }

      // 4. Save to reading_passages
      console.log("Saving analyzed news to database...");
      const { data: _savedData, error: saveError } = await supabaseClient
        .from("reading_passages")
        .insert({
          title: analyzedData.title,
          content: analyzedData.vietnamese_content || newsContent,
          content_with_furigana: analyzedData.content_with_furigana,
          category: analyzedData.category || "news",
          level: analyzedData.jlpt_level || "N3",
          vocabulary_list: analyzedData.vocabulary_list,
          user_id: null,
        })
        .select()
        .single();

      if (saveError) {
        console.error("Error saving news to DB:", saveError);
      }

      return new Response(JSON.stringify({ success: true, article: analyzedData, news_id: newsId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Japanese News error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
