import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Crown, 
  TrendingUp, 
  ChevronUp, 
  ChevronDown, 
  Minus,
  Timer,
  Info,
  Award,
  History as HistoryIcon,
} from 'lucide-react';
import { SakuraSkeleton } from '@/components/ui/SakuraSkeleton';
import { Navigation } from '@/components/Navigation';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LeaderboardUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  current_streak: number;
  jlpt_level: string | null;
}

const LEAGUES = [
  { name: 'Đồng', color: 'bg-amber-700', icon: <Award className="h-6 w-6" />, active: false },
  { name: 'Bạc', color: 'bg-slate-400', icon: <Award className="h-6 w-6" />, active: true },
  { name: 'Vàng', color: 'bg-yellow-400', icon: <Award className="h-6 w-6" />, active: false },
  { name: 'Kim Cương', color: 'bg-cyan-400', icon: <Crown className="h-6 w-6" />, active: false },
];

export const Leagues = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myXp, setMyXp] = useState<number>(0);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, total_xp, current_streak, jlpt_level')
          .order('total_xp', { ascending: false })
          .limit(20);

        if (error) throw error;

        const users = (data ?? []) as LeaderboardUser[];
        setLeaderboard(users);

        if (user) {
          const rank = users.findIndex((u) => u.user_id === user.id);
          if (rank !== -1) {
            setMyRank(rank + 1);
            setMyXp(users[rank].total_xp);
          } else {
            // User not in top 20 — fetch their own XP separately
            const { data: myData } = await supabase
              .from('profiles')
              .select('total_xp')
              .eq('user_id', user.id)
              .single();
            if (myData) setMyXp((myData as { total_xp: number }).total_xp);
          }
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user]);

  const top3Xp = leaderboard[2]?.total_xp ?? 0;
  const xpToTop3 = myRank && myRank <= 3 ? 0 : Math.max(0, top3Xp - myXp + 1);
  const progressToTop3 = top3Xp > 0 ? Math.min(100, (myXp / top3Xp) * 100) : 0;

  const getZoneLabel = (idx: number, total: number) => {
    if (idx < 3) return { label: 'Thăng hạng', color: 'text-gold', border: 'border-l-gold bg-gold/[0.02]' };
    if (idx >= total - 2) return { label: 'Xuống hạng', color: 'text-red-400', border: 'border-l-red-400 bg-red-400/[0.02]' };
    return null;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <main className="container py-10 space-y-8">
        <section className="text-center max-w-2xl mx-auto space-y-4">
          <Badge className="bg-primary/20 text-primary border-primary/30 font-display px-4 py-1">
            Learning Leagues
          </Badge>
          <h1 className="text-4xl font-display font-bold">Bảng xếp hạng giải đấu</h1>
          <p className="text-muted-foreground">
            Thi đua cùng những người học khác để thăng hạng và nhận phần thưởng độc quyền vào cuối tuần.
          </p>
        </section>

        {/* League Selector */}
        <div className="flex justify-center gap-4 overflow-x-auto pb-4 scrollbar-none">
          {LEAGUES.map((league) => (
            <motion.div 
              key={league.name}
              whileHover={{ y: -5 }}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl min-w-[100px] border-2 transition-all",
                league.active
                  ? "bg-card border-primary shadow-elevated scale-110 z-10"
                  : "bg-card/40 border-transparent opacity-60 grayscale"
              )}
            >
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg", league.color)}>
                {league.icon}
              </div>
              <span className="text-xs font-black uppercase tracking-widest">{league.name}</span>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 border-sakura/20 bg-white/40 dark:bg-card/20 backdrop-blur-md shadow-elevated overflow-hidden rounded-[2.5rem]">
              <CardHeader className="bg-sakura/5 flex flex-row items-center justify-between pb-6 border-b border-sakura/10">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-display font-black flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg shadow-gold/20">
                      <Trophy className="h-5 w-5 text-white" />
                    </div>
                    Giải Bạc - Tuần 8
                  </CardTitle>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> Kết thúc sau: 2 ngày, 6 giờ</span>
                    <span className="flex items-center gap-1.5 text-sakura"><TrendingUp className="h-3.5 w-3.5" /> Top 3 thăng hạng</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <SakuraSkeleton variant="leaderboard-row" count={5} />
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="divide-y divide-sakura/10"
                  >
                    {leaderboard.map((u, idx) => {
                      const isMe = user?.id === u.user_id;
                      const zone = getZoneLabel(idx, leaderboard.length);

                      return (
                        <div
                          key={u.user_id}
                          className={cn(
                            "p-5 flex items-center justify-between transition-all group cursor-pointer relative",
                            isMe ? "bg-sakura/5" : "hover:bg-sakura/[0.03]",
                            zone ? `border-l-4 ${zone.border}` : ""
                          )}
                        >
                          {zone && (
                            <div className={cn("absolute top-2 left-2 text-[8px] font-black uppercase tracking-tighter", zone.color)}>
                              {zone.label}
                            </div>
                          )}

                          <div className="flex items-center gap-5">
                            <span className={cn(
                              "w-8 text-center font-black italic",
                              idx < 3 ? "text-sakura text-xl" : "text-muted-foreground/40 text-sm"
                            )}>
                              {idx + 1}
                            </span>
                            <div className="relative">
                              <Avatar className={cn(
                                "h-12 w-12 border-2 transition-transform duration-300 group-hover:scale-110",
                                isMe ? "border-sakura shadow-lg shadow-sakura/20 scale-105" :
                                idx < 3 ? "border-gold/50" : "border-background"
                              )}>
                                <AvatarImage src={u.avatar_url ?? ''} />
                                <AvatarFallback className="font-bold">
                                  {(u.display_name ?? '?')[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {idx === 0 && <Crown className="absolute -top-3.5 -right-3.5 h-6 w-6 text-gold drop-shadow-md z-10" />}
                            </div>
                            <div className="space-y-1">
                              <p className={cn("font-black text-sm transition-colors", isMe ? "text-sakura" : "group-hover:text-sakura")}>
                                {u.display_name ?? 'Người dùng'}
                                {isMe && <span className="ml-1 text-[10px] font-bold text-sakura/70">(Bạn)</span>}
                              </p>
                              <div className="flex items-center gap-2">
                                {u.jlpt_level && (
                                  <Badge variant="outline" className="text-[9px] h-4 py-0 font-black border-sakura/20 text-sakura-dark bg-sakura/5">
                                    {u.jlpt_level.toUpperCase()}
                                  </Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                  <Minus className="h-3.5 w-3.5 text-muted-foreground/50" />
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-xl italic tracking-tight text-foreground/80">
                              {u.total_xp.toLocaleString()}
                            </p>
                            <p className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.2em]">XP POINTS</p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </CardContent>
            </Card>

            <section className="grid sm:grid-cols-2 gap-6">
              <Card className="border-2 border-border bg-card/40 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-muted/50 pb-3">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <Award className="h-4 w-4 text-gold" /> PHẦN THƯỞNG TUẦN
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {[
                    { rank: 'Top 1', prize: '500 Đá Sakura + Huy hiệu Vàng', icon: '💎' },
                    { rank: 'Top 2-3', prize: '300 Đá Sakura + Huy hiệu Bạc', icon: '✨' },
                    { rank: 'Top 4-10', prize: '100 Đá Sakura', icon: '🌸' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 rounded-xl bg-background/50 border border-border/50">
                      <span className="font-black text-sakura">{p.rank}</span>
                      <span className="text-muted-foreground font-bold flex items-center gap-2">
                        {p.prize} <span>{p.icon}</span>
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-2 border-border bg-card/40 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-muted/50 pb-3">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" /> LUẬT CỦA GIẢI ĐẤU
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {[
                    'Cày XP từ các bài học để leo hạng.',
                    'Giải đấu kết thúc vào 20:00 Chủ Nhật.',
                    'Top 3 người đứng đầu sẽ được thăng hạng.',
                    '2 người cuối bảng sẽ bị xuống hạng.',
                  ].map((rule, i) => (
                    <div key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                      <p className="font-medium">{rule}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          </div>

          <aside className="space-y-6">
            <Card className="border-2 border-sakura shadow-elevated bg-sakura text-white overflow-hidden relative group">
              <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-125 transition-transform duration-700">
                <Award className="h-40 w-40" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-[0.2em] font-black text-white/50">Trạng thái của bạn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-4xl font-black italic">
                      {myRank ? `HẠNG #${myRank}` : loading ? '...' : 'Chưa có'}
                    </p>
                    <p className="text-xs text-white/70 font-bold uppercase tracking-widest">
                      {myRank && myRank <= 3
                        ? 'Khu vực thăng hạng'
                        : myRank && myRank > (leaderboard.length - 2)
                        ? 'Khu vực nguy hiểm'
                        : 'Khu vực an toàn'}
                    </p>
                  </div>
                  <div className="h-16 w-16 rounded-[1.5rem] bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner text-white">
                    <Award className="h-10 w-10" />
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Mục tiêu Lên TOP 3</span>
                    <span>{xpToTop3 > 0 ? `Thiếu ${xpToTop3.toLocaleString()} XP` : 'Đã đạt!'}</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToTop3}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-6 relative z-10">
                <Link to="/vocabulary" className="w-full">
                  <Button className="w-full h-12 rounded-[1rem] bg-white text-sakura hover:bg-white/90 font-black uppercase text-xs tracking-widest shadow-xl active:scale-[0.98] transition-all border-0">
                    TIẾP TỤC CÀY XP
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="border-2 border-sakura/10 bg-white/40 dark:bg-card/20 backdrop-blur-md rounded-[2rem] overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
                  <HistoryIcon className="h-3.5 w-3.5" /> Lịch sử thăng hạng
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[
                  { week: 'Tuần 7', league: 'Giải Đồng', rank: '#2', result: 'Promoted' },
                  { week: 'Tuần 6', league: 'Giải Đồng', rank: '#12', result: 'Stayed' },
                ].map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/50">
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground">{h.week}</p>
                      <p className="text-sm font-bold">{h.league}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-sakura">{h.rank}</p>
                      <Badge className="text-[8px] h-3 px-1 bg-green-500/10 text-green-500 border-0">{h.result}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
};
