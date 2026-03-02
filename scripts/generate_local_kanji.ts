import fs from 'fs';
import { parseStringPromise } from 'xml2js';
import path from 'path';

async function generateLocalKanji() {
  console.log("Reading Kanjidic2 XML file...");
  const xmlPath = path.resolve(process.cwd(), 'kanjidic2.xml');
  
  if (!fs.existsSync(xmlPath)) {
    console.error("kanjidic2.xml not found in current directory!");
    process.exit(1);
  }

  // Load Vietnamese Meanings from dictionary files
  console.log("Loading Vietnamese meanings...");
  const viMap: Record<string, { meaning: string; hanviet: string }> = {};
  
  const bankFiles = [
    'scripts/kanji_bank_1.json',
    'scripts/kanji_bank_2.json'
  ];

  for (const file of bankFiles) {
    const bankPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(bankPath)) {
      try {
        const bankData = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
        console.log(`Processing ${file} (${bankData.length} entries)...`);
        
        for (const entry of bankData) {
          const kanji = entry[0];
          const hv = entry[1]; // Sino-Vietnamese readings
          const meanings = entry[4]; // Array of meanings
          
          let meaningStr = '';
          if (Array.isArray(meanings)) {
            // Filter out purely reference meanings if possible, or just take first 3
            meaningStr = meanings.slice(0, 3).join(', ');
          } else if (typeof meanings === 'string') {
            meaningStr = meanings;
          }

          viMap[kanji] = {
            meaning: meaningStr,
            hanviet: hv ? hv.split(' ')[0].toUpperCase() : ''
          };
        }
      } catch (e) {
        console.error(`Error parsing ${file}:`, e);
      }
    }
  }
  console.log(`Loaded ${Object.keys(viMap).length} Vietnamese entries from banks.`);

  const xmlData = fs.readFileSync(xmlPath, 'utf-8');
  console.log("Parsing XML...");
  
  const result = await parseStringPromise(xmlData);
  const characters = result.kanjidic2.character;
  
  console.log(`Found ${characters.length} characters. Processing...`);

  const kanjiData = characters.map((char: any) => {
    const literal = char.literal?.[0];
    const grade = parseInt(char.misc?.[0].grade?.[0] || '0', 10);
    const jlpt = parseInt(char.misc?.[0].jlpt?.[0] || '0', 10);
    
    // Default to English meanings from XML
    const meaningsNode = char.reading_meaning?.[0]?.rmgroup?.[0]?.meaning || [];
    const englishMeanings = meaningsNode
      .filter((m: any) => typeof m === 'string')
      .slice(0, 3)
      .join(', ');
    
    // Extract Han-Viet from XML first (fallback)
    const readingsNode = char.reading_meaning?.[0]?.rmgroup?.[0]?.reading || [];
    let hanviet = readingsNode
      .filter((r: any) => r.$['r_type'] === 'vietnam')
      .map((r: any) => r._)
      .slice(0, 1)
      .join('')
      .toUpperCase();

    // Override with Vietnamese meaning and HV if available from bank
    let meaningVi = englishMeanings;
    if (viMap[literal]) {
        if (viMap[literal].meaning) meaningVi = viMap[literal].meaning;
        if (viMap[literal].hanviet) hanviet = viMap[literal].hanviet;
    }

    // Readings (On/Kun)
    const onReadings = readingsNode
      .filter((r: any) => r.$['r_type'] === 'ja_on')
      .map((r: any) => r._)
      .slice(0, 3);
    const kunReadings = readingsNode
      .filter((r: any) => r.$['r_type'] === 'ja_kun')
      .map((r: any) => r._)
      .slice(0, 3);

    return {
      c: literal,
      g: grade,
      j: jlpt,
      m: meaningVi,
      o: onReadings,
      k: kunReadings,
      h: hanviet
    };
  });

  // Ensure directory exists
  const outputDir = path.resolve(process.cwd(), 'public/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'kanji-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(kanjiData));

  console.log(`Successfully generated local kanji data with Vietnamese meanings at: ${outputPath}`);
  console.log(`Total size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

generateLocalKanji().catch(console.error);
