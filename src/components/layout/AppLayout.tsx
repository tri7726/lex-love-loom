import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <main>
        <Outlet />
      </main>
    </div>
  );
};
