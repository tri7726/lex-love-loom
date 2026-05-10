import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route-level guard. Renders nothing (redirect to /auth) when unauthenticated,
 * so children are NEVER mounted → their data-fetch effects never run.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sakura" />
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
};

/**
 * Hook-level guard for shared hooks/services that may be used outside a
 * ProtectedRoute. Returns `{ ready }` — only `true` when auth has finished
 * loading AND a user is logged in. Use it to early-return inside fetch
 * effects so no API request fires for anonymous users:
 *
 *   const { ready, user } = useAuthGuard();
 *   useEffect(() => {
 *     if (!ready) return;
 *     supabase.from('mock_tests').select('*')...
 *   }, [ready]);
 */
export function useAuthGuard() {
  const { user, loading } = useAuth();
  return {
    user,
    loading,
    ready: !loading && !!user,
  };
}

export default ProtectedRoute;
