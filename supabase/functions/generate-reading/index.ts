// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { content, level } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating reading analysis for level:', level);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const userPrompt = `Bạn là giáo viên tiếng Nhật. Phân tích đoạn văn sau:
"${content}"

Level người học: ${level || 'N5'}

Trả về JSON với cấu trúc:
{
  "content_with_furigana": "HTML với ruby tags, ví dụ: <ruby>日本語<rt>にほんご</rt></ruby>",
  "vocabulary_list": [
    {"word": "từ", "reading": "hiragana", "meaning": "nghĩa VN ngắn"}
  ],
  "preloaded_vocabulary": [
    {
      "word": "từ kanji",
      "reading": "hiragana",
      "meaning": "nghĩa tiếng Việt đầy đủ",
      "word_type": "loại từ (danh từ, động từ, v.v.)",
      "examples": [{"japanese": "câu ví dụ", "vietnamese": "nghĩa"}],
      "notes": "ghi chú cách dùng"
    }
  ]
}
Yêu cầu:
1. Thêm furigana cho TẤT CẢ Kanji trong "content_with_furigana".
2. "vocabulary_list": Chọn 5-10 từ quan trọng.
3. "preloaded_vocabulary": TẤT CẢ từ vựng quan trọng xuất hiện trong bài kèm ví dụ và ghi chú.
4. CHỈ trả về JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;

    if (!resultText) {
      throw new Error('No response from AI');
    }

    const cleanedText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysisData = JSON.parse(cleanedText);

    console.log('Reading analysis result - vocabulary count:', analysisData.preloaded_vocabulary?.length || 0);

    // Cache all preloaded vocabulary to word_cache table
    if (analysisData.preloaded_vocabulary && analysisData.preloaded_vocabulary.length > 0) {
      console.log('Caching preloaded vocabulary...');
      
      const wordsToCache = analysisData.preloaded_vocabulary.map((v: any) => ({
        word: v.word,
        reading: v.reading,
        meaning: v.meaning,
        word_type: v.word_type,
        examples: v.examples || [],
        notes: v.notes,
        source: 'preload'
      }));

      const { error: cacheError } = await supabase
        .from('word_cache')
        .upsert(wordsToCache, { onConflict: 'word', ignoreDuplicates: true });

      if (cacheError) {
        console.error('Cache error:', cacheError);
      } else {
        console.log('Cached', wordsToCache.length, 'words');
      }
    }

    return new Response(
      JSON.stringify(analysisData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-reading:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
