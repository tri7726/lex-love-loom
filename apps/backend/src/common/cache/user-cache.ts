/**
 * Simple per-user TTL cache with bounded size. Used by data modules to memoize
 * list/detail queries within a short window. Keyed by `userId|namespace|extra`.
 *
 * Designed for low cardinality (a few entries per user) — invalidate on writes.
 */
export interface UserCacheOptions {
  ttlMs?: number;
  /** Hard cap on entries per user before LRU eviction kicks in. */
  maxPerUser?: number;
}

interface Entry<T> {
  value: T;
  exp: number;
}

export class UserCache<T> {
  private readonly buckets = new Map<string, Map<string, Entry<T>>>();
  private readonly ttl: number;
  private readonly maxPerUser: number;

  constructor(opts: UserCacheOptions = {}) {
    this.ttl = opts.ttlMs ?? 30_000;
    this.maxPerUser = opts.maxPerUser ?? 32;
  }

  get(userId: string, key: string): T | undefined {
    const bucket = this.buckets.get(userId);
    if (!bucket) return undefined;
    const hit = bucket.get(key);
    if (!hit) return undefined;
    if (hit.exp < Date.now()) {
      bucket.delete(key);
      return undefined;
    }
    // LRU touch — re-insert to move to end of insertion order.
    bucket.delete(key);
    bucket.set(key, hit);
    return hit.value;
  }

  set(userId: string, key: string, value: T): void {
    let bucket = this.buckets.get(userId);
    if (!bucket) {
      bucket = new Map();
      this.buckets.set(userId, bucket);
    }
    if (bucket.size >= this.maxPerUser) {
      const firstKey = bucket.keys().next().value;
      if (firstKey !== undefined) bucket.delete(firstKey);
    }
    bucket.set(key, { value, exp: Date.now() + this.ttl });
  }

  /** Drop every entry for a given user (call after a write). */
  invalidate(userId: string): void {
    this.buckets.delete(userId);
  }

  /** Drop entries matching a key prefix for a user. */
  invalidatePrefix(userId: string, prefix: string): void {
    const bucket = this.buckets.get(userId);
    if (!bucket) return;
    for (const k of bucket.keys()) {
      if (k.startsWith(prefix)) bucket.delete(k);
    }
  }
}
