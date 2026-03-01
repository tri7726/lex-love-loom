import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import * as dotenv from 'dotenv';

// Load env variables
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// WARNING: Use SERVICE ROLE KEY for bulk inserts.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected format: JSON dump from JMdict (e.g., jmdict-eng-3.2.0.json)
async function main() {
  console.log("Reading JMdict JSON file...");
  if (!fs.existsSync('./jmdict.json')) {
    console.error("jmdict.json not found! Please download the JSON build of JMdict.");
    process.exit(1);
  }

  const raw = fs.readFileSync('./jmdict.json', 'utf-8');
  console.log("Parsing JMdict JSON...");
  const data = JSON.parse(raw);
  const words = data.words || [];

  console.log(`Found ${words.length} words. Preparing insertion...`);

  let batch = [];
  let count = 0;

  for (const word of words) {
    // Basic extraction
    const kanji = word.kanji?.[0]?.text || '';
    const kana = word.kana?.[0]?.text || '';
    
    if (!kanji && !kana) continue;

    const meanings = word.sense?.[0]?.gloss?.map((g: any) => g.text).join('; ') || '';
    const partOfSpeech = word.sense?.[0]?.partOfSpeech?.join(',') || '';

    // A simplified schema for 'jmdict_entries' table
    batch.push({
      entry_id: word.id,
      kanji: kanji,
      reading: kana,
      meanings: meanings,
      pos: partOfSpeech,
      is_common: word.kanji?.[0]?.common === true || word.kana?.[0]?.common === true,
    });

    if (batch.length === 500) {
      const { error } = await supabase.from('jmdict_entries').upsert(batch, { onConflict: 'entry_id' });
      if (error) console.error("Batch insert error:", error);
      count += batch.length;
      console.log(`Inserted ${count}/${words.length} words...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    const { error } = await supabase.from('jmdict_entries').upsert(batch, { onConflict: 'entry_id' });
    if (error) console.error("Batch insert error:", error);
    count += batch.length;
    console.log(`Inserted ${count}/${words.length} words...`);
  }

  console.log("JMdict Migration Complete!");
}

main().catch(console.error);
