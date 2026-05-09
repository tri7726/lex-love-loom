import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export const UserProfile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
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
    let isMounted = true;

    const fetchData = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        // Use a simpler query first
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError) throw profileError;
        
        if (isMounted) {
          setProfile(profileData);
        }

        if (profileData && currentUser && currentUser.id !== userId) {
          const { data: friendData } = await supabase
            .from('friendships')
            .select('*')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .then(res => {
              // Manual filter to avoid complex .or logic that might fail
              const match = res.data?.find((f: any) => 
                (f.sender_id === currentUser.id && f.receiver_id === userId) ||
                (f.sender_id === userId && f.receiver_id === currentUser.id)
              );
              return { data: match };
            });
          
          if (isMounted) setFriendship(friendData);
        }

        // Fetch activities safely
        const { data: activityData } = await supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (isMounted) setActivities(activityData || []);

      } catch (err) {
        console.error('Profile Fetch Error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [userId, currentUser?.id]);

  const handleFriendAction = async () => {
    if (!currentUser || !userId) return;
    try {
      if (!friendship) {
        const { error } = await supabase
          .from('friendships')
          .insert({ sender_id: currentUser.id, receiver_id: userId, status: 'pending' });
        if (error) throw error;
        toast("Đã gửi lời mời kết bạn");
        setFriendship({ sender_id: currentUser.id, receiver_id: userId, status: 'pending' });
      } else {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', friendship.id);
        if (error) throw error;
        toast("Đã hủy kết bạn/yêu cầu");
        setFriendship(null);
      }
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    }
  };

  const handleStartChat = () => {
    if (!userId) return;
    navigate(`/chat?id=new&with=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-sakura animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h2 className="text-xl font-bold mb-4">Không tìm thấy hồ sơ</h2>
        <Button onClick={() => navigate('/')}>Quay lại trang chủ</Button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Banner */}
      <div className="h-48 bg-sakura-light/20 relative">
        {profile.banner_url && <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />}
        <div className="container max-w-4xl relative h-full">
           <Button 
             variant="ghost" 
             onClick={() => navigate(-1)}
             className="absolute top-4 left-4 bg-white/50 backdrop-blur-sm"
           >
             <ChevronLeft className="h-4 w-4 mr-2" /> Quay lại
           </Button>
        </div>
      </div>

      <div className="container max-w-4xl -mt-12 px-4">
        <Card className="rounded-3xl border-2 border-sakura-light/30 shadow-xl overflow-hidden bg-white">
          <CardContent className="pt-0 p-6 md:p-10">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-white shadow-lg">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-sakura-light text-sakura text-4xl"><User /></AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h1 className="text-3xl font-bold text-sumi">{profile.display_name || profile.username || 'Người dùng'}</h1>
                  <Badge variant="secondary">JLPT {profile.jlpt_level || 'N5'}</Badge>
                </div>
                {profile.username && <p className="text-sakura font-medium">@{profile.username}</p>}
                {profile.bio && <p className="text-sumi/70 mt-2 max-w-xl">{profile.bio}</p>}
                
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-muted-foreground pt-2">
                  {profile.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>}
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Tham gia {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '---'}</span>
                </div>
              </div>

              <div className="flex gap-4 bg-sakura-light/5 p-4 rounded-2xl border border-sakura-light/10">
                <div className="text-center px-2">
                  <p className="text-xl font-bold text-sakura">{profile.total_xp || 0}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">XP</p>
                </div>
                <div className="text-center px-2">
                  <p className="text-xl font-bold text-orange-500">{profile.current_streak || 0}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Streak</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
              {isOwnProfile ? (
                <Button asChild className="rounded-2xl h-14 px-10 shadow-elevated bg-sakura hover:bg-sakura-dark text-white font-black gap-2 text-lg transition-all active:scale-95">
                  <Link to="/edit-profile"><Settings className="h-5 w-5" /> Chỉnh sửa hồ sơ</Link>
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleFriendAction}
                    className={cn(
                      "rounded-2xl h-14 px-10 shadow-elevated font-black gap-2 text-lg transition-all active:scale-95",
                      friendship?.status === 'accepted' ? "bg-matcha text-white" : "bg-sakura text-white"
                    )}
                  >
                    {friendship?.status === 'accepted' ? <><UserCheck className="h-5 w-5" /> Bạn bè</> : <><UserPlus className="h-5 w-5" /> Kết bạn</>}
                  </Button>
                  <Button variant="outline" onClick={handleStartChat} className="rounded-2xl h-14 px-10 border-2 border-sakura-light/30 text-sakura font-black gap-2 text-lg transition-all hover:bg-sakura-light/10">
                    <Mail className="h-5 w-5" /> Nhắn tin
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="md:col-span-2 space-y-6">
            <Card className="rounded-3xl border-sakura-light/20 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-sakura" /> Hoạt động gần đây
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activities.length > 0 ? (
                  activities.map((act) => (
                    <div key={act.id} className="flex gap-3 items-start border-b border-muted pb-3 last:border-0">
                      <div className="h-8 w-8 rounded-lg bg-sakura-light/10 flex items-center justify-center text-sakura shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-sumi">{act.content?.title || act.type || 'Hoạt động học tập'}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(act.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-sm text-muted-foreground">Chưa có hoạt động nào.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
             <Card className="rounded-3xl border-sakura-light/20 shadow-sm p-6 space-y-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-sakura" /> Tiến trình
                </CardTitle>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>JLPT {profile.jlpt_level || 'N5'}</span>
                        <span>{stats.mastery}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-sakura" style={{ width: `${stats.mastery}%` }} />
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="bg-sakura-light/10 p-3 rounded-xl text-center">
                        <p className="text-lg font-bold text-sakura">{stats.vocabCount}</p>
                        <p className="text-[9px] uppercase font-bold text-muted-foreground">Từ vựng</p>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-xl text-center">
                        <p className="text-lg font-bold">128</p>
                        <p className="text-[9px] uppercase font-bold text-muted-foreground">Hán tự</p>
                      </div>
                   </div>
                </div>
             </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
