import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  Zap, 
  Calendar, 
  BookOpen, 
  Sword, 
  MessageSquare, 
  ChevronLeft,
  Flame,
  Award,
  User,
  Settings,
  ShieldCheck,
  Flag
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { SkillHeatmap } from '@/components/analytics/SkillHeatmap';
import { supabase } from '@/integrations/supabase/client';

export const UserProfile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const isOwnProfile = currentUser?.id === userId;
  
  // Real logic would fetch this, for now we use enhanced mock
  const profile = {
    name: 'Vũ Hải',
    level: 'N3',
    role: userId === 'sensei_id' ? 'sensei' : (userId === 'native_id' ? 'native' : 'user'),
    is_verified: userId === 'sensei_id',
    bio: 'Đam mê tiếng Nhật và văn hóa Anime. Đang nỗ lực chinh phục N2 vào cuối năm nay! 🌸',
    xp: 4500,
    streak: 15,
    joined: 'Jan 2026',
    avatar: '',
    recentAchievements: [
      { title: '7 Day Hero', icon: <Flame className="h-4 w-4" /> },
      { title: 'Vocab Master', icon: <BookOpen className="h-4 w-4" /> }
    ]
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <main className="container py-10 space-y-8">
        <Link to="/friends">
          <Button variant="ghost" className="gap-2 mb-4">
            <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
          </Button>
        </Link>

        {/* Profile Header */}
        <section className="relative">
          <div className="h-48 w-full bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-3xl blur-3xl absolute -z-10 opacity-50" />
          <div className="flex flex-col md:flex-row items-center md:items-end gap-8 px-6 pb-6">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-xl rounded-[2.5rem]">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="text-4xl"><User className="h-20 w-20" /></AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="space-y-1">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h1 className="text-4xl font-display font-bold">{profile.name}</h1>
                  <div className="flex items-center gap-2 mx-auto md:mx-0">
                    <Badge className="bg-primary text-white font-bold px-3 py-1">
                      {profile.level}
                    </Badge>
                    {profile.role === 'sensei' && (
                      <Badge className="bg-amber-500 hover:bg-amber-600 border-0 gap-1 font-black uppercase text-[10px]">
                        <ShieldCheck className="h-3 w-3" /> Sensei
                      </Badge>
                    )}
                    {profile.role === 'native' && (
                      <Badge className="bg-red-500 hover:bg-red-600 border-0 gap-1 font-black uppercase text-[10px]">
                        <Flag className="h-3 w-3" /> Native
                      </Badge>
                    )}
                  </div>
                </div>
                {profile.bio && (
                  <p className="max-w-md text-sm leading-relaxed mx-auto md:mx-0 pb-2 italic">
                    "{profile.bio}"
                  </p>
                )}
                <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 text-xs">
                  <Calendar className="h-4 w-4" /> Đã tham gia {profile.joined}
                </p>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                {isOwnProfile ? (
                  <Link to="/edit-profile">
                    <Button variant="outline" className="rounded-xl gap-2 px-6 border-2 hover:bg-primary/5">
                      <Settings className="h-4 w-4" /> Chỉnh sửa hồ sơ
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button className="rounded-xl shadow-sakura-sm gap-2 px-6">
                      <Sword className="h-4 w-4" /> Thách đấu
                    </Button>
                    <Link to="/messages">
                      <Button variant="outline" className="rounded-xl gap-2 px-6">
                        <MessageSquare className="h-4 w-4" /> Nhắn tin
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-6 pb-4">
              <div className="text-center space-y-1">
                <p className="text-2xl font-black text-primary">{profile.xp}</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Tổng XP</p>
              </div>
              <div className="h-8 w-[1px] bg-border" />
              <div className="text-center space-y-1">
                <p className="text-2xl font-black text-secondary">{profile.streak}</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Chuỗi ngày</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
             <SkillHeatmap />
             
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Target className="h-5 w-5 text-primary" /> Mục tiêu hiện tại
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                 <div className="space-y-3">
                   <div className="flex justify-between items-end">
                     <p className="font-bold">Hoàn thành Lộ trình N3</p>
                     <p className="text-sm font-bold text-primary">65%</p>
                   </div>
                   <Progress value={65} className="h-2.5" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                     <p className="text-[10px] font-black uppercase text-muted-foreground">Từ vựng</p>
                     <p className="text-lg font-bold">1,240 / 3,000</p>
                   </div>
                   <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-1">
                     <p className="text-[10px] font-black uppercase text-muted-foreground">Hán tự</p>
                     <p className="text-lg font-bold">420 / 600</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
          </div>

          <aside className="space-y-6">
            <Card className="shadow-soft border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-gold" /> Huy hiệu gần đây
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {profile.recentAchievements.map((ach, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-primary/5 gap-2 text-center group hover:bg-primary/10 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      {ach.icon}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{ach.title}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-900 text-white border-0">
               <CardHeader>
                 <CardTitle className="text-sm flex items-center gap-2">
                   <Trophy className="h-4 w-4 text-gold" /> Rank trong Squad
                 </CardTitle>
               </CardHeader>
               <CardContent className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                     <span className="text-xl font-black">N2</span>
                   </div>
                   <div>
                     <p className="font-bold text-sm">N2 Warriors</p>
                     <p className="text-xs text-slate-400">Position #4</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-xs font-black text-primary">+840 XP</p>
                   <p className="text-[10px] text-slate-500 uppercase">Tuần này</p>
                 </div>
               </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
};
