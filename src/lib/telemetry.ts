/**
 * Lightweight telemetry for AI Analysis framework.
 * Fire-and-forget; never throws, never blocks UI.
 * Buffered and flushed in batches to keep network quiet.
 */
import { supabase } from "@/integrations/supabase/client";

export type TelemetryEvent = {
  feature: string;          // 'pitch_accent' | 'grammar' | 'analyze' | ...
  event: "miss" | "hit" | "ai_fallback" | "error";
  reason?: string;
  word?: string;
  reading?: string;
  meta?: Record<string, unknown>;
};

const BUFFER: TelemetryEvent[] = [];
const FLUSH_MS = 4000;
const MAX_BUFFER = 25;
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  if (!BUFFER.length) return;
  const batch = BUFFER.splice(0, BUFFER.length);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const rows = batch.map((e) => ({
      user_id: user?.id ?? null,
      feature: e.feature,
      event: e.event,
      reason: e.reason ?? null,
      word: e.word ?? null,
      reading: e.reading ?? null,
      meta: e.meta ?? {},
    }));
    await supabase.from("analysis_telemetry").insert(rows as never);
  } catch {
    /* ignore — telemetry must never disrupt UX */
  }
}

export function logTelemetry(event: TelemetryEvent): void {
  BUFFER.push(event);
  if (BUFFER.length >= MAX_BUFFER) {
    if (timer) { clearTimeout(timer); timer = null; }
    void flush();
    return;
  }
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => { void flush(); });
}
