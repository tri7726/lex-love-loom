/**
 * Simple direct test for Gemini API with enhanced prompt
 * Run with: deno run --allow-net --allow-env simple-test.ts
 */

const GROQ_API_KEY = "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";

const ENHANCED_SYSTEM_PROMPT = `You are an expert Japanese language analyzer specialized in Vietnamese learners.

Analyze the provided Japanese text and return a detailed JSON response with this structure:

{
  "overall_analysis": {
    "jlpt_level": "N5/N4/N3/N2/N1 or Mixed",
    "politeness_level": "formal/casual/mixed",
    "text_type": "conversation/news/literature/daily",
    "summary": "Brief Vietnamese summary"
  },
  "sentences": [
    {
      "japanese": "sentence",
      "vietnamese": "translation",
      "breakdown": {
        "words": [{"word": "kanji", "reading": "hiragana", "hanviet": "optional", "meaning": "nghĩa", "word_type": "noun/verb", "jlpt_level": "N5"}],
        "grammar_patterns": [{"pattern": "pattern", "meaning": "nghĩa", "usage": "usage"}]
      }
    }
  ],
  "suggested_flashcards": [
    {"word": "word", "reading": "reading", "meaning": "meaning", "example_sentence": "example", "example_translation": "translation", "jlpt_level": "N5", "word_type": "noun"}
  ],
  "grammar_summary": {
    "particles_used": ["は", "が"],
    "verb_forms": ["masu-form"],
    "key_patterns": ["pattern1"]
  },
  "cultural_notes": ["note"]
}

CRITICAL: Return ONLY valid JSON. All readings in hiragana. All explanations in Vietnamese.`;

async function testGroq(text: string) {
  console.log(`\n📝 Testing: "${text}"\n`);

  try {
    console.log("⏳ Calling Groq API...");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "user", content: ENHANCED_SYSTEM_PROMPT },
          { role: "user", content: `Analyze this Japanese text in detail:\n\n${text}` }
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      return;
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "";

    console.log("\n📥 Raw response length:", resultText.length);

    // Try parsing JSON
    try {
      const cleanedText = resultText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const analysis = JSON.parse(cleanedText);
      
      console.log("\n✅ STRUCTURED RESPONSE PARSED!\n");
      
      // Display results
      console.log("📊 OVERALL ANALYSIS:");
      console.log(`   JLPT Level: ${analysis.overall_analysis.jlpt_level}`);
      console.log(`   Politeness: ${analysis.overall_analysis.politeness_level}`);
      console.log(`   Type: ${analysis.overall_analysis.text_type}`);
      console.log(`   Summary: ${analysis.overall_analysis.summary}`);
      
      console.log(`\n📝 SENTENCES: ${analysis.sentences.length}`);
      if (analysis.sentences.length > 0) {
        const sent = analysis.sentences[0];
        console.log(`   1. ${sent.japanese}`);
        console.log(`      → ${sent.vietnamese}`);
        console.log(`      Words: ${sent.breakdown.words.length}, Grammar: ${sent.breakdown.grammar_patterns.length}`);
      }
      
      console.log(`\n💡 SUGGESTED FLASHCARDS: ${analysis.suggested_flashcards.length}`);
      analysis.suggested_flashcards.slice(0, 3).forEach((card: any, i: number) => {
        console.log(`   ${i+1}. ${card.word} (${card.reading}) - ${card.meaning} [${card.jlpt_level}]`);
      });
      
      console.log(`\n📚 GRAMMAR SUMMARY:`);
      console.log(`   Particles: ${analysis.grammar_summary.particles_used.join(", ")}`);
      console.log(`   Verb forms: ${analysis.grammar_summary.verb_forms.join(", ")}`);
      console.log(`   Patterns: ${analysis.grammar_summary.key_patterns.join(", ")}`);
      
      if (analysis.cultural_notes && analysis.cultural_notes.length > 0) {
        console.log(`\n🎎 CULTURAL NOTES:`);
        analysis.cultural_notes.forEach((note: string) => {
          console.log(`   - ${note}`);
        });
      }

      console.log("\n✅ TEST PASSED - Structured analysis working!");
      
    } catch (parseError) {
      console.log("\n⚠️ JSON parsing failed!");
      console.log("Raw response (first 500 chars):");
      console.log(resultText.substring(0, 500));
      console.log("\n❌ TEST FAILED - AI not returning valid JSON");
    }

  } catch (error) {
    console.error("❌ Network error:", error);
  }
}

// Run test
console.log("🧪 Testing Enhanced Japanese Analysis\n");
console.log("=" .repeat(60));

await testGroq("今日は天気がいいですね。");

console.log("\n\n" + "=".repeat(60));
console.log("✨ Test complete!");
