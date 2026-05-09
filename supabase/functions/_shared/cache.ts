// @ts-nocheck: Deno shared module
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cache-aside implementation using Supabase 'ai_cache' table
 */
export async function withCache<T>(
  supabase: any,
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  try {
    // 1. Try to get from cache
    const { data: cached, error: getError } = await supabase
      .from("ai_cache")
      .select("cache_value, expires_at")
      .eq("cache_key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached && !getError) {
      console.log(`Cache HIT: ${key}`);
      return cached.cache_value as T;
    }

    if (getError && getError.code !== "PGRST116") {
      console.warn(`Cache error (get) for ${key}:`, getError);
    }
  } catch (e) {
    console.warn(`Cache exception (get) for ${key}:`, e);
  }

  // 2. Cache miss or error -> Fetch fresh data
  console.log(`Cache MISS: ${key}`);
  const freshData = await fetchFn();

  // 3. Store in cache (fire and forget)
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    supabase
      .from("ai_cache")
      .upsert({
        cache_key: key,
        cache_value: freshData,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
      .then(({ error }: any) => {
        if (error) console.warn(`Cache error (set) for ${key}:`, error);
      });
  } catch (e) {
    console.warn(`Cache exception (set) for ${key}:`, e);
  }

  return freshData;
}
