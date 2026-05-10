import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, GraduationCap, Map as MapIcon, Trophy, User, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

const items = [
  { path: '/', icon: Home, label: 'Trang chủ' },
  { path: '/my-classes', icon: GraduationCap, label: 'Khóa học' },
  { path: '/learning-path', icon: MapIcon, label: 'Lộ trình' },
  { path: '/leagues', icon: Trophy, label: 'Bảng XH' },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { profile } = useProfile();
  const { user } = useAuth();

  if (!user) return null;

  const dynamicItems = [...items];
  
  if (profile?.role === 'admin') {
    dynamicItems.push({ path: '/admin', icon: ShieldCheck, label: 'Hệ thống' });
    dynamicItems.push({ path: '/teacher', icon: GraduationCap, label: 'Dạy học' });
  } else if (profile?.role === 'teacher') {
    dynamicItems.push({ path: '/teacher', icon: GraduationCap, label: 'Dạy học' });
  }

  // Remove redundant items if needed to keep it clean (limit to 5)
  const displayItems = dynamicItems.slice(0, 5);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-sakura-light/30 bg-cream/95 backdrop-blur-xl supports-[backdrop-filter]:bg-cream/80"
      aria-label="Thanh điều hướng dưới"
    >
      <div className="flex items-stretch justify-around h-[72px] max-w-md mx-auto px-2">
        {displayItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-1.5 transition-all duration-200 active:scale-95',
                isActive ? 'text-sakura' : 'text-muted-foreground hover:text-sakura'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-colors",
                isActive ? "bg-sakura/10" : "bg-transparent"
              )}>
                <Icon className={cn('h-6 w-6', isActive && 'fill-sakura/10')} />
              </div>
              <span className="text-[11px] font-bold tracking-tight truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
