import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'Nihongo AI Coach',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Bạn là giáo viên tiếng Nhật. Phân tích đoạn văn tiếng Nhật và trả về JSON với format:
{
  "content_with_furigana": "HTML với ruby tags cho furigana, ví dụ: <ruby>日本語<rt>にほんご</rt></ruby>",
  "vocabulary_list": [
    {"word": "từ kanji", "reading": "hiragana", "meaning": "nghĩa tiếng Việt"}
  ]
}
- Thêm furigana cho TẤT CẢ các từ Kanji
- vocabulary_list chứa 5-10 từ vựng quan trọng phù hợp level ${level || 'N5'}
- Chỉ trả về JSON, không có text khác.`
          },
          {
            role: 'user',
            content: `Phân tích đoạn văn sau (level ${level || 'N5'}):\n${content}`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = data.choices[0]?.message?.content;

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

    console.log('Reading analysis result:', analysisData);

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
