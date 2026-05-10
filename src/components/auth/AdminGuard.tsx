import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';

interface AdminGuardProps {
  children: React.ReactNode;
  /** Spinner xuất hiện sau khoảng này (ms) để tránh nháy. */
  spinnerDelayMs?: number;
}

/**
 * Route-level guard cho khu vực /admin.
 * - Đang loading → không nháy spinner trong `spinnerDelayMs` đầu.
 * - Chưa đăng nhập → redirect `/auth?redirect=...`.
 * - Đăng nhập nhưng không phải admin → hiện UI "Không có quyền".
 * - Là admin → render children.
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({
  children,
  spinnerDelayMs = 200,
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const location = useLocation();
  const [showSpinner, setShowSpinner] = React.useState(false);

  const loading = authLoading || (!!user && roleLoading);

  React.useEffect(() => {
    if (!loading) {
      setShowSpinner(false);
      return;
    }
    const t = window.setTimeout(() => setShowSpinner(true), spinnerDelayMs);
    return () => window.clearTimeout(t);
  }, [loading, spinnerDelayMs]);

  if (loading) {
    if (!showSpinner) return null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sakura" />
          <p className="text-sm text-muted-foreground">Đang xác thực quyền…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold">Không có quyền truy cập</h1>
          <p className="text-sm text-muted-foreground">
            Khu vực này chỉ dành cho quản trị viên. Nếu bạn cho rằng đây là nhầm lẫn,
            vui lòng liên hệ quản trị viên hệ thống.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-sakura px-5 py-2.5 text-sm font-semibold text-white hover:bg-sakura/90 transition"
          >
            Quay về trang chính
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
