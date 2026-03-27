import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  xp: number;
  streak: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  title?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'all-time';
}

export const Leaderboard = forwardRef<HTMLDivElement, LeaderboardProps>(({
  entries,
  title = 'Leaderboard',
  period = 'weekly',
}, ref) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gray-50 border-gray-200';
      case 3:
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-white border-gray-100';
    }
  };

  const periodLabels = {
    daily: 'Hôm nay',
    weekly: 'Tuần này',
    monthly: 'Tháng này',
    'all-time': 'Tất cả',
  };

  return (
    <Card ref={ref} className="bg-white/80 backdrop-blur-sm border-sakura/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {title}
          </CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {periodLabels[period]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Chưa có dữ liệu
          </p>
        ) : (
          entries.map((entry) => (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: entry.rank * 0.1 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                getRankBg(entry.rank),
                entry.isCurrentUser && 'ring-2 ring-primary/30'
              )}
            >
              <div className="w-8 text-center font-bold text-sm">
                {getRankIcon(entry.rank) || `#${entry.rank}`}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarImage src={entry.avatar} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {entry.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  entry.isCurrentUser && 'text-primary font-bold'
                )}>
                  {entry.username}
                  {entry.isCurrentUser && ' (Bạn)'}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {entry.streak > 0 && (
                  <span className="flex items-center gap-1 text-orange-500">
                    <Flame className="h-3.5 w-3.5" />
                    {entry.streak}
                  </span>
                )}
                <span className="font-bold text-primary">{entry.xp} XP</span>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
});

Leaderboard.displayName = 'Leaderboard';
