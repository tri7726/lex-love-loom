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
  Flag,
  Sparkles
} from 'lucide-react';
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
      <motion.main 
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        initial="hidden"
        animate="show"
        className="container py-10 space-y-8"
      >
        <motion.div variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}>
          <Link to="/friends">
            <Button variant="ghost" className="gap-2 mb-4 text-sakura hover:bg-sakura-light/50 rounded-full">
              <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
            </Button>
          </Link>
        </motion.div>

        {/* Profile Header */}
        <motion.section 
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          className="relative"
        >
          <div className="h-64 w-full bg-gradient-hero rounded-[3rem] absolute -z-10 opacity-60 blur-2xl" />
          <div className="flex flex-col md:flex-row items-center md:items-end gap-10 px-8 py-10 bg-white/40 backdrop-blur-md rounded-[3rem] border border-sakura-light/50 shadow-soft relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles className="h-32 w-32 text-sakura" />
            </div>

            <Avatar className="h-32 w-32 md:h-44 md:w-44 border-8 border-white shadow-2xl rounded-[3rem] shrink-0">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="text-4xl bg-sakura-light text-sakura"><User className="h-24 w-24" /></AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left space-y-5 relative z-10">
              <div className="space-y-2">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <h1 className="text-5xl font-display font-black text-sumi tracking-tight">{profile.name}</h1>
                  <div className="flex items-center gap-2 mx-auto md:mx-0">
                    <Badge className="bg-sakura text-white font-black px-4 py-1.5 rounded-full shadow-sm">
                      {profile.level}
                    </Badge>
                    {profile.role === 'sensei' && (
                      <Badge className="bg-gold text-gold-foreground border-0 gap-1.5 font-black uppercase text-[10px] px-3 py-1 rounded-full shadow-sm">
                        <ShieldCheck className="h-3.5 w-3.5" /> Sensei VIP
                      </Badge>
                    )}
                    {profile.role === 'native' && (
                      <Badge className="bg-crimson text-white border-0 gap-1.5 font-black uppercase text-[10px] px-3 py-1 rounded-full shadow-sm">
                        <Flag className="h-3.5 w-3.5" /> Native Speaker
                      </Badge>
                    )}
                  </div>
                </div>
                {profile.bio && (
                  <p className="max-w-lg text-lg text-sumi/70 leading-relaxed mx-auto md:mx-0 font-medium">
                    {profile.bio}
                  </p>
                )}
                <div className="flex items-center justify-center md:justify-start gap-4 text-sm font-bold text-muted-foreground">
                  <span className="flex items-center gap-1.5 bg-white/60 px-3 py-1 rounded-full">
                    <Calendar className="h-4 w-4 text-sakura" /> Gia nhập {profile.joined}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                {isOwnProfile ? (
                  <Link to="/edit-profile">
                    <Button variant="default" className="bg-sakura hover:bg-sakura-dark text-white rounded-2xl gap-2 px-8 py-6 shadow-soft hover:shadow-elevated transition-all font-bold">
                      <Settings className="h-5 w-5" /> Chỉnh sửa hồ sơ
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button className="bg-sakura hover:bg-sakura-dark text-white rounded-2xl shadow-soft gap-2 px-8 py-6 font-bold">
                      <Sword className="h-5 w-5" /> Thách đấu PvP
                    </Button>
                    <Link to="/messages">
                      <Button variant="outline" className="rounded-2xl gap-2 px-8 py-6 border-sakura-light text-sakura hover:bg-sakura-light/30 bg-white/40 font-bold">
                        <MessageSquare className="h-5 w-5" /> Gửi tin nhắn
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-10 pb-6 px-4">
              <div className="text-center space-y-2">
                <p className="text-5xl font-black text-gradient-sakura leading-none">{profile.xp}</p>
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Kinh nghiệm (XP)</p>
              </div>
              <div className="h-16 w-[2px] bg-sakura-light/50 rounded-full" />
              <div className="text-center space-y-2">
                <p className="text-5xl font-black text-gold leading-none">{profile.streak}</p>
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Ngày liên tiếp</p>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            className="lg:col-span-2 space-y-8"
          >
             <SkillHeatmap />
             
             <Card className="rounded-[2.5rem] border-sakura-light/30 shadow-card overflow-hidden">
               <CardHeader className="bg-sakura-light/10 border-b border-sakura-light/20">
                 <CardTitle className="flex items-center gap-2 text-sumi">
                   <Target className="h-5 w-5 text-sakura" /> Mục tiêu hiện tại
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-8 space-y-8">
                 <div className="space-y-4">
                   <div className="flex justify-between items-end">
                     <p className="text-lg font-black text-sumi">Chinh phục JLPT {profile.level}</p>
                     <p className="text-2xl font-black text-sakura">65%</p>
                   </div>
                   <div className="h-4 bg-sakura-light/30 rounded-full overflow-hidden p-1 shadow-inner">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "65%" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-sakura rounded-full shadow-sm" 
                      />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                   <div className="p-6 rounded-3xl bg-cream/50 border border-sakura-light/20 space-y-2 shadow-soft">
                     <p className="text-[10px] font-black uppercase text-sakura tracking-widest leading-none">Từ vựng đã học</p>
                     <p className="text-3xl font-black text-sumi">1,240 <span className="text-sm font-medium text-muted-foreground">/ 3,000</span></p>
                   </div>
                   <div className="p-6 rounded-3xl bg-matcha-light/30 border border-matcha/20 space-y-2 shadow-soft">
                     <p className="text-[10px] font-black uppercase text-matcha tracking-widest leading-none">Hán tự ghi nhớ</p>
                     <p className="text-3xl font-black text-sumi">420 <span className="text-sm font-medium text-muted-foreground">/ 600</span></p>
                   </div>
                 </div>
               </CardContent>
             </Card>
          </motion.div>

          <motion.aside 
            variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
            className="space-y-8"
          >
            <Card className="rounded-[2.5rem] border-gold/20 shadow-soft bg-white/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sumi">
                  <Award className="h-5 w-5 text-gold" /> Huy hiệu danh giá
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {profile.recentAchievements.map((ach, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center p-5 rounded-3xl bg-sakura-light/10 gap-3 text-center group hover:bg-sakura-light/20 transition-all cursor-pointer border border-sakura-light/10 shadow-sm">
                    <div className="h-14 w-14 rounded-full bg-sakura-light/30 flex items-center justify-center text-sakura group-hover:scale-110 transition-transform shadow-inner">
                      {ach.icon}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-tight leading-tight text-sumi/80">{ach.title}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] bg-indigo-jp text-white border-0 shadow-soft overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Trophy className="h-24 w-24" />
               </div>
               <CardHeader className="relative z-10">
                 <CardTitle className="text-sm flex items-center gap-2 font-black uppercase tracking-widest">
                   <Trophy className="h-4 w-4 text-gold" /> Squad Ranking
                 </CardTitle>
               </CardHeader>
               <CardContent className="relative z-10 space-y-6">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-xl backdrop-blur-sm">
                       <span className="text-2xl font-black">N2</span>
                     </div>
                     <div>
                       <p className="font-black text-lg leading-tight">N2 Warriors</p>
                       <p className="text-xs text-white/60 font-medium">Bảng xếp hạng #4</p>
                     </div>
                   </div>
                 </div>
                 <div className="bg-white/10 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                    <div>
                      <p className="text-[10px] font-black text-sakura-light uppercase tracking-widest">Tuần này</p>
                      <p className="text-xl font-black">+840 XP</p>
                    </div>
                    <Link to="/squads">
                      <Button size="icon" variant="ghost" className="rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <ChevronLeft className="h-4 w-4 rotate-180" />
                      </Button>
                    </Link>
                 </div>
               </CardContent>
            </Card>
          </motion.aside>
        </div>
      </motion.main>
  );
};
