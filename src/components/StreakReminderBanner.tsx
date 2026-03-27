import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X, BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useStreakReminder } from '@/hooks/useStreakReminder';
import { cn } from '@/lib/utils';

export const StreakReminderBanner = forwardRef<HTMLDivElement>((_, ref) => {
  const { state, currentStreak, dismiss } = useStreakReminder();

  if (state === 'none') return null;

  const config = {
    not_started: {
      bg: 'bg-primary/10 border-primary/20',
      icon: <BookOpen className="h-5 w-5 text-primary" />,
      title: 'Bắt đầu học hôm nay!',
      body: 'Chỉ cần 5 phút mỗi ngày để xây dựng thói quen học tiếng Nhật.',
      cta: 'Học ngay',
      ctaClass: 'bg-primary text-white hover:bg-primary/90',
    },
    streak_warning: {
      bg: 'bg-orange-500/10 border-orange-500/20',
      icon: <Flame className="h-5 w-5 text-orange-500" />,
      title: `🔥 Streak ${currentStreak} ngày sắp mất!`,
      body: 'Bạn chưa học hôm nay. Học ngay để giữ streak nhé!',
      cta: 'Giữ streak',
      ctaClass: 'bg-orange-500 text-white hover:bg-orange-600',
    },
    streak_lost: {
      bg: 'bg-destructive/10 border-destructive/20',
      icon: <Zap className="h-5 w-5 text-destructive" />,
      title: 'Streak đã bị reset 😢',
      body: 'Đừng nản lòng! Bắt đầu lại streak mới ngay hôm nay.',
      cta: 'Bắt đầu lại',
      ctaClass: 'bg-destructive text-white hover:bg-destructive/90',
    },
  };

  const c = config[state];
  if (!c) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn('relative rounded-xl border p-4 flex items-center gap-4', c.bg)}
      >
        <div className="shrink-0">{c.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">{c.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{c.body}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" className={cn('text-xs', c.ctaClass)}>
            <Link to="/vocabulary">{c.cta}</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={dismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

StreakReminderBanner.displayName = 'StreakReminderBanner';
