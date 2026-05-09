import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  Zap, 
  Calendar, 
  BookOpen, 
  Sword, 
  ChevronLeft,
  Flame,
  Award,
  User,
  Settings,
  ShieldCheck,
  Flag,
  Sparkles,
  MapPin,
  Globe,
  Facebook,
  Twitter,
  Github,
  Mail,
  ExternalLink,
  UserPlus,
  UserCheck,
  UserMinus,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { SkillHeatmap } from '@/components/analytics/SkillHeatmap';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export const UserProfile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const isOwnProfile = currentUser?.id === userId;
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [friendship, setFriendship] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    vocabCount: 0,
    kanjiCount: 0,
    mastery: 65
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        if (currentUser && !isOwnProfile) {
          const { data: friendData } = await (supabase as any)
            .from('friendships')
            .select('*')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`)
            .maybeSingle();
          setFriendship(friendData);
        }

        const { data: activityData } = await (supabase as any)
          .from('user_activities')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        setActivities(activityData || []);

        const { count: vocabCount } = await (supabase as any)
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        setStats(prev => ({ ...prev, vocabCount: vocabCount || 0 }));

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchData();
  }, [userId, currentUser, isOwnProfile, toast]);

  const handleFriendAction = async () => {
    if (!currentUser) return;
    
    try {
      if (!friendship) {
        const { error } = await (supabase as any)
          .from('friendships')
          .insert({ sender_id: currentUser.id, receiver_id: userId, status: 'pending' });
        if (error) throw error;
        toast({ title: "Đã gửi lời mời", description: "Đang chờ đối phương chấp nhận." });
        setFriendship({ sender_id: currentUser.id, receiver_id: userId, status: 'pending' });
      } else if (friendship.status === 'pending' && friendship.receiver_id === currentUser.id) {
        const { error } = await (supabase as any)
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', friendship.id);
        if (error) throw error;
        toast({ title: "Đã kết bạn", description: "Bây giờ hai bạn đã là bạn bè!" });
        setFriendship({ ...friendship, status: 'accepted' });
      } else {
        const { error } = await (supabase as any)
          .from('friendships')
          .delete()
          .eq('id', friendship.id);
        if (error) throw error;
        toast({ title: "Đã hủy kết bạn", variant: "destructive" });
        setFriendship(null);
      }
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Sparkles className="h-10 w-10 text-sakura" />
        </motion.div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Banner Section */}
      <section className="relative h-[300px] w-full overflow-hidden">
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r transition-all duration-700",
          profile.banner_url ? "" : "from-sakura-light/30 via-accent/20 to-sakura-light/30"
        )}>
          {profile.banner_url && <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
        </div>
        <div className="container relative h-full max-w-6xl">
          <Link to="/friends" className="absolute top-8 left-4 z-20">
            <Button variant="secondary" size="sm" className="rounded-xl gap-2 bg-white/40 hover:bg-white/60 backdrop-blur-md border-white/20 text-sumi shadow-soft font-bold">
              <ChevronLeft className="h-4 w-4" /> Khám phá
            </Button>
          </Link>
          {isOwnProfile && (
            <Link to="/edit-profile" className="absolute top-8 right-4 z-20">
              <Button variant="secondary" size="sm" className="rounded-xl gap-2 bg-white/40 hover:bg-white/60 backdrop-blur-md border-white/20 text-sumi shadow-soft font-bold">
                <Settings className="h-4 w-4" /> Cài đặt
              </Button>
            </Link>
          )}
        </div>
      </section>

      <main className="container max-w-6xl -mt-24 relative z-10 space-y-8 px-4">
        {/* Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-2xl border-2 border-sakura-light/30 rounded-[3rem] shadow-card p-8 md:p-10"
        >
          <div className="flex flex-col md:flex-row gap-10 items-center md:items-end">
            <div className="relative group -mt-20 md:-mt-32">
              <Avatar className="h-40 w-40 md:h-52 md:w-52 border-8 border-white shadow-elevated rounded-[3rem]">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-4xl bg-sakura-light text-sakura"><User className="h-20 w-20" /></AvatarFallback>
              </Avatar>
              {profile.role === 'admin' && (
                <div className="absolute -top-4 -right-4 bg-sakura text-white p-3 rounded-2xl shadow-lg ring-4 ring-white">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h1 className="text-4xl md:text-5xl font-display font-black text-sumi tracking-tight">{profile.display_name || profile.username}</h1>
                  <Badge className="bg-sakura text-white font-black px-4 py-1.5 rounded-full shadow-sm text-xs">JLPT {profile.jlpt_level}</Badge>
                </div>
                {profile.username && <p className="text-sakura font-bold opacity-70">@{profile.username}</p>}
              </div>
              {profile.bio && <p className="text-lg text-sumi/80 font-medium leading-relaxed max-w-2xl">{profile.bio}</p>}
              
              <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2 opacity-80 text-sumi/60 font-medium">
                {profile.location && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-sakura" /> {profile.location}</div>}
                {profile.website && <a href={profile.website} target="_blank" className="flex items-center gap-2 text-sm text-sakura hover:underline font-bold"><Globe className="h-4 w-4" /> Website</a>}
                <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-sakura" /> Tham gia {new Date(profile.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>

            {/* Stats Desktop */}
            <div className="hidden lg:flex items-center gap-8 bg-sakura-light/10 p-6 rounded-[2rem] border border-sakura-light/20 shadow-soft">
              <div className="text-center">
                <p className="text-3xl font-black text-sakura leading-none">{profile.total_xp}</p>
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mt-1">XP</p>
              </div>
              <div className="h-10 w-px bg-sakura-light/30" />
              <div className="text-center">
                <p className="text-3xl font-black text-orange-500 flex items-center gap-1 justify-center leading-none">
                  <Flame className="h-6 w-6 fill-orange-500" /> {profile.current_streak}
                </p>
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mt-1">Streak</p>
              </div>
            </div>
          </div>
          
          <div className="mt-10 flex flex-wrap gap-4">
            {isOwnProfile ? (
              <Button asChild className="rounded-2xl h-14 px-10 shadow-elevated bg-sakura hover:bg-sakura-dark text-white font-black gap-2 text-lg">
                <Link to="/edit-profile"><Settings className="h-5 w-5" /> Chỉnh sửa hồ sơ</Link>
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleFriendAction}
                  className={cn(
                    "rounded-2xl h-14 px-10 shadow-elevated font-black gap-2 text-lg transition-all",
                    friendship?.status === 'accepted' ? "bg-matcha text-white hover:bg-matcha-dark" : "bg-sakura text-white hover:bg-sakura-dark"
                  )}
                >
                  {friendship?.status === 'accepted' ? (
                    <><UserCheck className="h-5 w-5" /> Bạn bè</>
                  ) : friendship?.status === 'pending' ? (
                    friendship.sender_id === currentUser?.id ? (
                      <><Clock className="h-5 w-5" /> Đã gửi yêu cầu</>
                    ) : (
                      <><UserPlus className="h-5 w-5" /> Chấp nhận kết bạn</>
                    )
                  ) : (
                    <><UserPlus className="h-5 w-5" /> Kết bạn</>
                  )}
                </Button>
                <Button variant="outline" className="rounded-2xl h-14 px-10 border-2 border-sakura-light/30 text-sakura font-black gap-2 text-lg">
                  <Mail className="h-5 w-5" /> Gửi tin nhắn
                </Button>
              </>
            )}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Activity Feed */}
            <Card className="rounded-[2.5rem] border-2 border-sakura-light/20 shadow-card bg-white/80 backdrop-blur-md overflow-hidden">
              <CardHeader className="p-8 pb-4 bg-sakura-light/10 border-b border-sakura-light/10">
                <CardTitle className="flex items-center gap-2 text-2xl font-display font-black text-sumi">
                  <History className="h-6 w-6 text-sakura" /> Hoạt động gần đây
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {activities.length > 0 ? (
                  activities.map((act, i) => (
                    <div key={act.id} className="flex gap-4 group relative">
                      <div className="relative flex flex-col items-center">
                        <div className="h-10 w-10 rounded-xl bg-sakura-light/20 flex items-center justify-center text-sakura z-10 shadow-soft">
                          {act.type === 'achievement_unlocked' ? <Award className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                        </div>
                        {i !== activities.length - 1 && <div className="w-0.5 bg-sakura-light/20 grow mt-2" />}
                      </div>
                      <div className="pb-8 space-y-1">
                        <p className="font-bold text-lg text-sumi">{act.content.title}</p>
                        <p className="text-xs font-medium text-muted-foreground">{new Date(act.created_at).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-50 font-medium">Chưa có hoạt động nào được ghi lại.</div>
                )}
              </CardContent>
            </Card>

            <SkillHeatmap />
          </div>

          <aside className="space-y-8">
            <Card className="rounded-[2.5rem] border-2 border-sakura-light/20 shadow-card p-8 space-y-6 bg-white/80 backdrop-blur-md">
              <CardTitle className="text-xl font-display font-black flex items-center gap-2 text-sumi">
                <Target className="h-6 w-6 text-sakura" /> Tiến độ học
              </CardTitle>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-black text-sumi">
                    <span>JLPT {profile.jlpt_level}</span>
                    <span>{stats.mastery}%</span>
                  </div>
                  <div className="h-3 bg-sakura-light/20 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.mastery}%` }}
                      className="h-full bg-sakura rounded-full shadow-soft"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-sakura-light/10 text-center border border-sakura-light/20 shadow-soft">
                    <p className="text-2xl font-black text-sakura">{stats.vocabCount}</p>
                    <p className="text-[10px] uppercase font-black text-sumi/60 tracking-widest mt-1">Từ vựng</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-orange-500/5 text-center border border-orange-500/10 shadow-soft">
                    <p className="text-2xl font-black text-orange-600">128</p>
                    <p className="text-[10px] uppercase font-black text-sumi/60 tracking-widest mt-1">Hán tự</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-[2.5rem] bg-indigo-jp text-white border-0 shadow-elevated overflow-hidden relative p-8">
              <Trophy className="absolute -top-4 -right-4 h-32 w-32 opacity-10" />
              <div className="relative z-10 space-y-6">
                <p className="text-sm font-black uppercase tracking-widest text-indigo-jp-light opacity-80">Squad Ranking</p>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-2xl backdrop-blur-md">
                    <span className="text-2xl font-black">N3</span>
                  </div>
                  <div>
                    <p className="font-black text-2xl leading-tight">N3 Warriors</p>
                    <p className="text-xs text-white/60 font-medium">Vị trí #12 trên toàn cầu</p>
                  </div>
                </div>
                <Button variant="ghost" className="w-full bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all" asChild>
                  <Link to="/squads">Xem chi tiết <ExternalLink className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
