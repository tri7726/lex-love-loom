/**
 * analytics.ts — Lightweight client-side event tracking
 *
 * Events are stored in localStorage under the key 'sakura_analytics'
 * and mirrored to window.__analyticsLog for inspection in DevTools.
 * No external service required.
 */

export interface AnalyticsEvent {
  event: string;
  ts: string; // ISO 8601
  [key: string]: unknown;
}

const STORAGE_KEY = 'sakura_analytics';
const MAX_EVENTS = 500; // rolling buffer to avoid unbounded growth

declare global {
  interface Window {
    __analyticsLog?: AnalyticsEvent[];
  }
}

function loadLog(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function saveLog(log: AnalyticsEvent[]): void {
  try {
    // Keep only the most recent MAX_EVENTS entries
    const trimmed = log.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.__analyticsLog = trimmed;
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

/**
 * Track an analytics event.
 *
 * @param eventName  Short snake_case event name
 * @param properties Additional key-value metadata
 *
 * @example
 * trackEvent('review_widget_start_click', { due_count: 5 });
 */
export function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {}
): void {
  const entry: AnalyticsEvent = {
    event: eventName,
    ts: new Date().toISOString(),
    ...properties,
  };

  const log = loadLog();
  log.push(entry);
  saveLog(log);

  if (import.meta.env.DEV) {
    console.debug('[analytics]', entry);
  }
}

/**
 * Retrieve all stored events (useful for debugging or batch sends).
 */
export function getAnalyticsLog(): AnalyticsEvent[] {
  return loadLog();
}

/**
 * Clear all stored events.
 */
export function clearAnalyticsLog(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.__analyticsLog = [];
}
