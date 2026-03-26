import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Sword,
  User,
  Trophy,
  Zap,
  History,
  Play,
  Clock,
  AlertCircle,
  Crown,
  Plus,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useXP } from '@/hooks/useXP';
import { SakuraSkeleton } from '@/components/ui/SakuraSkeleton';
import { Navigation } from '@/components/Navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OpponentProfile {
  display_name: string | null;
  avatar_url: string | null;
}

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  topic: string;
  status: 'pending' | 'accepted' | 'completed' | 'expired';
  challenger_score: number | null;
  opponent_score: number | null;
  winner_id: string | null;
  created_at: string;
  expires_at: string | null;
  completed_at: string | null;
  opponent_profile?: OpponentProfile & { total_xp?: number } | null;
  challenger_profile?: OpponentProfile & { total_xp?: number } | null;
  bet_amount?: number;
  multiplier?: number;
}

interface Friend {
  friend_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Hết hạn';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)} ngày`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getOpponentInfo(challenge: Challenge, userId: string) {
  const isChallenger = challenge.challenger_id === userId;
  const profile = isChallenger ? challenge.opponent_profile : challenge.challenger_profile;
  const myProfile = isChallenger ? challenge.challenger_profile : challenge.opponent_profile;
  
  // Topic parsing for bet/multiplier
  let displayTopic = challenge.topic;
  let bet = 0;
  try {
    if (challenge.topic.startsWith('{')) {
      const parsed = JSON.parse(challenge.topic);
      displayTopic = parsed.topic;
      bet = parsed.bet || 0;
    }
  } catch (e) {}

  return {
    name: profile?.display_name ?? 'Người dùng',
    avatar: profile?.avatar_url ?? '',
    myScore: isChallenger ? challenge.challenger_score : challenge.opponent_score,
    theirScore: isChallenger ? challenge.opponent_score : challenge.challenger_score,
    isChallenger,
    bet,
    displayTopic,
    opponentXP: profile?.total_xp || 0,
    myXP: myProfile?.total_xp || 0
  };
}

const calculateLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;
const calculateMultiplier = (myXP: number, oppXP: number) => {
  const myLvl = calculateLevel(myXP);
  const oppLvl = calculateLevel(oppXP);
  const gap = oppLvl - myLvl;
  return Math.max(0.1, Math.min(5.0, 1 + (gap * 0.15)));
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Challenges = () => {
  const { user } = useAuth();
  const { awardXP } = useXP();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<Challenge[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [topic, setTopic] = useState('');
  const [betAmount, setBetAmount] = useState<number>(0);
  const [creating, setCreating] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchChallenges = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: active, error: activeErr } = await (supabase
        .from('challenges' as any)
        .select(`
          *,
          opponent_profile:profiles!challenges_opponent_id_fkey(display_name, avatar_url, total_xp),
          challenger_profile:profiles!challenges_challenger_id_fkey(display_name, avatar_url, total_xp)
        `)
        .in('status', ['pending', 'accepted'])
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('created_at', { ascending: false }) as any);

      if (activeErr) throw activeErr;
      setActiveChallenges((active as Challenge[]) ?? []);

      const { data: completed, error: completedErr } = await (supabase
        .from('challenges' as any)
        .select(`
          *,
          opponent_profile:profiles!challenges_opponent_id_fkey(display_name, avatar_url, total_xp),
          challenger_profile:profiles!challenges_challenger_id_fkey(display_name, avatar_url, total_xp)
        `)
        .eq('status', 'completed')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('completed_at', { ascending: false })
        .limit(20) as any);

      if (completedErr) throw completedErr;
      setCompletedChallenges((completed as Challenge[]) ?? []);
    } catch (err: any) {
      console.error('fetchChallenges error:', err);
      toast({ title: 'Lỗi tải dữ liệu', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase
        .from('friendships' as any)
        .select(`
          friend_id,
          friend_profile:profiles!friendships_friend_id_fkey(display_name, avatar_url, total_xp)
        `)
        .eq('user_id', user.id) as any);

      if (error) throw error;

      const mapped: Friend[] = (data ?? []).map((row: any) => ({
        friend_id: row.friend_id,
        display_name: row.friend_profile?.display_name ?? null,
        avatar_url: row.friend_profile?.avatar_url ?? null,
      }));
      setFriends(mapped);
    } catch (err: any) {
      console.error('fetchFriends error:', err);
    }
  }, [user]);

  // Initial fetch and friend fetch
  useEffect(() => {
    fetchChallenges();
    fetchFriends();
  }, [user, fetchChallenges, fetchFriends]);

  // Automated Cleanup for expired challenges
  useEffect(() => {
    const cleanupExpired = async () => {
      if (!user || loading) return;
      const now = new Date().toISOString();
      
      const { data: expired, error } = await (supabase as any)
        .from('challenges')
        .select('*')
        .eq('status', 'pending')
        .lt('expires_at', now);

      if (error || !expired || expired.length === 0) return;

      for (const challenge of expired) {
        // 1. Mark as expired
        await (supabase as any)
          .from('challenges')
          .update({ status: 'expired' })
          .eq('id', challenge.id);

        // 2. Refund bet to challenger
        try {
          const topicObj = JSON.parse(challenge.topic);
          const bet = topicObj.bet || 0;
          if (bet > 0 && user.id === challenge.challenger_id) {
            awardXP('duel_draw', bet, { challenge_id: challenge.id, reason: 'refund_expired' });
            toast({ title: 'Thử thách hết hạn', description: `Bạn đã được hoàn lại ${bet} XP cược.` });
          }
        } catch (e) {}
      }
      
      if (expired.length > 0) fetchChallenges();
    };

    cleanupExpired();
  }, [user, loading, fetchChallenges, awardXP, toast]); // Added awardXP and toast to dependencies

  /**
   * Realtime subscription for challenges
   */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('challenges_realtime')
      .on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'public',
          table: 'challenges',
        },
        (payload: any) => {
          const { new: newRow, old: oldRow } = payload;
          const isRelevant = 
            (newRow && (newRow.challenger_id === user.id || newRow.opponent_id === user.id)) ||
            (oldRow && (oldRow.challenger_id === user.id || oldRow.opponent_id === user.id));
          
          if (isRelevant) {
            fetchChallenges();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChallenges, fetchFriends]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAccept = async (challengeId: string) => {
    setAccepting(challengeId);
    try {
      const { error } = await (supabase
        .from('challenges' as any)
        .update({ status: 'accepted' })
        .eq('id', challengeId) as any);
      if (error) throw error;
      toast({ title: 'Đã chấp nhận thử thách!' });
      fetchChallenges();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setAccepting(null);
    }
  };

  const handleCreateChallenge = async () => {
    if (!user || !selectedFriend || !topic.trim()) return;
    setCreating(true);
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const topicData = JSON.stringify({ topic: topic.trim(), bet: betAmount });
      const { error } = await (supabase
        .from('challenges' as any)
        .insert({
          challenger_id: user.id,
          opponent_id: selectedFriend,
          topic: topicData,
          status: 'pending',
          expires_at: expiresAt,
        }) as any);
      if (error) throw error;

      // Deduct XP for bet
      if (betAmount > 0) {
        await awardXP('duel_loss', -betAmount, { challenge_id: 'pending_bet', bet: betAmount });
        toast({ title: 'Đã đặt cược', description: `-${betAmount} XP đã được tạm giữ.` });
      }

      toast({ title: 'Đã gửi thử thách!', description: `Chủ đề: ${topic.trim()}` });
      setDialogOpen(false);
      setSelectedFriend('');
      setTopic('');
      fetchChallenges();
    } catch (err: any) {
      toast({ title: 'Lỗi tạo thử thách', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />

      <main className="container py-10 space-y-10">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <Badge variant="outline" className="text-secondary border-secondary/20 bg-secondary/5 font-bold">
              1vs1 PvP Beta
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold">Thách đấu 1vs1</h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Thử thách kiến thức và tốc độ cùng bạn bè. Trở thành nhà vô địch tiếng Nhật ngay hôm nay!
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => setDialogOpen(true)}
            className="rounded-2xl gap-2 h-14 px-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl font-bold shadow-secondary/20"
          >
            <Sword className="h-5 w-5" /> Tìm đối thủ mới
          </Button>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 px-1">
                <Zap className="h-5 w-5 text-secondary" /> Thử thách đang diễn ra
              </h2>

              {loading ? (
                <SakuraSkeleton variant="card" count={3} />
              ) : activeChallenges.length === 0 ? (
                <Card className="border-dashed border-2 border-border bg-card/40">
                  <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <Sword className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">Chưa có thử thách nào đang diễn ra</p>
                    <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="gap-2 mt-1">
                      <Plus className="h-4 w-4" /> Tạo thử thách mới
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {activeChallenges.map((challenge, idx) => {
                    if (!user) return null;
                    const { name, avatar, myScore, isChallenger } = getOpponentInfo(challenge, user.id);
                    const isPending = challenge.status === 'pending';
                    const isMyTurn = isPending && !isChallenger;

                    return (
                      <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Card className={cn(
                          'overflow-hidden border-2 transition-all hover:shadow-soft',
                          isMyTurn ? 'border-secondary/30 bg-secondary/5' : 'border-border bg-card/60'
                        )}>
                          <CardContent className="p-4 sm:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="relative">
                                  <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                                    <AvatarImage src={avatar} />
                                    <AvatarFallback><User /></AvatarFallback>
                                  </Avatar>
                                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-white border-2 border-background shadow-xs">
                                    <Sword className="h-3 w-3" />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
                                    {isChallenger ? 'Bạn đã thách' : 'Thử thách từ'}
                                  </p>
                                  <h3 className="text-lg font-bold">{name}</h3>
                                  <div className="flex items-center gap-2">
                                     <p className="text-sm font-medium text-secondary">{getOpponentInfo(challenge, user?.id || '').displayTopic}</p>
                                     {getOpponentInfo(challenge, user?.id || '').bet > 0 && (
                                       <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-black">
                                         BET: {getOpponentInfo(challenge, user?.id || '').bet} XP
                                       </Badge>
                                     )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                                  <Clock className="h-3.5 w-3.5" /> Còn lại: {formatTimeRemaining(challenge.expires_at)}
                                </div>
                                {isMyTurn ? (
                                  <Button
                                    className="w-full sm:w-auto rounded-xl bg-secondary text-secondary-foreground shadow-lg px-8 font-black gap-2 h-12"
                                    onClick={() => handleAccept(challenge.id)}
                                    disabled={accepting === challenge.id}
                                  >
                                    {accepting === challenge.id
                                      ? <Loader2 className="h-4 w-4 animate-spin" />
                                      : <><CheckCircle2 className="h-4 w-4" /> CHẤP NHẬN</>
                                    }
                                  </Button>
                                ) : challenge.status === 'accepted' ? (
                                  <Button 
                                    onClick={() => navigate(`/pvp/${challenge.id}`)}
                                    className="w-full sm:w-auto rounded-xl bg-secondary text-secondary-foreground shadow-lg px-8 font-black gap-2 h-12"
                                  >
                                    <Play className="h-4 w-4" /> CHƠI NGAY
                                  </Button>
                                ) : (
                                  <Button variant="outline" disabled className="w-full sm:w-auto rounded-xl border-border px-8 font-bold gap-2 h-12">
                                    <Clock className="h-4 w-4" /> CHỜ ĐỐI THỦ
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="pt-2">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 px-1">
                                <span className="text-secondary">Bạn: {myScore != null ? `${myScore}%` : '--'}</span>
                                <span className="text-muted-foreground">{name}: --</span>
                              </div>
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: myScore != null ? `${myScore}%` : '0%' }}
                                  className="h-full bg-secondary shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 px-1">
                <History className="h-5 w-5 text-muted-foreground" /> Lịch sử đối đầu
              </h2>
              <Card className="border-border bg-card/40 backdrop-blur-sm">
                <CardContent className="p-0">
                  {loading ? (
                    <SakuraSkeleton variant="card" count={3} />
                  ) : completedChallenges.length === 0 ? (
                    <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
                      <History className="h-8 w-8 opacity-30" />
                      <p className="text-sm">Chưa có lịch sử đối đầu</p>
                    </div>
                  ) : (
                    completedChallenges.map((item) => {
                      if (!user) return null;
                      const { name, avatar, myScore, theirScore } = getOpponentInfo(item, user.id);
                      const won = item.winner_id === user.id;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'flex items-center justify-between p-4 px-6 border-b border-border last:border-0 hover:bg-muted/30 transition-colors',
                            won ? 'bg-primary/5' : ''
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 border border-border">
                              <AvatarImage src={avatar} />
                              <AvatarFallback><User /></AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-sm">{name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{getOpponentInfo(item, user?.id || '').displayTopic}</p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge
                              variant={won ? 'default' : 'outline'}
                              className={cn(
                                'font-black text-[10px] px-2',
                                won ? 'bg-primary text-white' : 'text-muted-foreground border-border'
                              )}
                            >
                              {won ? 'THẮNG' : 'THUA'}
                            </Badge>
                            <p className="text-xs font-bold font-jp">
                              {myScore ?? '—'} vs {theirScore ?? '—'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          <aside className="space-y-6">
            <Card className="border-2 border-sakura/20 shadow-elevated overflow-hidden relative bg-white/40 dark:bg-sakura-dark/10 backdrop-blur-md">
              <div className="absolute -top-12 -right-12 p-8 opacity-10 rotate-12">
                <Crown className="h-48 w-48 text-sakura" />
              </div>
              <CardHeader className="relative z-10 pb-2">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center mb-4 shadow-lg shadow-gold/20">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl font-display font-black tracking-tight">
                  Master Leaderboard
                </CardTitle>
                <CardDescription className="text-muted-foreground font-medium">
                  Top 5 cao thủ PvP tuần này.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10 pt-4">
                {[
                  { name: 'Hoàng Anh', winRate: '92%', wins: 45, rank: 1 },
                  { name: 'Yuki', winRate: '88%', wins: 38, rank: 2 },
                  { name: 'Kato-san', winRate: '85%', wins: 32, rank: 3 },
                  { name: 'Minh Tuấn', winRate: '82%', wins: 29, rank: 4 },
                  { name: 'Phương Thảo', winRate: '80%', wins: 27, rank: 5 },
                ].map((u, i) => (
                  <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-sakura/5 p-3 rounded-2xl transition-all border border-transparent hover:border-sakura/10">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm',
                        i === 0 ? 'bg-gold text-white' :
                        i === 1 ? 'bg-slate-300 text-slate-700' :
                        i === 2 ? 'bg-amber-600/80 text-white' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-black group-hover:text-sakura transition-colors">{u.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{u.wins} THẮNG</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-sakura">{u.winRate}</p>
                      <p className="text-[10px] font-bold text-muted-foreground">Winrate</p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="relative z-10 pt-4">
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="w-full bg-sakura text-white hover:opacity-90 rounded-2xl h-14 font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-sakura/25 transition-all active:scale-[0.98] border-0"
                >
                  THÁCH ĐẤU NGAY
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" /> Luật chơi PvP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  'Lựa chọn gói từ vựng/kanji để thách đấu.',
                  'Hoàn thành bài test trong thời gian ngắn nhất.',
                  'Số câu đúng càng nhiều, điểm càng cao.',
                  'Đối thủ có 24h để phản hồi thử thách.',
                ].map((rule, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{rule}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl">
              <Sword className="h-5 w-5 text-secondary" /> Tạo thử thách mới
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold">Chọn đối thủ</Label>
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Bạn chưa có bạn bè nào. Hãy kết bạn trước!
                </p>
              ) : (
                <div className="grid gap-2 max-h-52 overflow-y-auto pr-1">
                  {friends.map((f) => (
                    <button
                      key={f.friend_id}
                      type="button"
                      onClick={() => setSelectedFriend(f.friend_id)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                        selectedFriend === f.friend_id
                          ? 'border-secondary bg-secondary/10'
                          : 'border-border hover:border-secondary/40 hover:bg-muted/40'
                      )}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={f.avatar_url ?? ''} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-sm">{f.display_name ?? 'Người dùng'}</span>
                      {selectedFriend === f.friend_id && (
                        <CheckCircle2 className="h-4 w-4 text-secondary ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-bold">Chủ đề thử thách</Label>
              <Input
                id="topic"
                placeholder="VD: Từ vựng N5 - Bài 5, Hán tự N4..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold flex justify-between items-center">
                 <span>Mức cược (XP)</span>
                 <span className="text-amber-600">Stake: {betAmount} XP</span>
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 50, 100, 200, 500].map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant={betAmount === val ? 'default' : 'outline'}
                    onClick={() => setBetAmount(val)}
                    className={cn(
                      "h-10 rounded-xl text-xs font-bold",
                      betAmount === val && "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {val === 0 ? 'FREE' : val}
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic text-center">
                 * Nếu cấp độ đối thủ cao hơn bạn, phần thưởng thắng sẽ được nhân hệ số!
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              Hủy
            </Button>
            <Button
              onClick={handleCreateChallenge}
              disabled={!selectedFriend || !topic.trim() || creating}
              className="rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold gap-2"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sword className="h-4 w-4" />}
              Gửi thử thách
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
