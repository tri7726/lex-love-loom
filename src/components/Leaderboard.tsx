import React from 'react';
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

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  title = 'Leaderboard',
  period = 'weekly',
}) => {
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
        return 'bg-gradient-to-r from-yellow-100 to-amber-50 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-100 to-slate-50 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-amber-100 to-orange-50 border-amber-300';
      default:
        return 'bg-card border-border';
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            {title}
          </CardTitle>
          <span className="text-sm text-muted-foreground capitalize">
            {period}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-all',
              getRankBg(entry.rank),
              entry.isCurrentUser && 'ring-2 ring-primary ring-offset-2'
            )}
          >
            <div className="w-8 flex justify-center">
              {getRankIcon(entry.rank) || (
                <span className="text-lg font-bold text-muted-foreground">
                  {entry.rank}
                </span>
              )}
            </div>

            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarImage src={entry.avatar} alt={entry.username} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {entry.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'font-medium truncate',
                  entry.isCurrentUser && 'text-primary'
                )}
              >
                {entry.username}
                {entry.isCurrentUser && (
                  <span className="ml-1 text-xs text-primary">(You)</span>
                )}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  {entry.streak}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="font-bold text-lg">{entry.xp.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
