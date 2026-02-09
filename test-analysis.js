#!/usr/bin/env node

/**
 * Test script for enhanced japanese-analysis function
 * 
 * Usage: node test-analysis.js
 */

const SUPABASE_URL = "https://ojbwbbqmqxyxwwujzokm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYndiYnFtcXh5eHd3dWp6b2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDE4MTMsImV4cCI6MjA4NTUxNzgxM30.GDqKqc2CEeaQtF-gQZnaQ6lTIpblhdOa7ggVXdmFfHk";

// Test cases with different difficulty levels
const testCases = [
  {
    name: "N5 - Simple daily greeting",
    content: "今日は天気がいいですね。"
  },
  {
    name: "N4 - Mixed politeness",
    content: "先生、今日の授業は楽しかったです。また来週ね！"
  },
  {
    name: "N3 - Complex sentence",
    content: "最近、日本の文化について研究しているんですが、とても興味深いです。"
  },
  {
    name: "N2 - Conditional with invitation",
    content: "もし時間があれば、一緒に映画を見に行きませんか。"
  }
];

async function testAnalysis(testCase) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${testCase.name}`);
  console.log(`Text: ${testCase.content}`);
  console.log("=".repeat(60));

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/japanese-analysis`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          content: testCase.content,
          prompt: "" // No specific question, just analyze
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP Error ${response.status}:`, errorText);
      return;
    }

    const data = await response.json();
    
    if (data.format === 'structured') {
      console.log("\n✅ Structured response received!\n");
      
      const analysis = data.analysis;
      
      // Overall Analysis
      console.log("📊 OVERALL ANALYSIS:");
      console.log(`   JLPT Level: ${analysis.overall_analysis.jlpt_level}`);
      console.log(`   Politeness: ${analysis.overall_analysis.politeness_level}`);
      console.log(`   Type: ${analysis.overall_analysis.text_type}`);
      console.log(`   Summary: ${analysis.overall_analysis.summary}`);
      
      // Sentences
      console.log(`\n📝 SENTENCES (${analysis.sentences.length}):`);
      analysis.sentences.forEach((sent, idx) => {
        console.log(`   ${idx + 1}. ${sent.japanese}`);
        console.log(`      → ${sent.vietnamese}`);
        console.log(`      Words: ${sent.breakdown.words.length}, Grammar: ${sent.breakdown.grammar_patterns.length}`);
      });
      
      // Suggested Flashcards
      console.log(`\n💡 SUGGESTED FLASHCARDS (${analysis.suggested_flashcards.length}):`);
      analysis.suggested_flashcards.forEach((card, idx) => {
        console.log(`   ${idx + 1}. ${card.word} (${card.reading}) - ${card.meaning} [${card.jlpt_level}]`);
      });
      
      // Grammar Summary
      console.log(`\n📚 GRAMMAR SUMMARY:`);
      console.log(`   Particles: ${analysis.grammar_summary.particles_used.join(", ")}`);
      console.log(`   Verb forms: ${analysis.grammar_summary.verb_forms.join(", ")}`);
      console.log(`   Patterns: ${analysis.grammar_summary.key_patterns.join(", ")}`);
      
    } else {
      console.log("\n⚠️  Fallback text response:");
      console.log(data.response);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

async function runTests() {
  console.log("🚀 Starting japanese-analysis tests...\n");
  
  for (const testCase of testCases) {
    await testAnalysis(testCase);
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log("\n\n✨ All tests completed!");
}

runTests();
