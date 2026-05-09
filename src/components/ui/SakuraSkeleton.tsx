import React from 'react';
import { cn } from '@/lib/utils';

type SkeletonVariant = 'card' | 'list-item' | 'leaderboard-row' | 'news-card' | 'message-bubble';

interface SakuraSkeletonProps {
  variant: SkeletonVariant;
  count?: number;
  className?: string;
}

const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={cn('skeleton-shimmer', className)} />
);

const CardSkeleton = () => (
  <div className="rounded-xl border border-border p-4 space-y-3">
    <SkeletonBox className="h-5 w-2/3" />
    <SkeletonBox className="h-4 w-full" />
    <SkeletonBox className="h-4 w-4/5" />
    <SkeletonBox className="h-4 w-3/5" />
  </div>
);

const ListItemSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <SkeletonBox className="h-10 w-10 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <SkeletonBox className="h-4 w-1/3" />
      <SkeletonBox className="h-3 w-1/2" />
    </div>
  </div>
);

const LeaderboardRowSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <SkeletonBox className="h-6 w-6 rounded-md shrink-0" />
    <SkeletonBox className="h-9 w-9 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <SkeletonBox className="h-4 w-1/3" />
      <SkeletonBox className="h-2 w-2/3 rounded-full" />
    </div>
    <SkeletonBox className="h-5 w-16 rounded-full shrink-0" />
  </div>
);

const NewsCardSkeleton = () => (
  <div className="rounded-xl border border-border overflow-hidden">
    <SkeletonBox className="h-48 w-full rounded-none" />
    <div className="p-5 space-y-3">
      <SkeletonBox className="h-3 w-1/4" />
      <SkeletonBox className="h-5 w-full" />
      <SkeletonBox className="h-5 w-4/5" />
      <SkeletonBox className="h-4 w-full" />
      <SkeletonBox className="h-4 w-3/4" />
    </div>
  </div>
);

const MessageBubbleSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="flex items-end gap-2">
      <SkeletonBox className="h-8 w-8 rounded-full shrink-0" />
      <SkeletonBox className="h-12 w-48 rounded-2xl rounded-bl-none" />
    </div>
    <div className="flex items-end gap-2 flex-row-reverse">
      <SkeletonBox className="h-10 w-36 rounded-2xl rounded-br-none" />
    </div>
    <div className="flex items-end gap-2">
      <SkeletonBox className="h-8 w-8 rounded-full shrink-0" />
      <SkeletonBox className="h-8 w-56 rounded-2xl rounded-bl-none" />
    </div>
  </div>
);

const VARIANT_MAP: Record<SkeletonVariant, React.FC> = {
  'card': CardSkeleton,
  'list-item': ListItemSkeleton,
  'leaderboard-row': LeaderboardRowSkeleton,
  'news-card': NewsCardSkeleton,
  'message-bubble': MessageBubbleSkeleton,
};

export const SakuraSkeleton: React.FC<SakuraSkeletonProps> = ({
  variant,
  count = 1,
  className,
}) => {
  const VariantComponent = VARIANT_MAP[variant];
  return (
    <div
      className={cn('w-full', className)}
      aria-busy="true"
      aria-label="Đang tải..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <VariantComponent key={i} />
      ))}
    </div>
  );
};
