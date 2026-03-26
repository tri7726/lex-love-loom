import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  Trophy, 
  TrendingUp, 
  Shield, 
  UserPlus, 
  Loader2, 
  X,
  LogOut
} from 'lucide-react';
import { SakuraSkeleton } from '@/components/ui/SakuraSkeleton';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Squad {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
  tags?: string[];
}

const SQUAD_MISSIONS = [
  { id: 'm1', title: 'Siêu từ vựng', goal: 'Cả squad học 1000 từ mới', progress: 65, reward: '500 XP' },
  { id: 'm2', title: 'Chiến thần đọc hiểu', goal: 'Hoàn thành 50 bài Reading', progress: 40, reward: 'Huy hiệu Squad' },
];

export const Squads = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [squadXP, setSquadXP] = useState(0);
  const [topPerformers, setTopPerformers] = useState<{name: string, xp: number, squad: string}[]>([]);

  // Create dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  const fetchSquads = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all squads
      const { data: squadsData, error: squadsError } = await (supabase as any)
        .from('study_squads')
        .select('*')
        .order('created_at', { ascending: false });

      if (squadsError) throw squadsError;

      // Fetch member counts
      const { data: membersData, error: membersError } = await (supabase as any)
        .from('squad_members')
        .select('squad_id');

      if (membersError) throw membersError;

      // Count members per squad
      const countMap: Record<string, number> = {};
      (membersData || []).forEach((m: { squad_id: string }) => {
        countMap[m.squad_id] = (countMap[m.squad_id] || 0) + 1;
      });

      // Fetch current user's memberships
      let mySquadIds = new Set<string>();
      if (user) {
        const { data: myMemberships } = await (supabase as any)
          .from('squad_members')
          .select('squad_id')
          .eq('user_id', user.id);
        (myMemberships || []).forEach((m: { squad_id: string }) => {
          mySquadIds.add(m.squad_id);
        });
      }

      const mapped: Squad[] = (squadsData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        avatar_url: s.avatar_url,
        owner_id: s.owner_id,
        created_at: s.created_at,
        member_count: countMap[s.id] || 0,
        is_member: mySquadIds.has(s.id),
        tags: s.tags || [],
      }));

      setSquads(formattedSquads);

      // Fetch Squad Missions XP (Aggregation since Monday)
      if (user && mySquadIds.size > 0) {
        const myFirstSquadId = Array.from(mySquadIds)[0];
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const lastMonday = new Date(now.setDate(diff));
        lastMonday.setHours(0, 0, 0, 0);

        // 1. Get all members of my squad
        const { data: squadMembers } = await (supabase as any)
          .from('squad_members')
          .select('user_id')
          .eq('squad_id', myFirstSquadId);

        const memberIds = (squadMembers || []).map((m: any) => m.user_id);

        if (memberIds.length > 0) {
          // 2. Sum XP for these members since Monday
          const { data: xpEvents } = await (supabase as any)
            .from('xp_events')
            .select('amount')
            .in('user_id', memberIds)
            .gte('created_at', lastMonday.toISOString());

          const total = (xpEvents || []).reduce((sum: number, e: any) => sum + e.amount, 0);
          setSquadXP(total);
        }
      }

      // Fetch Top Performers (Global for the week)
      const fetchTop = async () => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const lastMonday = new Date(now.setDate(diff));
        lastMonday.setHours(0, 0, 0, 0);

        const { data: events } = await (supabase as any)
          .from('xp_events')
          .select('user_id, amount')
          .gte('created_at', lastMonday.toISOString());

        const xpMap: Record<string, number> = {};
        (events || []).forEach((e: any) => xpMap[e.user_id] = (xpMap[e.user_id] || 0) + e.amount);

        const sortedUsers = Object.entries(xpMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3);

        const userIds = sortedUsers.map(([id]) => id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', userIds);
          
          const tops = sortedUsers.map(([id, xp]) => {
            const p = profiles?.find(prof => prof.user_id === id);
            return {
              name: p?.display_name || 'Người học',
              xp,
              squad: 'Thành viên'
            };
          });
          setTopPerformers(tops);
        } else {
          setTopPerformers([
            { name: 'Đang cập nhật...', xp: 0, squad: '-' },
          ]);
        }
      };
      
      fetchTop();

    } catch (err: any) {
      console.error('Error fetching squads:', err);
      toast({ title: 'Lỗi tải dữ liệu', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchSquads();
  }, [fetchSquads]);

  const handleJoin = async (squadId: string) => {
    if (!user) {
      toast({ title: 'Bạn chưa đăng nhập', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await (supabase as any)
        .from('squad_members')
        .insert({ squad_id: squadId, user_id: user.id, role: 'member' });

      if (error) throw error;
      toast({ title: "Đã tham gia squad!" });
      fetchSquads();
    } catch (err: any) {
      toast({ 
        title: "Lỗi khi tham gia", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  };

  const handleLeave = async (squadId: string) => {
    if (!user) {
      toast({ title: 'Bạn chưa đăng nhập', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await (supabase as any)
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast({ title: "Đã rời khỏi squad!" });
      fetchSquads();
    } catch (err: any) {
      toast({ 
        title: "Lỗi khi rời khỏi", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  };

  const handleCreate = async () => {
    if (!user) {
      toast({ title: 'Bạn chưa đăng nhập', variant: 'destructive' });
      return;
    }
    if (!newName.trim()) {
      toast({ title: 'Vui lòng nhập tên squad', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const tags = newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { data: squadData, error: squadError } = await (supabase as any)
        .from('study_squads')
        .insert({
          name: newName.trim(),
          description: newDesc.trim() || null,
          owner_id: user.id,
          tags,
        })
        .select()
        .single();

      if (squadError) throw squadError;

      const { error: memberError } = await (supabase as any)
        .from('squad_members')
        .insert({ squad_id: squadData.id, user_id: user.id, role: 'owner' });

      if (memberError) throw memberError;

      toast({ title: 'Tạo squad thành công!' });
      setDialogOpen(false);
      setNewName('');
      setNewDesc('');
      setNewTags('');
      await fetchSquads();
    } catch (err: any) {
      toast({ title: 'Lỗi tạo squad', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const filtered = squads.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'all' || s.is_member;
    return matchSearch && matchTab;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />

      <main className="container py-10 space-y-10">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
              Study Groups
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold">Biệt đội học tập</h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Tham gia các Squad để cùng thi đua, chia sẻ kinh nghiệm và chinh phục các mục tiêu tiếng Nhật cùng nhau.
            </p>
          </div>
          <div className="flex gap-3">
            <Button className="rounded-xl shadow-sakura gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Tạo Squad mới
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Squad list */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm Squad theo tên..."
                className="pl-9 h-12 bg-card border-2 border-border rounded-xl focus:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'mine')}>
              <TabsList className="rounded-xl">
                <TabsTrigger value="all">Tất cả Squad</TabsTrigger>
                <TabsTrigger value="mine">Squad của tôi</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Squad cards */}
            {loading ? (
              <SakuraSkeleton variant="card" count={3} />
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                {tab === 'mine' ? 'Bạn chưa tham gia squad nào.' : 'Không tìm thấy squad nào.'}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {filtered.map((squad, idx) => (
                  <motion.div
                    key={squad.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.07 }}
                  >
                    <Card className="hover:shadow-elevated transition-all border-2 border-transparent hover:border-primary/20 overflow-hidden group bg-card/60 backdrop-blur-sm flex flex-col">
                      <CardHeader className="p-5 flex flex-row items-center gap-4">
                        <Avatar className="h-16 w-16 rounded-2xl border-2 border-background shadow-soft">
                          <AvatarImage src={squad.avatar_url || undefined} />
                          <AvatarFallback><Users /></AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 min-w-0">
                          <h3 className="text-xl font-bold font-display line-clamp-1 group-hover:text-primary transition-colors">
                            {squad.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] px-2 py-0">
                              <Users className="h-3 w-3 mr-1" /> {squad.member_count} thành viên
                            </Badge>
                            {squad.is_member && (
                              <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-2 py-0">
                                Đã tham gia
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="px-5 py-0 flex-1">
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {squad.description || 'Chưa có mô tả.'}
                        </p>
                        {squad.tags && squad.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-4">
                            {squad.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-bold text-primary/60 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="p-5 mt-auto">
                        {squad.is_member ? (
                          <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 gap-2 rounded-xl bg-primary/5 text-primary border-primary/20 cursor-default">
                              <Shield className="h-4 w-4" /> Đã tham gia
                            </Button>
                            <Button 
                              variant="ghost" 
                              className="px-3 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors"
                              onClick={() => handleLeave(squad.id)}
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full gap-2 rounded-xl border-border hover:bg-primary hover:text-white hover:border-primary transition-all"
                            onClick={() => handleJoin(squad.id)}
                            disabled={joiningId === squad.id}
                          >
                            {joiningId === squad.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4" />
                            )}
                            Tham gia ngay
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <Card className="bg-primary text-primary-foreground border-0 shadow-sakura overflow-hidden relative">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Trophy className="h-40 w-40" />
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Kết quả nổi bật
                </CardTitle>
                <CardDescription className="text-primary-foreground/70">
                  Những chiến binh đáng gờm nhất tuần này.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topPerformers.map((top, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg opacity-50 w-4">{i + 1}</span>
                      <div>
                        <p className="font-bold text-sm leading-none">{top.name}</p>
                        <p className="text-[10px] opacity-70">{top.squad}</p>
                      </div>
                    </div>
                    <span className="font-bold text-sm">+{top.xp} XP</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold">
                  Bảng xếp hạng chi tiết
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-2 border-border bg-card/40 backdrop-blur-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-muted/10 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-sakura" /> Nhiệm vụ chung
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                {SQUAD_MISSIONS.map((m) => (
                  <div key={m.id} className="space-y-2">
                    {(() => {
                      const goalValue = m.id === 'm1' ? 1000 : 500; // Example goals
                      const progress = Math.min(100, Math.floor((squadXP / goalValue) * 100));
                      return (
                        <>
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-xs font-black uppercase text-foreground">{m.title}</p>
                              <p className="text-[10px] text-muted-foreground">Mục tiêu: {goalValue} XP tuần</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] font-black border-sakura/30 text-sakura">
                              +{m.reward}
                            </Badge>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className="h-full bg-sakura shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                            />
                          </div>
                          <p className="text-[9px] text-right text-muted-foreground font-bold">{progress}% Đã xong ({squadXP}/{goalValue} XP)</p>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </CardContent>
              <CardFooter className="bg-sakura/5 py-3 flex justify-center">
                <Button variant="ghost" className="text-[10px] font-black uppercase text-sakura hover:bg-sakura/10 w-full">
                  Xem tất cả
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      </main>

      {/* Create Squad Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Tạo Squad mới
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="squad-name">Tên Squad <span className="text-destructive">*</span></Label>
              <Input
                id="squad-name"
                placeholder="VD: JLPT N2 Warriors"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="squad-desc">Mô tả</Label>
              <Textarea
                id="squad-desc"
                placeholder="Mô tả ngắn về squad của bạn..."
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="squad-tags">Tags (phân cách bằng dấu phẩy)</Label>
              <Input
                id="squad-tags"
                placeholder="VD: N2, Intensive, Grammar"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
              />
              {newTags && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {newTags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="text-[10px] font-bold text-primary/60 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
              <X className="h-4 w-4 mr-1" /> Hủy
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Tạo Squad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
