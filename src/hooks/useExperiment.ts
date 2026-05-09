import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * useExperiment("homepage_cta_v1")
 * Returns the variant string assigned to current user (stable across calls).
 * Falls back to null while loading or when not authenticated.
 */
export function useExperiment(key: string) {
  const { user } = useAuth();
  const [variant, setVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setVariant(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any).rpc("assign_experiment_variant", {
          p_key: key,
        });
        if (!cancelled) setVariant((data as string) ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, key]);

  const log = useCallback(
    async (event: string, value?: number) => {
      if (!user) return;
      try {
        await (supabase as any).rpc("log_experiment_event", {
          p_key: key,
          p_event: event,
          p_value: value ?? null,
        });
      } catch {
        /* swallow */
      }
    },
    [user, key],
  );

  return { variant, loading, log };
}
