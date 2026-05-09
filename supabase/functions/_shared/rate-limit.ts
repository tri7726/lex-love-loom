// @ts-nocheck — Deno-compatible rate limit middleware for Supabase Edge Functions

export type Tier = "critical" | "high" | "medium" | "low";
export type IdentifierType = "ip" | "user" | "session";

export interface RateLimitConfig {
  /** Tier key — determines default thresholds */
  tier: Tier;
  /** Override max requests per window */
  maxRequests?: number;
  /** Override window duration in seconds */
  windowSeconds?: number;
  /** Override block duration in seconds (how long to block after exceeding limit) */
  blockDurationSeconds?: number;
  /** Override burst allowance (extra requests allowed above max) */
  burst?: number;
  /** Custom endpoint name (defaults to the tier name) */
  endpoint?: string;
}

interface TierLimits {
  max: number;
  window: number;
  blockDuration: number;
  burst: number;
}

const TIER_DEFAULTS: Record<Tier, TierLimits> = {
  critical: { max: 30, window: 60, blockDuration: 120, burst: 5 },
  high: { max: 60, window: 60, blockDuration: 60, burst: 10 },
  medium: { max: 20, window: 60, blockDuration: 180, burst: 3 },
  low: { max: 100, window: 60, blockDuration: 30, burst: 20 },
};

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-real-ip, x-forwarded-for",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

/**
 * Extract the best available identifier from the request:
 * 1. user_id from body (if available)
 * 2. IP from x-forwarded-for or x-real-ip
 * 3. Fallback session ID
 */
function extractIdentifier(req: Request, body: Record<string, unknown>): { id: string; type: IdentifierType } {
  // Priority 1: user_id from request body
  if (body.user_id && typeof body.user_id === "string" && body.user_id.length > 0) {
    return { id: body.user_id, type: "user" };
  }

  // Priority 2: IP from headers
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (ip && ip.length > 0) return { id: ip, type: "ip" };
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.length > 0) return { id: realIp, type: "ip" };

  // Priority 3: fallback — generate a session ID from request headers
  const userAgent = req.headers.get("user-agent") || "unknown";
  const accept = req.headers.get("accept") || "";
  const sessionId = `anon-${userAgent.length}-${accept.length}-${Date.now()}`;
  return { id: sessionId, type: "session" };
}

/**
 * Rate limit check for Supabase Edge Functions.
 *
 * Call this at the start of your `serve` handler.
 * Returns `null` if the request is allowed, or a `Response` (status 429) if blocked.
 *
 * @example
 * ```ts
 * const rl = await checkRateLimit(req, supabaseClient, { tier: 'critical' });
 * if (rl) return rl; // rate limited
 * ```
 */
export async function checkRateLimit(
  req: Request,
  supabaseClient: ReturnType<typeof createClient>,
  config: RateLimitConfig,
): Promise<Response | null> {
  // Parse body once
  let body: Record<string, unknown> = {};
  try {
    if (req.method === "POST") {
      body = await req.clone().json();
    }
  } catch {
    // Body not JSON, continue with empty body
  }

  const { id: identifier, type: identifierType } = extractIdentifier(req, body);
  const limits = TIER_DEFAULTS[config.tier];
  const maxRequests = config.maxRequests ?? limits.max;
  const windowSeconds = config.windowSeconds ?? limits.window;
  const blockDurationSeconds = config.blockDurationSeconds ?? limits.blockDuration;
  const burst = config.burst ?? limits.burst;
  const endpoint = config.endpoint ?? config.tier;
  const threshold = maxRequests + burst;

  // ── 1. Check if currently blocked ──────────────────────────────────────
  const { data: blocked } = await supabaseClient
    .from("rate_limits")
    .select("blocked_until")
    .eq("identifier", identifier)
    .eq("identifier_type", identifierType)
    .eq("endpoint", endpoint)
    .gte("blocked_until", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (blocked?.blocked_until) {
    const retryAfter = new Date(blocked.blocked_until).getTime() - Date.now();
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: `Vượt quá giới hạn yêu cầu. Vui lòng thử lại sau ${Math.ceil(retryAfter / 1000)} giây.`,
        retry_after_ms: retryAfter,
        tier: config.tier,
      }),
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": String(Math.ceil(retryAfter / 1000)),
        },
      },
    );
  }

  // ── 2. Atomic increment — returns new request_count ─────────────────────
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * (windowSeconds * 1000)).toISOString();

  const { data: countResult, error: countError } = await supabaseClient.rpc("increment_rate_limit", {
    p_identifier: identifier,
    p_identifier_type: identifierType,
    p_endpoint: endpoint,
    p_tier: config.tier,
    p_window: windowStart,
  });

  if (countError) {
    console.error(`rate-limit: RPC error for ${identifier}:`, countError);
    // Fail open — allow the request if we can't check
    return null;
  }

  const currentCount = countResult as number;

  // ── 3. Check if over threshold — block if so ─────────────────────────────
  if (currentCount > threshold) {
    // Set blocked status
    await supabaseClient.rpc("block_identifier", {
      p_identifier: identifier,
      p_identifier_type: identifierType,
      p_endpoint: endpoint,
      p_block_duration: `${blockDurationSeconds} seconds`,
    }).catch((err: unknown) => console.error("rate-limit: block error:", err));

    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: `Vượt quá giới hạn yêu cầu. Bạn đã gửi ${currentCount} yêu cầu trong ${windowSeconds} giây (giới hạn: ${threshold}).`,
        retry_after_ms: blockDurationSeconds * 1000,
        tier: config.tier,
      }),
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": String(blockDurationSeconds),
        },
      },
    );
  }

  // ── 4. Warn at 80% capacity ────────────────────────────────────────────
  if (currentCount > Math.floor(threshold * 0.8)) {
    console.warn(`rate-limit: ${identifier} at ${currentCount}/${threshold} for ${endpoint}`);
  }

  return null;
}

export function createCorsResponse(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}
