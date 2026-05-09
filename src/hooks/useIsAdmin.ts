import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Canonical admin check using public.has_role(uid, 'admin') RPC.
 * Avoids race conditions with profile loading.
 */
export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setIsAdmin(false); setLoading(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase.rpc("has_role", {
          p_user_id: user.id,
          p_role: "admin",
        });
        if (cancelled) return;
        if (error) { console.warn("[useIsAdmin]", error); setIsAdmin(false); }
        else setIsAdmin(!!data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { isAdmin: !!isAdmin, loading };
}
