/**
 * API client for the NestJS backend (apps/backend).
 *
 * - Base URL is configured via VITE_BACKEND_URL (fallback http://localhost:3001).
 * - Automatically attaches the Supabase access token as Bearer.
 * - Provides `streamSSE` helper for Server-Sent Events endpoints (e.g. /ai/explain).
 */
import { supabase } from "@/integrations/supabase/client";

const BASE_URL =
  (import.meta as any).env?.VITE_BACKEND_URL?.replace(/\/$/, "") ??
  "http://localhost:3001";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Stream a Server-Sent Events endpoint (e.g. /ai/explain).
 * onDelta is called for each `{ delta: "..." }` payload. Resolves on `[DONE]`.
 */
export async function streamSSE(
  path: string,
  body: unknown,
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...(await authHeader()),
  };
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Stream failed: ${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload);
        if (parsed.delta) onDelta(parsed.delta as string);
      } catch {
        // partial JSON — push back and wait for more
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
}
