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

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{
              text: `Bạn là giáo viên tiếng Nhật. Phân tích đoạn văn sau:
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
4. CHỈ trả về JSON.`
            }]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error('No response from AI');
    }

    // Parse JSON from response
    const analysisData = JSON.parse(resultText);

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

      // Upsert to avoid duplicates
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
