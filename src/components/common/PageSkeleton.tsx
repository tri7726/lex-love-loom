import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  variant?: 'list' | 'detail' | 'grid';
  rows?: number;
}

/**
 * Generic page skeleton — replace raw <Loader2 spin/> for better perceived perf.
 */
export const PageSkeleton: React.FC<Props> = ({ variant = 'list', rows = 5 }) => {
  if (variant === 'detail') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <Skeleton className="h-8 w-72" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] rounded-3xl" />
          <Skeleton className="h-[400px] rounded-3xl" />
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: rows * 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="space-y-3 mt-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
};
