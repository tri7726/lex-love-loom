import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { SakuraPageLayout } from './SakuraPageLayout';
import { AnimatePresence } from 'framer-motion';

export const AppLayout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 font-sans selection:bg-sakura-light selection:text-sakura-dark">
      <Navigation />
      <main className="relative">
        <AnimatePresence mode="wait">
          <SakuraPageLayout key={location.pathname}>
            <Outlet />
          </SakuraPageLayout>
        </AnimatePresence>
      </main>
    </div>
  );
};

