import React from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

interface TeacherGuardProps {
  children: React.ReactNode;
  /** redirect path nếu không đủ quyền */
  fallback?: string;
}

/**
 * Bảo vệ route chỉ dành cho teacher và admin.
 * - Đang loading: hiện spinner
 * - Không đủ quyền: redirect về fallback (mặc định '/')
 */
export const TeacherGuard: React.FC<TeacherGuardProps> = ({
  children,
  fallback = '/',
}) => {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const role = profile?.role;
  if (role !== 'teacher' && role !== 'admin') {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};
