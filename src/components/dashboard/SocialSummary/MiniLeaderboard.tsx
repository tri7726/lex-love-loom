import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  xp: number;
  streak: number;
  avatar?: string;
  isCurrentUser: boolean;
}

interface MiniLeaderboardProps {
  entries: LeaderboardEntry[];
  loading?: boolean;
}

export const MiniLeaderboard: React.FC<MiniLeaderboardProps> = ({ entries, loading }) => {
  if (loading) {
    return (
      <Card className="border-2 border-gold/20 bg-card/40 backdrop-blur-sm shadow-soft overflow-hidden flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const myEntry = entries.find(e => e.isCurrentUser);
  const myRank = myEntry?.rank ?? null;
  const nextEntry = myRank && myRank > 1 ? entries.find(e => e.rank === myRank - 1) : null;
  const xpGap = myEntry && nextEntry ? Math.max(0, nextEntry.xp - myEntry.xp) : null;
  const rankBadge = myRank === 1 ? 'GIẢI VÀNG' : myRank === 2 ? 'GIẢI BẠC' : myRank === 3 ? 'GIẢI ĐỒNG' : `Hạng ${myRank ?? '?'}`;
  const badgeColor = myRank === 1 ? 'bg-amber-400' : myRank === 2 ? 'bg-slate-400' : myRank === 3 ? 'bg-orange-600' : 'bg-muted-foreground';

  return (
    <Card className="border-2 border-gold/20 bg-card/40 backdrop-blur-sm shadow-soft overflow-hidden flex flex-col group hover:shadow-elevated transition-all">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gold" />
          Bảng xếp hạng
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="text-center py-2">
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Hạng hiện tại</p>
          <p className="text-4xl font-black text-gold">#{myRank ?? '?'}</p>
          <Badge className={`${badgeColor} mt-2 text-[10px] font-bold text-white`}>{rankBadge}</Badge>
          {nextEntry && xpGap !== null && xpGap > 0 && (
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-[10px] font-bold">
                <span>Lên TOP {myRank! - 1}</span>
                <span className="text-primary font-black">+{xpGap} XP</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, 100 - (xpGap / Math.max(1, nextEntry.xp)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t border-border/50 mt-auto">
        <Link to="/leagues" className="w-full">
          <Button variant="ghost" className="w-full text-xs font-bold gap-2 hover:bg-gold/5">
            Ghé thăm League <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
