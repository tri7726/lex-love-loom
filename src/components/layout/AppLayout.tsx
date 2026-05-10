import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/navigation/Navigation';
import { BottomNav } from '@/components/navigation/BottomNav';
import { KeyboardShortcuts } from '@/components/common/KeyboardShortcuts';
import { FloatingPet } from '@/components/pet/FloatingPet';
import { SakuraPageLayout } from './SakuraPageLayout';
import { AnimatePresence } from 'framer-motion';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading } = useProfile();

  // Auto-redirect new users to onboarding (chỉ chạy 1 lần khi profile sẵn sàng)
  useEffect(() => {
    if (loading || !user || !profile) return;
    if (profile.onboarded === false && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true });
    } else if (profile.onboarded === true && location.pathname === '/onboarding') {
      navigate('/', { replace: true });
    }
  }, [profile, loading, user, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-background pb-[72px] md:pb-0 font-sans selection:bg-sakura-light selection:text-sakura-dark">
      <Navigation />
      <main className="relative">
        <AnimatePresence mode="wait">
          <SakuraPageLayout key={location.pathname}>
            <Outlet />
          </SakuraPageLayout>
        </AnimatePresence>
      </main>
      <FloatingPet />
      <BottomNav />
      <KeyboardShortcuts />
    </div>
  );
};
