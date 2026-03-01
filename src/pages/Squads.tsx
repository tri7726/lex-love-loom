import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  Trophy, 
  MessageSquare, 
  Shield, 
  UserPlus,
  ArrowRight,
  TrendingUp,
  Layout
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const MOCK_SQUADS = [
  {
    id: '1',
    name: 'JLPT N2 Warriors',
    description: 'Cùng nhau chinh phục N2 trong tháng 7 này! Chia sẻ tài liệu và giải đề mỗi ngày.',
    members: 24,
    totalXp: 15400,
    rank: 1,
    avatar: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=100&h=100&auto=format&fit=crop',
    tags: ['N2', 'Intensive']
  },
  {
    id: '2',
    name: 'Manga Lovers JP',
    description: 'Học tiếng Nhật qua các bộ Manga nổi tiếng. Thảo luận nội dung và từ vựng.',
    members: 156,
    totalXp: 42300,
    rank: 3,
    avatar: 'https://images.unsplash.com/photo-1627389955609-70444658238f?w=100&h=100&auto=format&fit=crop',
    tags: ['Culture', 'Casual']
  },
  {
    id: '3',
    name: 'Kansai-ben Fun',
    description: 'Luyện tập phương ngôn vùng Kansai. Cực kỳ thú vị và gần gũi.',
    members: 42,
    totalXp: 8900,
    rank: 12,
    avatar: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=100&h=100&auto=format&fit=crop',
    tags: ['Dialect', 'Advanced']
  }
];

const SQUAD_MISSIONS = [
  { id: 'm1', title: 'Siêu từ vựng', goal: 'Cả squad học 1000 từ mới', progress: 65, reward: '500 XP' },
  { id: 'm2', title: 'Chiến thần đọc hiểu', goal: 'Hoàn thành 50 bài Reading', progress: 40, reward: 'Huy hiệu Squad' },
];

const MOCK_CHATS = {
  '1': { user: 'Kenji', msg: 'Mọi người ơi N2 khó quá đi...', time: '2 phút trước' },
  '2': { user: 'Sakura', msg: 'Manga này hay lắm, nhiều từ mới!', time: '10 phút trước' },
  '3': { user: 'Admin', msg: 'Chào mừng các bạn mới tham gia nhé.', time: '1 giờ trước' },
};

export const Squads = () => {
  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <main className="container py-10 space-y-10">
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
            <Button className="rounded-xl shadow-sakura gap-2">
              <Plus className="h-4 w-4" /> Tạo Squad mới
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Tìm kiếm Squad theo tên hoặc thẻ..." 
                className="pl-9 h-12 bg-card border-2 border-border rounded-xl focus:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MOCK_SQUADS.map((squad, idx) => (
                <motion.div
                  key={squad.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="hover:shadow-elevated transition-all border-2 border-transparent hover:border-primary/20 overflow-hidden group bg-card/60 backdrop-blur-sm">
                    <CardHeader className="p-5 flex flex-row items-center gap-4">
                      <Avatar className="h-16 w-16 rounded-2xl border-2 border-background shadow-soft">
                        <AvatarImage src={squad.avatar} />
                        <AvatarFallback><Users /></AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold font-display line-clamp-1 group-hover:text-primary transition-colors">
                          {squad.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] px-2 py-0">
                            <Users className="h-3 w-3 mr-1" /> {squad.members} thành viên
                          </Badge>
                          <Badge className="bg-gold/10 text-gold border-0 text-[10px] px-2 py-0">
                            Rank #{squad.rank}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 py-0">
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {squad.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {squad.tags.map(tag => (
                          <span key={tag} className="text-[10px] font-bold text-primary/60 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                    
                    {/* Chat Preview */}
                    <div className="px-5 py-3 mt-2 bg-muted/30 border-t border-border flex items-center justify-between">
                       <div className="flex items-center gap-2 overflow-hidden">
                         <span className="text-[10px] font-black text-sakura uppercase shrink-0">
                           {MOCK_CHATS[squad.id as keyof typeof MOCK_CHATS]?.user}:
                         </span>
                         <span className="text-[10px] text-muted-foreground truncate italic">
                           "{MOCK_CHATS[squad.id as keyof typeof MOCK_CHATS]?.msg}"
                         </span>
                       </div>
                       <span className="text-[8px] text-muted-foreground/60 whitespace-nowrap ml-2">
                         {MOCK_CHATS[squad.id as keyof typeof MOCK_CHATS]?.time}
                       </span>
                    </div>

                    <CardFooter className="p-5">
                      <Button variant="outline" className="w-full gap-2 rounded-xl border-border hover:bg-primary hover:text-white hover:border-primary transition-all">
                        Tham gia ngay <UserPlus className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

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
                {[
                  { name: 'Minh Tuấn', xp: 2450, squad: 'N2 Warriors' },
                  { name: 'Sakura-chan', xp: 2100, squad: 'Manga Lovers' },
                  { name: 'Kenji', xp: 1980, squad: 'N2 Warriors' },
                ].map((top, i) => (
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
                {SQUAD_MISSIONS.map(m => (
                  <div key={m.id} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-black uppercase text-foreground">{m.title}</p>
                        <p className="text-[10px] text-muted-foreground">{m.goal}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-black border-sakura/30 text-sakura">+{m.reward}</Badge>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${m.progress}%` }}
                        className="h-full bg-sakura shadow-[0_0_8px_rgba(244,63,94,0.3)]" 
                      />
                    </div>
                    <p className="text-[9px] text-right text-muted-foreground font-bold">{m.progress}% Đã xong</p>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="bg-sakura/5 py-3 flex justify-center">
                 <Button variant="ghost" className="text-[10px] font-black uppercase text-sakura hover:bg-sakura/10 w-full"> Xem tất cả </Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};
