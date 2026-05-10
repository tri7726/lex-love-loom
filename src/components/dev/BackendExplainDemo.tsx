import React, { useState } from "react";
import { streamSSE } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Demo component that streams an explanation from the NestJS backend's
 * `POST /ai/explain` endpoint via Server-Sent Events.
 *
 * Mount anywhere (e.g. a hidden /dev page) to verify the FE↔NestJS bridge.
 */
export function BackendExplainDemo() {
  const [prompt, setPrompt] = useState("Giải thích trợ từ は và が");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setOutput("");
    setLoading(true);
    try {
      await streamSSE(
        "/ai/explain",
        { prompt, level: "N5" },
        (delta) => setOutput((prev) => prev + delta),
      );
    } catch (e) {
      setOutput(`⚠️ ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold">NestJS /ai/explain — SSE demo</h3>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
      />
      <Button onClick={run} disabled={loading}>
        {loading ? "Streaming…" : "Explain"}
      </Button>
      <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-sm">
        {output || "(no output yet)"}
      </pre>
    </div>
  );
}
