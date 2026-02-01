import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, Star, Target, Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakBadgeProps {
  streak: number;
  className?: string;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  streak,
  className,
}) => {
  const getStreakColor = () => {
    if (streak >= 30) return 'from-amber-500 to-orange-600';
    if (streak >= 14) return 'from-orange-400 to-red-500';
    if (streak >= 7) return 'from-sakura to-crimson';
    return 'from-primary to-sakura';
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r text-primary-foreground font-semibold shadow-soft',
        getStreakColor(),
        className
      )}
    >
      <Flame className="h-5 w-5 animate-bounce-soft" />
      <span>{streak} Day Streak!</span>
    </motion.div>
  );
};

interface AchievementBadgeProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  icon,
  title,
  description,
  unlocked,
  progress,
  maxProgress,
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'p-4 rounded-xl border-2 transition-all duration-300',
        unlocked
          ? 'bg-gradient-to-br from-gold-light/20 to-gold/10 border-gold/30 shadow-soft'
          : 'bg-muted/30 border-border opacity-60 grayscale'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-3 rounded-lg',
            unlocked ? 'bg-gradient-to-br from-gold to-amber-400 text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>

          {progress !== undefined && maxProgress !== undefined && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>{progress}</span>
                <span>{maxProgress}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress / maxProgress) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={cn(
                    'h-full rounded-full',
                    unlocked ? 'bg-gold' : 'bg-primary'
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const achievements = [
  {
    id: 'first-lesson',
    icon: <Star className="h-5 w-5" />,
    title: 'First Steps',
    description: 'Complete your first lesson',
  },
  {
    id: 'week-streak',
    icon: <Flame className="h-5 w-5" />,
    title: 'On Fire',
    description: '7 day streak',
  },
  {
    id: 'vocab-master',
    icon: <Target className="h-5 w-5" />,
    title: 'Vocabulary Master',
    description: 'Learn 100 words',
  },
  {
    id: 'quiz-ace',
    icon: <Zap className="h-5 w-5" />,
    title: 'Quiz Ace',
    description: 'Get 10 perfect quizzes',
  },
  {
    id: 'kanji-king',
    icon: <Crown className="h-5 w-5" />,
    title: 'Kanji King',
    description: 'Master 50 kanji',
  },
  {
    id: 'month-streak',
    icon: <Trophy className="h-5 w-5" />,
    title: 'Dedicated Learner',
    description: '30 day streak',
  },
];

export default StreakBadge;
