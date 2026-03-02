import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple XML parser for kanjidic2 format (no dependencies needed)
function parseKanjidic2(xmlText: string) {
  const entries: any[] = [];
  const characterRegex = /<character>([\s\S]*?)<\/character>/g;
  let match;

  while ((match = characterRegex.exec(xmlText)) !== null) {
    const block = match[1];

    const literal = block.match(/<literal>(.*?)<\/literal>/)?.[1] || '';
    const strokeCount = parseInt(block.match(/<stroke_count>(\d+)<\/stroke_count>/)?.[1] || '0', 10);
    const grade = parseInt(block.match(/<grade>(\d+)<\/grade>/)?.[1] || '0', 10);
    const jlpt = parseInt(block.match(/<jlpt>(\d+)<\/jlpt>/)?.[1] || '0', 10);

    // Extract meanings (English only - no m_lang attribute)
    const meanings: string[] = [];
    const meaningRegex = /<meaning>([^<]+)<\/meaning>/g;
    const rmgroupMatch = block.match(/<rmgroup>([\s\S]*?)<\/rmgroup>/);
    if (rmgroupMatch) {
      const rmgroup = rmgroupMatch[1];
      // Only get meanings without m_lang attribute (English)
      const englishMeaningRegex = /<meaning(?!\s)>([^<]+)<\/meaning>/g;
      let mMatch;
      while ((mMatch = englishMeaningRegex.exec(rmgroup)) !== null) {
        meanings.push(mMatch[1]);
      }

      // On readings
      const onReadings: string[] = [];
      const onRegex = /<reading r_type="ja_on">([^<]+)<\/reading>/g;
      let onMatch;
      while ((onMatch = onRegex.exec(rmgroup)) !== null) {
        onReadings.push(onMatch[1]);
      }

      // Kun readings
      const kunReadings: string[] = [];
      const kunRegex = /<reading r_type="ja_kun">([^<]+)<\/reading>/g;
      let kunMatch;
      while ((kunMatch = kunRegex.exec(rmgroup)) !== null) {
        kunReadings.push(kunMatch[1]);
      }

      entries.push({
        character: literal,
        stroke_count: strokeCount,
        grade: grade,
        jlpt: jlpt,
        meaning: meanings.join(', '),
        on_reading: onReadings.join(', '),
        kun_reading: kunReadings.join(', '),
      });
    } else {
      entries.push({
        character: literal,
        stroke_count: strokeCount,
        grade: grade,
        jlpt: jlpt,
        meaning: '',
        on_reading: '',
        kun_reading: '',
      });
    }
  }

  return entries;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get XML from request body
    const xmlText = await req.text();
    
    if (!xmlText || xmlText.length < 100) {
      return new Response(JSON.stringify({ error: 'No XML data provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Received XML data: ${xmlText.length} bytes`);

    // Parse XML
    const entries = parseKanjidic2(xmlText);
    console.log(`Parsed ${entries.length} kanji entries`);

    if (entries.length === 0) {
      return new Response(JSON.stringify({ error: 'No kanji entries found in XML' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert in batches of 500
    let inserted = 0;
    const batchSize = 500;
    const errors: string[] = [];

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const { error } = await supabase
        .from('kanji_details')
        .upsert(batch, { onConflict: 'character' });

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize)}: ${error.message}`);
        console.error('Batch error:', error.message);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_parsed: entries.length,
      total_inserted: inserted,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
