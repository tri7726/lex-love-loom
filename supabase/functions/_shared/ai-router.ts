// @ts-nocheck: Deno shared module

export type ModelTier = "TIER_LOW" | "TIER_MEDIUM" | "TIER_HIGH";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | any[];
}

/**
 * Classifies the user query into 3 tiers
 */
export function classifyIntent(message: string): ModelTier {
  if (!message) return "TIER_LOW";
  const t = message.trim();

  if (t.length < 12) return "TIER_LOW";

  const greetingPatterns = [
    /^(こんにちは|おはよう|こんばんは|ありがとう|お疲れ|よろしく|はじめまして|おやすみ)/,
    /^(chào|xin chào|cảm ơn|cám ơn|hi|hello|hey|oke|ok)/i,
    /^(vâng|được|đúng|sai|có|không|thôi|xong|tiếp tục|tiếp)$/i,
  ];
  if (greetingPatterns.some((p) => p.test(t))) return "TIER_LOW";

  const complexKeywords = /ngữ pháp|phân biệt|giải thích|viết bài|tại sao|n[12]|jlpt n[12]|passive|causative|conditional|keigo|tôn kính|khiêm nhường/i;
  const isComplex = complexKeywords.test(t) || t.length > 150;
  
  if (isComplex) return "TIER_HIGH";
  
  return "TIER_MEDIUM";
}

export function getModelRoutes(tier: ModelTier, hasImage: boolean = false): string[] {
  if (hasImage) {
    return [
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "meta-llama/llama-4-maverick-17b-128e-instruct",
    ];
  }

  switch (tier) {
    case "TIER_LOW":
      return ["llama-3.1-8b-instant"];
    case "TIER_MEDIUM":
      return [
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.1-8b-instant",
      ];
    case "TIER_HIGH":
      return [
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.3-70b-versatile",
      ];
    default:
      return ["llama-3.1-8b-instant"];
  }
}

export function getGroqKeys(): string[] {
  return [
    Deno.env.get("GROQ_API_KEY_1"),
    Deno.env.get("GROQ_API_KEY_2"),
    Deno.env.get("GROQ_API_KEY_3"),
    Deno.env.get("GROQ_API_KEY"),
  ].filter(Boolean) as string[];
}

export async function callGroq(
  messages: ChatMessage[],
  opts: { tier: ModelTier; hasImage?: boolean; systemPrompt?: string }
) {
  const modelPriority = getModelRoutes(opts.tier, opts.hasImage);
  const apiKeys = getGroqKeys();
  const systemPrompt = opts.systemPrompt || "Bạn là Sensei Pro Max.";

  for (const model of modelPriority) {
    for (const apiKey of apiKeys) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemPrompt }, ...messages],
            stream: true,
            temperature: 0.7,
            max_tokens: model.includes("8b") ? 512 : 1024,
          }),
        });

        if (response.ok) {
          console.log(`✅ Using model: ${model}`);
          return response;
        }

        const errText = await response.text();
        console.warn(`Model ${model} failed (${response.status}): ${errText.slice(0, 100)}`);
      } catch (e) {
        console.error(`Groq error for ${model}:`, e);
      }
    }
  }
  return null;
}
