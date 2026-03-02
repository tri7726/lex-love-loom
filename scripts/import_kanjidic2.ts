import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parseStringPromise } from 'xml2js';
import * as dotenv from 'dotenv';

interface Kanjidic2Character {
  literal: string[];
  misc: [{
    stroke_count?: string[];
    grade?: string[];
    jlpt?: string[];
  }];
  reading_meaning?: [{
    rmgroup: [{
      meaning?: (string | { _: string; $: { m_lang?: string } })[];
      reading?: { _: string; $: { r_type: string } }[];
    }];
  }];
}

// Load env variables
// Load env variables - try root first, then parent if not found
dotenv.config(); // Default .env in CWD
if (!process.env.VITE_SUPABASE_URL) {
  dotenv.config({ path: './.env' }); 
}
if (!process.env.VITE_SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// WARNING: Use SERVICE ROLE KEY for bulk inserts, NOT anon key.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Reading Kanjidic2 XML file...");
  // Make sure to download kanjidic2.xml from http://www.edrdg.org/kanjidic/kanjidic2.xml
  if (!fs.existsSync('./kanjidic2.xml')) {
    console.error("kanjidic2.xml not found in current directory!");
    process.exit(1);
  }

  const xmlData = fs.readFileSync('./kanjidic2.xml', 'utf-8');
  console.log("Parsing XML...");
  
  const result = await parseStringPromise(xmlData);
  const characters = result.kanjidic2.character;
  
  console.log(`Found ${characters.length} characters. Preparing insertion...`);

  let batch = [];
  let count = 0;

  for (const char of characters as Kanjidic2Character[]) {
    const literal = char.literal?.[0];
    const strokeCount = parseInt(char.misc?.[0].stroke_count?.[0] || '0', 10);
    const grade = parseInt(char.misc?.[0].grade?.[0] || '0', 10);
    const jlpt = parseInt(char.misc?.[0].jlpt?.[0] || '0', 10);
    
    // Meanings
    const meaningsNode = char.reading_meaning?.[0]?.rmgroup?.[0]?.meaning || [];
    const englishMeanings = meaningsNode.filter((m) => typeof m === 'string').join(', ');
    
    // Readings
    const readingsNode = char.reading_meaning?.[0]?.rmgroup?.[0]?.reading || [];
    const onReadings = readingsNode.filter((r) => r.$['r_type'] === 'ja_on').map((r) => r._).join(', ');
    const kunReadings = readingsNode.filter((r) => r.$['r_type'] === 'ja_kun').map((r) => r._).join(', ');

    batch.push({
      character: literal,
      stroke_count: strokeCount,
      grade: grade,
      jlpt: jlpt,
      meaning: englishMeanings,
      on_reading: onReadings,
      kun_reading: kunReadings,
      // Note: You may want to fetch Han-Viet from a local JSON source here and map it.
    });

    if (batch.length === 500) {
      const { error } = await supabase.from('kanji_details').upsert(batch, { onConflict: 'character' });
      if (error) console.error("Batch insert error:", error);
      count += batch.length;
      console.log(`Inserted ${count}/${characters.length} kanji...`);
      batch = [];
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    const { error } = await supabase.from('kanji_details').upsert(batch, { onConflict: 'character' });
    if (error) console.error("Batch insert error:", error);
    count += batch.length;
    console.log(`Inserted ${count}/${characters.length} kanji...`);
  }

  console.log("Kanjidic2 Migration Complete!");
}

main().catch(console.error);
