import React from 'react';
import { cn } from '@/lib/utils';

interface SakuraPageLayoutProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: '7xl' | '6xl' | '5xl' | '4xl' | 'full' | '1600px';
  noPadding?: boolean;
}

export const SakuraPageLayout: React.FC<SakuraPageLayoutProps> = ({
  children,
  className,
  maxWidth = '7xl',
  noPadding = false,
}) => {
  const maxWidthClass = {
    '7xl': 'max-w-7xl',
    '6xl': 'max-w-6xl',
    '5xl': 'max-w-5xl',
    '4xl': 'max-w-4xl',
    'full': 'max-w-full',
    '1600px': 'max-w-[1600px]',
  }[maxWidth];

  return (
    <div
      className={cn(
        'mx-auto w-full transition-all duration-300',
        maxWidthClass,
        !noPadding && 'px-4 sm:px-6 lg:px-8 py-6 md:py-10',
        className
      )}
    >
      {children}
    </div>
  );
};
