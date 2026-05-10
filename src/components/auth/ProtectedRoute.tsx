import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Spinner xuất hiện sau khoảng này (ms) để tránh nháy khi loading kết thúc nhanh. */
  spinnerDelayMs?: number;
}

/**
 * Route-level guard.
 * - Nếu `loading` kết thúc trong `spinnerDelayMs` → không render gì (không nháy spinner).
 * - Nếu vượt ngưỡng → hiện spinner.
 * - Nếu đã xong và không có user → redirect `/auth?redirect=...`.
 * - Nếu có user → render children. Children chỉ mount khi đã xác thực,
 *   nên các useEffect / fetch bên trong tự động chạy lại đúng lúc đăng nhập xong.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  spinnerDelayMs = 200,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [showSpinner, setShowSpinner] = React.useState(false);

  React.useEffect(() => {
    if (!loading) {
      setShowSpinner(false);
      return;
    }
    const t = window.setTimeout(() => setShowSpinner(true), spinnerDelayMs);
    return () => window.clearTimeout(t);
  }, [loading, spinnerDelayMs]);

  if (loading) {
    if (!showSpinner) return null; // tránh nháy: chờ qua ngưỡng mới hiện UI
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
 * Hook-level guard — dùng trong các shared hook/service có thể được gọi
 * ngoài route đã bảo vệ. Trả về `ready=true` khi auth load xong VÀ có user.
 *
 * @example
 *   const { ready } = useAuthGuard();
 *   useEffect(() => {
 *     if (!ready) return;          // bail trước mọi network call
 *     supabase.from('mock_tests').select('*');
 *   }, [ready]);
 */
export function useAuthGuard() {
  const { user, loading } = useAuth();
  return { user, loading, ready: !loading && !!user };
}

/**
 * Helper cho service/fetch helper thuần (không phải hook).
 * Throw lỗi rõ ràng khi không có user, để các caller bail sớm và không
 * phát request thừa. Dùng kèm `supabase.auth.getSession()` ở đầu hàm fetch.
 *
 * @example
 *   export async function fetchMockTests() {
 *     const { data: { session } } = await supabase.auth.getSession();
 *     requireUser(session?.user);
 *     return supabase.from('mock_tests').select('*');
 *   }
 */
export function requireUser<T>(user: T | null | undefined): asserts user is T {
  if (!user) {
    throw new Error("AUTH_REQUIRED: must be signed in");
  }
}

export default ProtectedRoute;
