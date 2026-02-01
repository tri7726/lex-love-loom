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
    const { word, context } = await req.json();

    if (!word) {
      return new Response(
        JSON.stringify({ error: 'Word is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Looking up word:', word);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use Lovable AI Gateway endpoint
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
            content: `Bạn là từ điển Nhật-Việt thông minh. Khi được hỏi về một từ tiếng Nhật, trả về JSON với format:
{
  "word": "từ kanji",
  "reading": "cách đọc hiragana",
  "meaning": "nghĩa tiếng Việt",
  "word_type": "loại từ (danh từ, động từ, tính từ, v.v.)",
  "examples": [
    {"japanese": "câu ví dụ tiếng Nhật", "vietnamese": "nghĩa tiếng Việt"}
  ],
  "notes": "ghi chú về cách dùng hoặc ngữ pháp (nếu có)"
}
Chỉ trả về JSON, không có text khác.`
          },
          {
            role: 'user',
            content: context 
              ? `Tra từ "${word}" trong ngữ cảnh: "${context}"`
              : `Tra từ "${word}"`
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
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON from response
    let wordData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      wordData = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid AI response format');
    }

    console.log('Word lookup result:', wordData);

    return new Response(
      JSON.stringify(wordData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lookup-word:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
