import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyQuests } from '@/components/dashboard/DailyQuests';
import { SkillHeatmap } from '@/components/analytics/SkillHeatmap';
import { MiniLeaderboard } from './MiniLeaderboard';
import { SquadActivity } from './SquadActivity';
import { FriendsMiniList } from './FriendsMiniList';

interface SocialSummaryProps {
  leaderboard: { rank: number; userId: string; username: string; xp: number; streak: number; avatar?: string; isCurrentUser: boolean }[];
  leaderboardLoading: boolean;
  friends: { user_id?: string; display_name?: string; avatar_url?: string }[];
}

export const SocialSummary: React.FC<SocialSummaryProps> = ({ leaderboard, leaderboardLoading, friends }) => {
  return (
    <section className="space-y-6 pt-4">
      <div className="flex items-center justify-between px-1 border-l-4 border-primary pl-4">
        <h2 className="text-2xl font-display font-bold">Cộng đồng & Mục tiêu</h2>
        <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">Social Hub</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <DailyQuests />

        <Card className="lg:col-span-2 border-2 border-primary/20 bg-card/40 backdrop-blur-sm shadow-soft overflow-hidden flex flex-col group transition-all hover:bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Hoạt động học tập
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <SkillHeatmap />
          </CardContent>
        </Card>

        <MiniLeaderboard entries={leaderboard} loading={leaderboardLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SquadActivity />
        <FriendsMiniList friends={friends} />
      </div>
    </section>
  );
};
