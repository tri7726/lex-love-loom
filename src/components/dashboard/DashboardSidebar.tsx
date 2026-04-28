import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Book, Brain, Video, Zap,
  TrendingUp, Sparkles, ChevronRight, FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaderboard } from '@/components/Leaderboard';

interface DashboardSidebarProps {
  streak: number;
  quizzesCompleted: number;
  leaderboard: { rank: number; userId: string; username: string; xp: number; streak: number; avatar?: string; isCurrentUser: boolean }[];
  leaderboardLoading: boolean;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  streak,
  quizzesCompleted,
  leaderboard,
  leaderboardLoading,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      {/* Quick Stats */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-matcha" />
            Thống kê của bạn
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-sakura/10 text-center">
            <p className="text-2xl font-bold text-sakura">{streak}</p>
            <p className="text-xs text-muted-foreground">Ngày liên tiếp</p>
          </div>
          <div className="p-3 rounded-lg bg-matcha/10 text-center">
            <p className="text-2xl font-bold text-matcha">{quizzesCompleted}</p>
            <p className="text-xs text-muted-foreground">Bài tập đã làm</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Luyện tập nhanh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link to="/vocabulary">
            <Button variant="outline" className="w-full justify-between h-auto py-3">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sakura" />
                Từ vựng
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/reading">
            <Button variant="outline" className="w-full justify-between h-auto py-3">
              <span className="flex items-center gap-2">
                <Book className="h-4 w-4 text-indigo-500" />
                Luyện đọc
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/video-learning">
            <Button variant="outline" className="w-full justify-between h-auto py-3">
              <span className="flex items-center gap-2">
                <Video className="h-4 w-4 text-sky-500" />
                Học qua Video
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/sensei">
            <Button variant="outline" className="w-full justify-between h-auto py-3">
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-matcha" />
                Sensei Hub
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/quiz">
            <Button variant="outline" className="w-full justify-between h-auto py-3">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-gold" />
                Kiểm tra nhanh
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Tiện ích VIP */}
      <Card className="shadow-card overflow-hidden border-sakura/20">
        <CardHeader className="pb-2 bg-sakura/5">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sakura" />
            Tiện ích VIP
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          <Link to="/kanji-worksheet">
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-4 rounded-xl border-dashed border-sakura/30 hover:bg-sakura/5 hover:border-sakura transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-sakura/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-sakura" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Tạo Tập viết Kanji</p>
                  <p className="text-[10px] text-muted-foreground">Xuất PDF Worksheet VIP</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Full Leaderboard */}
      {leaderboardLoading ? (
        <div className="flex justify-center p-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : (
        <Leaderboard entries={leaderboard} />
      )}
    </motion.div>
  );
};
