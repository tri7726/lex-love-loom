import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if the request is multipart formData
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Invalid Content-Type, expected multipart/form-data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No audio file provided or invalid file format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare exactly the form expected by Groq OpenAI-compatible API
    const groqFormData = new FormData();
    groqFormData.append("file", file, file.name || "recording.webm");
    groqFormData.append("model", "whisper-large-v3-turbo"); // Use turbo for minimal latency in shadowing
    groqFormData.append("language", "ja"); // Enforce Japanese specifically to improve accuracy
    groqFormData.append("response_format", "json");

    // Fetch API Keys
    const apiKeys = [
      Deno.env.get("GROQ_API_KEY_1"),
      Deno.env.get("GROQ_API_KEY_2"),
      Deno.env.get("GROQ_API_KEY_3"),
      Deno.env.get("GROQ_API_KEY"),
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      throw new Error("No Groq API keys configured.");
    }

    let transcriptionResult = null;
    let lastError: Error | null = null;

    // Call Groq API with failover
    for (const key of apiKeys) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            // Don't set Content-Type manually here, fetch will set it correctly (with boundary) for FormData
          },
          body: groqFormData,
        });

        if (res.ok) {
          transcriptionResult = (await res.json()) as { text: string };
          break; // Success
        } else {
          const errText = await res.text();
          console.warn(`Groq Key failed (${res.status}): ${errText.slice(0, 100)}`);
          lastError = new Error(errText);
        }
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.error("Groq fetch error:", e);
      }
    }

    if (!transcriptionResult) {
      throw lastError || new Error("All transcription engines failed.");
    }

    // Return the recognized transcript
    return new Response(
      JSON.stringify({
        transcript: transcriptionResult.text,
        success: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Transcription Error:", error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message || "Unknown Error", success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
