// Quick test script for deployed japanese-analysis function
const SUPABASE_URL = "https://ojbwbbqmqxyxwwujzokm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYndiYnFtcXh5eHd3dWp6b2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDE4MTMsImV4cCI6MjA4NTUxNzgxM30.GDqKqc2CEeaQtF-gQZnaQ6lTIpblhdOa7ggVXdmFfHk";

const testText = "今日は天気がいいですね。";

console.log("🧪 Testing deployed japanese-analysis function...\n");
console.log(`📝 Input text: ${testText}\n`);

fetch(`${SUPABASE_URL}/functions/v1/japanese-analysis`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    prompt: "",
    content: testText,
  }),
})
  .then((response) => {
    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
    return response.json();
  })
  .then((data) => {
    console.log("\n✅ SUCCESS! Function is working!\n");
    console.log("📊 Response format:", data.format);
    
    if (data.format === "structured" && data.analysis) {
      console.log("\n🎉 Got structured analysis!");
      console.log("- JLPT Level:", data.analysis.overall_analysis?.jlpt_level);
      console.log("- Sentences:", data.analysis.sentences?.length);
      console.log("- Suggested Flashcards:", data.analysis.suggested_flashcards?.length);
      console.log("- Grammar patterns found!");
      
      console.log("\n💾 Full response saved below:\n");
      console.log(JSON.stringify(data, null, 2));
    } else if (data.response) {
      console.log("\n⚠️ Got text response (fallback mode):");
      console.log(data.response);
    } else {
      console.log("\n❓ Unexpected response format:");
      console.log(JSON.stringify(data, null, 2));
    }
  })
  .catch((error) => {
    console.error("\n❌ ERROR:");
    console.error(error.message);
    console.error("\n💡 Possible issues:");
    console.error("- Function not deployed yet");
    console.error("- GROQ_API_KEY not set in Supabase secrets");
    console.error("- Network/CORS issue");
  });
