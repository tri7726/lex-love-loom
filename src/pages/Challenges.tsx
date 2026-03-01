import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sword, 
  User, 
  Trophy, 
  Target, 
  Zap, 
  History, 
  Play, 
  Clock, 
  AlertCircle,
  Crown,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

import { Link } from 'react-router-dom';

const ACTIVE_CHALLENGES = [
  {
    id: '1',
    opponent: { name: 'Vũ Hải', avatar: '' },
    topic: 'Từ vựng N3 - Bài 5',
    status: 'your_turn',
    timeRemaining: '14h 22m',
    challengerScore: 85,
    opponentScore: null,
  },
  {
    id: '2',
    opponent: { name: 'Thùy Dương', avatar: '' },
    topic: 'Hán tự N2 cơ bản',
    status: 'waiting',
    timeRemaining: '1 ngày',
    challengerScore: 92,
    opponentScore: null,
  }
];

const COMPLETED_CHALLENGES = [
  {
    id: '3',
    opponent: { name: 'Hồng Anh', avatar: '' },
    topic: 'JLPT N4 Mock Test',
    result: 'win',
    score: '450 vs 380',
    date: 'Hôm qua'
  },
  {
    id: '4',
    opponent: { name: 'Quốc Bảo', avatar: '' },
    topic: 'Ngữ pháp N5',
    result: 'lose',
    score: '210 vs 285',
    date: '2 ngày trước'
  }
];

export const Challenges = () => {
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
          
          <Link to="/friends">
            <Button size="lg" className="rounded-2xl gap-2 h-14 px-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl font-bold shadow-secondary/20">
              <Sword className="h-5 w-5" /> Tìm đối thủ mới
            </Button>
          </Link>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Active Challenges */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 px-1">
                <Zap className="h-5 w-5 text-secondary" /> Thử thách đang diễn ra
              </h2>
              <div className="grid gap-4">
                {ACTIVE_CHALLENGES.map((challenge, idx) => (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className={cn(
                      "overflow-hidden border-2 transition-all hover:shadow-soft",
                      challenge.status === 'your_turn' ? "border-secondary/30 bg-secondary/5" : "border-border bg-card/60"
                    )}>
                      <CardContent className="p-4 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="relative">
                              <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                                <AvatarImage src={challenge.opponent.avatar} />
                                <AvatarFallback><User /></AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-white border-2 border-background shadow-xs">
                                <Sword className="h-3 w-3" />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Thử thách từ</p>
                              <h3 className="text-lg font-bold">{challenge.opponent.name}</h3>
                              <p className="text-sm font-medium text-secondary">{challenge.topic}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
                             <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                               <Clock className="h-3.5 w-3.5" /> Còn lại: {challenge.timeRemaining}
                             </div>
                             {challenge.status === 'your_turn' ? (
                               <Button className="w-full sm:w-auto rounded-xl bg-secondary text-secondary-foreground shadow-lg px-8 font-black gap-2 h-12">
                                 <Play className="h-4 w-4" /> CHẤP NHẬN & CHƠI
                               </Button>
                             ) : (
                               <Button variant="outline" disabled className="w-full sm:w-auto rounded-xl border-border px-8 font-bold gap-2 h-12">
                                 <Clock className="h-4 w-4" /> CHỜ ĐỐI THỦ
                               </Button>
                             )}
                          </div>
                        </div>

                        {/* Progress Tracker */}
                        <div className="pt-2">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 px-1">
                             <span className="text-secondary">Bạn: {challenge.challengerScore}%</span>
                             <span className="text-muted-foreground">{challenge.opponent.name}: --%</span>
                           </div>
                           <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${challenge.challengerScore}%` }}
                               className="h-full bg-secondary shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                             />
                             <div className="h-full bg-muted-foreground/20 w-[1%]" />
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* History */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 px-1">
                <History className="h-5 w-5 text-muted-foreground" /> Lịch sử đối đầu
              </h2>
              <Card className="border-border bg-card/40 backdrop-blur-sm">
                <CardContent className="p-0">
                  {COMPLETED_CHALLENGES.map((item, i) => (
                    <div key={item.id} className={cn(
                      "flex items-center justify-between p-4 px-6 border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                      item.result === 'win' ? "bg-primary/5" : ""
                    )}>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarFallback><User /></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-sm">{item.opponent.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{item.topic}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant={item.result === 'win' ? 'default' : 'outline'} className={cn(
                          "font-black text-[10px] px-2",
                          item.result === 'win' ? "bg-primary text-white" : "text-muted-foreground border-border"
                        )}>
                          {item.result === 'win' ? 'THẮNG' : 'THUA'}
                        </Badge>
                        <p className="text-xs font-bold font-jp">{item.score}</p>
                      </div>
                    </div>
                  ))}
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
                 ].map((user, i) => (
                   <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-sakura/5 p-3 rounded-2xl transition-all border border-transparent hover:border-sakura/10">
                     <div className="flex items-center gap-4">
                       <div className={cn(
                         "h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm",
                         i === 0 ? "bg-gold text-white" : 
                         i === 1 ? "bg-slate-300 text-slate-700" :
                         i === 2 ? "bg-amber-600/80 text-white" :
                         "bg-muted text-muted-foreground"
                       )}>
                         {i + 1}
                       </div>
                       <div>
                         <p className="text-sm font-black group-hover:text-sakura transition-colors">{user.name}</p>
                         <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{user.wins} THẮNG</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-black text-sakura">{user.winRate}</p>
                       <p className="text-[10px] font-bold text-muted-foreground">Winrate</p>
                     </div>
                   </div>
                 ))}
               </CardContent>
               <CardFooter className="relative z-10 pt-4">
                 <Button className="w-full bg-sakura text-white hover:opacity-90 rounded-2xl h-14 font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-sakura/25 transition-all active:scale-[0.98] border-0">
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
    </div>
  );
};
