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

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Use Lovable AI Gateway endpoint - PRELOAD all vocabulary with details
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Bạn là giáo viên tiếng Nhật. Phân tích đoạn văn và trả về JSON với TẤT CẢ từ vựng chi tiết:
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
- Thêm furigana cho TẤT CẢ Kanji
- vocabulary_list: 5-10 từ quan trọng (hiển thị)
- preloaded_vocabulary: TẤT CẢ từ trong bài với chi tiết đầy đủ (cho tra từ offline)
- Level: ${level || 'N5'}
- Chỉ trả về JSON.`
          },
          {
            role: 'user',
            content: `Phân tích đoạn văn sau:\n${content}`
          }
        ],
        response_format: { type: 'json_object' },
      }),
    });

    const responseText = await response.text();
    console.log('API response status:', response.status);

    if (!response.ok) {
      console.error('API error:', responseText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = JSON.parse(responseText);
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      throw new Error('No response from AI');
    }

    // Parse JSON from response
    let analysisData;
    try {
      const cleanContent = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisData = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response:', responseContent);
      throw new Error('Invalid AI response format');
    }

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
