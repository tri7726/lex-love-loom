import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY_2;

// The themes of Minna no Nihongo lessons to guide the AI
const lessonThemes: Record<number, string> = {
  1: 'Self-introduction, countries, professions, identity',
  2: 'Demonstratives (kore, sore), office/everyday items, ownership',
  3: 'Places, directions, prices, shopping',
  4: 'Time, days of the week, daily routines, schedules',
  5: 'Transportation, dates, going places, vehicles, travel',
  6: 'Transitive verbs, food, daily activities, meals',
  7: 'Tools, languages, giving/receiving, communication tech',
  8: 'Adjectives, describing things, places, feelings, weather',
  9: 'Preferences, abilities, reasons, hobbies, skills',
  10: 'Existence (arimasu, imasu), locations, animals, nature',
  11: 'Counters, periods, frequency, mailing, quantities',
  12: 'Past tense of adjectives/nouns, comparisons, festivals, seasons',
  13: 'Desires (hoshii, -tai), purpose of going, entertainment, towns',
  14: 'Te-form, requests, progressive actions, instructions, public transport',
  15: 'Permissions, prohibitions, current states, rules, family',
  16: 'Sequential actions, descriptions using Te-form, physical traits, routine',
  17: 'Nai-form, obligations, health, illness, doctors',
  18: 'Dictionary form, abilities, experiences, hobbies, instruments',
  19: 'Ta-form, past experiences, alternating actions, culture, tradition',
  20: 'Plain forms (casual speech), friends, casual interactions',
  21: 'Expressing opinions, quoting, news, society, thoughts',
  22: 'Noun modifiers (relative clauses), clothing, descriptions',
  23: 'Conditionals (toki, to), machines, directions, states',
  24: 'Giving and receiving (kuremasu, agemasu), favors, helping',
  25: 'Conditionals (tara, temo), relocation, aging, hypothetical situations',
  26: 'Seeking/giving explanations (ndesu), moving, garbage, excuses',
  27: 'Potential verbs, modern life, architecture, possibilities',
  28: 'Simultaneous actions (nagara), habitual actions, lifestyle, choices',
  29: 'Intransitive verbs, states (te-imasu), broken things, accidents',
  30: 'Preparation (te-okimasu), emergencies, disasters, planning',
  31: 'Volitional form, intentions, trips, future plans',
  32: 'Advice (hou ga ii), predictions (deshou), weather forecasting, sickness',
  33: 'Imperative and prohibitive forms, sports, rules, signs',
  34: 'Quoting exactly, doing actions exactly as shown, cooking, assembling',
  35: 'Conditionals (ba-form), advice, geography, natural features',
  36: 'Efforts and habits (you ni shimasu), health, lifestyle changes',
  37: 'Passive verbs, history, inventions, international events',
  38: 'Nominalization (no, koto), tidying up, forgetting things, organizing',
  39: 'Reasons using Te-form, accidents, natural disasters, emotions',
  40: 'Embedded questions (ka, kadouka), checking, measuring, exams',
  41: 'Giving/receiving with respect, gifts, celebrations, formal occasions',
  42: 'Purpose (tame ni), use, budgeting, wrapping, tools',
  43: 'Appearance (sou desu), excessive actions, feelings, crying/laughing',
  44: 'Ease/difficulty of actions, combining verbs, symptoms, medicine',
  45: 'Cases and conditions (baai, noni), trouble, complaints, accidents',
  46: 'Points in time (tokoro), business, appointments, schedules',
  47: 'Hearsay (sou desu), news, rumors, relationships',
  48: 'Causative verbs, parenting, education, school',
  49: 'Respectful language (Sonkeigo), business clients, formal requests',
  50: 'Humble language (Kenjougo), speaking about oneself in business'
};

async function generateHyperVocab(lessonNumber: number, theme: string) {
  const prompt = `You are a master Japanese linguist building the ultimate vocabulary database. 
The user wants a MASSIVE, deep vocabulary list for Minna no Nihongo Lesson ${lessonNumber} (Theme: ${theme}).

Generate exactly 40 ADDITIONAL unique, high-quality Japanese vocabulary words that fit this theme.
Criteria:
- Include advanced thematic words (JLPT N4-N2 level that fit the topic).
- Include practical real-life expressions or multi-kanji compounds (Jukugo).
- Do not repeat basic words like "watashi", "kore", "iku". Go deeper.
- If the theme is "Professions", list 40 specific professions. If the theme is "Health", list 40 medical terms/body parts/symptoms.

Return the result STRICTLY as a JSON array of objects with this format:
[
  { "word": "Kanji or word", "reading": "hiragana reading", "meaning_vi": "Vietnamese meaning" }
]
DO NOT output any markdown, explanations, or code blocks. Just the raw JSON array starting with '[' and ending with ']'.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });
    
    if (!res.ok) throw new Error(`Groq API error: ${res.statusText}`);
    const data = await res.json();
    let text = data.choices[0].message.content.trim();
    
    if (text.startsWith('```')) {
      text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    return JSON.parse(text);
  } catch (err) {
    console.error(`Failed to generate for lesson ${lessonNumber}`, err);
    return [];
  }
}

async function run() {
  console.log('--- Generating Hyper-Enhanced Minna no Nihongo Vocabulary (40 words/lesson) ---');
  const finalSql = `-- Hyper-Enhanced Reference Vocabulary for Minna no Nihongo\n-- Generated by AI Agent to expand lessons >100 words total\n\n`;
  
  const outPath = 'C:\\Users\\Pheo\\.gemini\\antigravity\\brain\\afc46569-4ad8-433c-8685-3e0ce6b739c3\\minna_hyper_vocab.sql';
  fs.writeFileSync(outPath, finalSql); // Initialize file

  for (let i = 1; i <= 50; i++) {
    console.log(`Generating 40 extra words for Lesson ${i}: ${lessonThemes[i]}`);
    let extras: { word: string; reading: string; meaning_vi: string }[] = [];
    
    // We might need to retry once if JSON parsing fails due to AI outputting markdown
    for(let retry=0; retry<2; retry++){
       extras = await generateHyperVocab(i, lessonThemes[i]);
       if(extras.length > 0) break;
       await new Promise(r => setTimeout(r, 2000));
    }
    
    if (extras.length > 0) {
      let chunkSql = `\n-- Lesson ${i} Hyper-Extra Vocabulary\n`;
      chunkSql += `INSERT INTO vocabulary_master (textbook_id, lesson_id, jlpt_level, word, reading, furigana, meaning_vi)\n`;
      chunkSql += `SELECT t.id, l.id, 'N4', v.word, v.reading, v.reading, v.meaning_vi\n`;
      chunkSql += `FROM textbooks t JOIN lessons l ON l.textbook_id = t.id AND l.lesson_number = ${i}\n`;
      chunkSql += `CROSS JOIN (VALUES\n`;
      
      const values = extras.map((w) => {
          const word = (w.word || '').replace(/'/g, "''");
          const reading = (w.reading || '').replace(/'/g, "''");
          const meaning = (w.meaning_vi || '').replace(/'/g, "''");
          return `  ('${word}', '${reading}', '${meaning}')`;
      });
      
      chunkSql += values.join(',\n');
      chunkSql += `\n) AS v(word, reading, meaning_vi)\n`;
      chunkSql += `WHERE t.name = 'Minna no Nihongo'\n`;
      chunkSql += `ON CONFLICT (textbook_id, word, reading) DO NOTHING;\n\n`;
      
      chunkSql += `UPDATE lessons l\nSET word_count = (SELECT COUNT(*) FROM vocabulary_master WHERE lesson_id = l.id)\n`;
      chunkSql += `FROM textbooks t\nWHERE l.textbook_id = t.id AND t.name = 'Minna no Nihongo' AND l.lesson_number = ${i};\n`;
      
      fs.appendFileSync(outPath, chunkSql);
    }
    
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`--- Generation Complete: saved to ${outPath} ---`);
}

run();
