/**
 * Local test for japanese-analysis function
 * Run with: deno run --allow-net --allow-env local-test.ts
 */

// Mock environment
Deno.env.set("GEMINI_API_KEY", "AIzaSyCr3IAF90mJWttFrc6LVJrhkpVD4GrZ224");

// Import the function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Test cases
const testCases = [
  {
    name: "N5 - Simple",
    content: "今日は天気がいいですね。",
    prompt: ""
  },
  {
    name: "N4 - Mixed",  
    content: "先生、今日の授業は楽しかったです。また来週ね！",
    prompt: ""
  }
];

async function testLocal() {
  console.log("🧪 Testing japanese-analysis locally with Deno\n");

  for (const testCase of testCases) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Test: ${testCase.name}`);
    console.log(`Text: ${testCase.content}`);
    console.log("=".repeat(60));

    // Create mock request
    const mockRequest = new Request("http://localhost:54321/functions/v1/japanese-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: testCase.content,
        prompt: testCase.prompt
      })
    });

    // Load and execute the function
    const functionModule = await import("./supabase/functions/japanese-analysis/index.ts");
    
    console.log("\n⏳ Analyzing...");
    
    // Note: Since the function uses serve(), we can't directly call it
    // Instead, we'll make HTTP request to Gemini directly for testing
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    const ENHANCED_SYSTEM_PROMPT = `You are an expert Japanese language analyzer specialized in Vietnamese learners.

Analyze the provided Japanese text and return a detailed JSON response with the following structure:

{
  "overall_analysis": {
    "jlpt_level": "Estimated JLPT level (N5, N4, N3, N2, N1, or 'Mixed' if multiple levels)",
    "politeness_level": "formal/casual/mixed",
    "text_type": "conversation/news/literature/daily/academic",
    "summary": "Brief overall analysis summary in Vietnamese (2-3 sentences)"
  },
  "sentences": [...],
  "suggested_flashcards": [...],
  "grammar_summary": {...},
  "cultural_notes": [...]
}

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON, no markdown code blocks, no additional text
- All readings must be in hiragana (not romaji)
- All explanations and translations must be in Vietnamese`;

    const payload = {
      contents: [{
        parts: [
          { text: ENHANCED_SYSTEM_PROMPT },
          { text: `Analyze this Japanese text in detail:\n\n${testCase.content}` }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
      }
    };

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Gemini API error ${response.status}:`, errorText);
        continue;
      }

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Try to parse JSON
      try {
        const cleanedText = resultText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        const analysis = JSON.parse(cleanedText);
        
        console.log("\n✅ Structured response received!\n");
        console.log("📊 OVERALL:");
        console.log(`   Level: ${analysis.overall_analysis.jlpt_level}`);
        console.log(`   Politeness: ${analysis.overall_analysis.politeness_level}`);
        console.log(`   Type: ${analysis.overall_analysis.text_type}`);
        console.log(`   Summary: ${analysis.overall_analysis.summary}`);
        
        console.log(`\n📝 SENTENCES: ${analysis.sentences.length}`);
        console.log(`💡 FLASHCARDS: ${analysis.suggested_flashcards.length}`);
        console.log(`📚 PARTICLES: ${analysis.grammar_summary.particles_used.join(", ")}`);
        
        if (analysis.suggested_flashcards.length > 0) {
          console.log(`\n📇 First flashcard:`);
          const card = analysis.suggested_flashcards[0];
          console.log(`   ${card.word} (${card.reading}) - ${card.meaning}`);
          console.log(`   [${card.jlpt_level}] ${card.word_type}`);
        }
        
      } catch (parseError) {
        console.log("\n⚠️ JSON parsing failed, raw response:");
        console.log(resultText.substring(0, 500) + "...");
      }

    } catch (error) {
      console.error("❌ Error:", error.message);
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log("\n\n✅ Local testing completed!");
}

testLocal();
