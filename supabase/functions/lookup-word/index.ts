// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Try to get word from Jisho API (free)
async function lookupJisho(word: string) {
  try {
    console.log('Trying Jisho API for:', word);
    const response = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`);
    if (!response.ok) return null;
    const data = await response.json();
    const result = data.data?.[0];
    if (!result) return null;
    const japanese = result.japanese?.[0];
    const senses = result.senses?.[0];
    if (!senses) return null;
    return {
      word: japanese?.word || word,
      reading: japanese?.reading || '',
      meaning: senses.english_definitions?.join(', ') || '',
      word_type: senses.parts_of_speech?.join(', ') || '',
      examples: [],
      notes: 'Nguồn: Jisho.org (tiếng Anh)',
      source: 'jisho'
    };
  } catch (e) {
    console.error('Jisho API error:', e);
    return null;
  }
}

// Call Lovable AI for Vietnamese translation and examples
async function lookupAI(word: string, context: string | null, apiKey: string) {
  try {
    console.log('Calling Lovable AI for:', word);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `Bạn là từ điển Nhật-Việt. Tra từ "${word}" ${context ? `trong ngữ cảnh: "${context}"` : ''}.
Trả về JSON:
{
  "word": "từ kanji",
  "reading": "hiragana",
  "meaning": "nghĩa tiếng Việt",
  "word_type": "loại từ",
  "examples": [{"japanese": "câu JP", "vietnamese": "nghĩa VN"}],
  "notes": "ghi chú"
}
Chỉ trả về JSON, không kèm theo bất kỳ văn bản nào khác.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    if (!resultText) return null;
    
    const cleaned = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const wordData = JSON.parse(cleaned);
    wordData.source = 'ai';
    return wordData;
  } catch (e) {
    console.error('AI lookup error:', e);
    return null;
  }
}

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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Check cache first
    const { data: cached } = await supabase
      .from('word_cache')
      .select('*')
      .eq('word', word)
      .maybeSingle();

    if (cached) {
      console.log('Cache hit! Source:', cached.source);
      return new Response(
        JSON.stringify({
          word: cached.word, reading: cached.reading, meaning: cached.meaning,
          word_type: cached.word_type, examples: cached.examples || [],
          notes: cached.notes, source: cached.source, cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Try Jisho API (free)
    let wordData = await lookupJisho(word);

    // Step 3: If Jisho failed, use Lovable AI
    if (!wordData) {
      const apiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!apiKey) {
        throw new Error('LOVABLE_API_KEY not configured');
      }
      wordData = await lookupAI(word, context, apiKey);
    }

    if (!wordData) {
      return new Response(
        JSON.stringify({ error: 'Could not find word' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Save to cache
    await supabase.from('word_cache').upsert({
      word: wordData.word, reading: wordData.reading, meaning: wordData.meaning,
      word_type: wordData.word_type, examples: wordData.examples || [],
      notes: wordData.notes, source: wordData.source
    }, { onConflict: 'word' });

    return new Response(
      JSON.stringify({ ...wordData, cached: false }),
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
