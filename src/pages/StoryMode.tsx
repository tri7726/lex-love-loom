import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Train, Utensils, ShoppingBag, Star, Sparkles, Zap, Trophy, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AchievementGallery } from '@/components/story/AchievementGallery';

const storyEpisodes = [
  {
    id: 1,
    title: "Narita Arrival",
    description: "Nhập cảnh và những lời chào đầu tiên tại Nhật.",
    icon: Plane,
    difficulty: "N5",
    color: "from-[#ff8fa3] to-[#ff4d8d]",
    glowColor: "rgba(255, 143, 163, 0.5)",
    unlocked: true,
    stars: 3,
  },
  {
    id: 2,
    title: "The Journey to Tokyo",
    description: "Mua vé tàu và Check-in khách sạn.",
    icon: Train,
    difficulty: "N5",
    color: "from-[#ffccd5] to-[#ff8fa3]",
    glowColor: "rgba(255, 204, 213, 0.5)",
    unlocked: true,
    stars: 2,
  },
  {
    id: 3,
    title: "Gourmet Adventure",
    description: "Khám phá ẩm thực Ramen tại Shinjuku.",
    icon: Utensils,
    difficulty: "N5",
    color: "from-[#ffd1ff] to-[#ff8fa3]",
    glowColor: "rgba(255, 209, 255, 0.5)",
    unlocked: true,
    stars: 0,
  },
  {
    id: 4,
    title: "Akihabara Shopping",
    description: "Mua sắm đồ điện tử và khám phá văn hóa Anime.",
    icon: ShoppingBag,
    difficulty: "N5",
    color: "from-[#e0f2fe] to-[#ff8fa3]",
    glowColor: "rgba(224, 242, 254, 0.5)",
    unlocked: true,
    stars: 0,
  },
];

export const StoryMode = () => {
  const navigate = useNavigate();
  const [showAchievements, setShowAchievements] = useState(false);

  return (
    <div className="min-h-screen bg-[#fdfbf9] text-[#2d1b24] pb-20 md:pb-0 overflow-x-hidden relative">
      {/* Soft Ambient Background Decor */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-[#fff0f3] blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-20%] w-[900px] h-[900px] bg-[#f0f7ff] blur-[180px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Delicate Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.4] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />
      </div>

      <main className="container relative z-10 py-16">
        <div className="max-w-6xl mx-auto space-y-20">
          {/* Header Section */}
          <div className="text-center space-y-6 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white border border-[#ffe4e9] backdrop-blur-xl text-[#fa4b84] text-xs font-black tracking-[0.3em] uppercase mb-2 shadow-sm"
            >
              <Sparkles className="h-4 w-4 fill-[#fa4b84]" /> Sakura Milk Edition
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="text-6xl md:text-8xl font-display font-black tracking-tighter leading-tight text-[#1a1a1a]"
            >
              Hành Trình <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#fa4b84] via-[#ff8fa3] to-[#fa4b84]">Nhật Bản</span>
            </motion.h1>
            
            <p className="text-[#8c7a82] text-lg md:text-2xl max-w-3xl mx-auto font-light leading-relaxed">
              Khám phá vẻ đẹp xứ sở hoa anh đào qua những câu chuyện thực tế và ngọt ngào.
            </p>
          </div>

          {/* Timeline Map Container */}
          <div className="relative pt-20 px-4 md:px-0">
            {/* Visual Path Line - Soft Pink Way */}
            <div className="absolute left-[50%] top-0 bottom-0 w-[6px] hidden md:block overflow-hidden rounded-full">
               <div className="absolute inset-0 bg-[#f5eef0]" />
               <motion.div 
                 initial={{ height: 0 }}
                 whileInView={{ height: '100%' }}
                 transition={{ duration: 2, ease: "circOut" }}
                 className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#ff8fa3] via-[#fa4b84] to-[#ffccd5] shadow-[0_0_15px_rgba(250,75,132,0.3)]" 
               />
            </div>
            
            <div className="space-y-40">
              {storyEpisodes.map((episode, index) => {
                const Icon = episode.icon;
                const isEven = index % 2 === 0;

                return (
                  <motion.div
                    key={episode.id}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className={cn(
                      "flex flex-col md:flex-row items-center gap-12 relative",
                      isEven ? "md:flex-row" : "md:flex-row-reverse"
                    )}
                  >
                    {/* Node Dot with Bloom Effect */}
                    <div className="hidden md:flex absolute left-[50%] -translate-x-1/2 w-14 h-14 rounded-full z-20 items-center justify-center">
                       <motion.div 
                         initial={{ scale: 0 }}
                         whileInView={{ scale: 1 }}
                         className="absolute inset-0 bg-[#fa4b84]/15 rounded-full blur-lg animate-ping" 
                       />
                       <div className="w-8 h-8 rounded-full bg-white border-[4px] border-[#fa4b84] z-20 flex items-center justify-center shadow-lg">
                          <div className="w-2.5 h-2.5 bg-[#fa4b84] rounded-full" />
                       </div>
                    </div>

                    {/* Sakura Episode Card (Cloud Glass) */}
                    <motion.div
                      whileHover={{ y: -12 }}
                      className="w-full md:w-[48%] relative group"
                    >
                      {/* Card Soft Glow */}
                      <div className={cn(
                        "absolute -inset-2 rounded-[40px] opacity-0 group-hover:opacity-40 transition-all duration-700 blur-2xl z-0",
                        `bg-gradient-to-br ${episode.color}`
                      )} />

                      <Card 
                        onClick={() => episode.unlocked && navigate(`/quiz/story/${episode.id}`)}
                        className={cn(
                          "relative z-10 overflow-hidden border-[#ffe4e9] bg-white/70 backdrop-blur-[60px] shadow-[0_20px_40px_rgba(250,75,132,0.08)] transition-all duration-500 rounded-[40px] cursor-pointer ring-1 ring-white group-hover:ring-[#fa4b84]/20",
                          !episode.unlocked && "grayscale-[0.9] opacity-40 pointer-events-none"
                        )}
                      >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        
                        <div className={cn("h-3 w-full bg-gradient-to-r", episode.color)} />
                        
                        <CardHeader className="p-10 pb-4 relative">
                          <div className="flex justify-between items-start">
                            <motion.div 
                              whileHover={{ rotate: [0, -10, 10, 0] }}
                              className={cn("p-6 rounded-[28px] bg-gradient-to-br text-white shadow-xl ring-4 ring-white transition-transform", episode.color)}
                            >
                              <Icon className="h-12 w-12" />
                            </motion.div>
                            <div className="flex flex-col items-end gap-3">
                               <Badge className="bg-[#fa4b84]/10 text-[#fa4b84] border border-[#fa4b84]/20 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">
                                 {episode.unlocked ? "N5 READY" : "SOON"}
                               </Badge>
                               <div className="flex gap-1.5">
                                 {[1, 2, 3].map((s) => (
                                   <Star key={s} className={cn(
                                     "h-6 w-6 transition-all duration-500",
                                     s <= episode.stars ? 'text-[#fa4b84] fill-[#fa4b84] drop-shadow-md' : 'text-[#f5eef0]'
                                   )} />
                                 ))}
                               </div>
                            </div>
                          </div>
                          
                          <div className="mt-10 space-y-3">
                             <h3 className="text-[10px] text-[#fa4b84] uppercase font-black tracking-[0.5em]">Episode 0{episode.id}</h3>
                             <CardTitle className="text-4xl font-black tracking-tight text-[#1a1a1a] group-hover:text-[#fa4b84] transition-colors leading-tight">
                               {episode.title}
                             </CardTitle>
                             <CardDescription className="text-[#8c7a82] text-xl leading-relaxed font-light mt-3 italic line-clamp-2">
                               "{episode.description}"
                             </CardDescription>
                          </div>
                        </CardHeader>

                        <CardContent className="p-10 pt-6">
                           <div className="pt-8 border-t border-[#f5eef0] flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="text-[10px] text-[#8c7a82] uppercase font-black tracking-widest leading-none">Nhiệm vụ</p>
                                <p className="text-[#1a1a1a] font-bold text-base">{episode.unlocked ? "Sẵn sàng lên đường" : "Đang được phong ấn"}</p>
                              </div>
                              <Button 
                                className="group/btn relative px-10 h-14 rounded-3xl bg-[#fa4b84] text-white hover:bg-[#ff1a66] shadow-[0_10px_20px_rgba(250,75,132,0.3)] transition-all duration-500 font-black text-sm uppercase tracking-widest overflow-hidden"
                              >
                                 <span className="relative z-10 flex items-center gap-3">
                                   {episode.unlocked ? "Bắt đầu ngay" : "Khóa"} <Zap className="h-4 w-4 fill-current group-hover/btn:scale-125 transition-transform" />
                                 </span>
                              </Button>
                           </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Educational Sidebar (Pastel Style) */}
                    <div className="hidden md:flex w-[48%] flex-col gap-6 p-12">
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.9 }}
                         whileInView={{ opacity: 1, scale: 1 }}
                         className="bg-[#fa4b84]/5 border-2 border-white p-8 rounded-[36px] backdrop-blur-md rotate-[-1deg] hover:rotate-0 transition-all duration-500 group shadow-sm"
                       >
                          <div className="flex items-center gap-3 mb-4">
                             <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#fa4b84] shadow-sm">
                                <Sparkles className="h-5 w-5" />
                             </div>
                             <h4 className="font-black text-[#1a1a1a] text-sm uppercase tracking-widest">Sensei's Tip</h4>
                          </div>
                          <p className="text-[#8c7a82] text-lg leading-relaxed font-medium">
                             "Học tiếng Nhật không chỉ là từ vựng, mà là cả văn hóa và cảm xúc ẩn chứa bên trong mỗi câu chào."
                          </p>
                       </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Stats Section with Milk White Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="pt-24 border-t border-[#f5eef0]"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
               {[
                 { label: "Tiến triển", value: "3 / 20", sub: "Episodes", icon: Zap },
                 { label: "Vốn từ vựng", value: "+1,200", sub: "Từ vựng N5", icon: Sparkles },
                 { label: "Kinh nghiệm", value: "12,450", sub: "Điểm XP", icon: Star },
                 { label: "Hạng của bạn", value: "Elite", sub: "Sakura Rank", icon: ShoppingBag },
               ].map((stat, i) => (
                 <Card key={i} className="bg-white border-[#f5eef0] p-8 rounded-[32px] text-center group hover:border-[#fa4b84]/20 hover:scale-105 transition-all shadow-sm">
                   <div className="mx-auto w-12 h-12 bg-[#fa4b84]/5 rounded-2xl flex items-center justify-center mb-4 text-[#fa4b84] group-hover:bg-[#fa4b84] group-hover:text-white transition-all duration-500">
                      <stat.icon className="h-6 w-6" />
                   </div>
                   <p className="text-[#8c7a82] text-[11px] uppercase font-black tracking-widest mb-1">{stat.label}</p>
                   <p className="text-3xl font-black text-[#1a1a1a]">{stat.value}</p>
                   <p className="text-[#fa4b84] text-[10px] font-black uppercase mt-1 tracking-widest opacity-60">{stat.sub}</p>
                 </Card>
               ))}
            </div>
          </motion.div>

          {/* Achievement Gallery Toggle */}
          <div className="fixed bottom-24 right-8 z-[60] md:bottom-8">
            <Button
              onClick={() => setShowAchievements(true)}
              className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white border-2 border-[#fa4b84]/20 shadow-2xl hover:scale-110 transition-all group overflow-hidden p-0"
            >
              <div className="absolute inset-0 bg-[#fa4b84]/5 group-hover:bg-[#fa4b84]/10 transition-colors" />
              <div className="relative z-10 flex flex-col items-center">
                 <Trophy className="h-6 w-6 md:h-8 md:w-8 text-[#fa4b84] mb-1" />
                 <span className="text-[8px] font-black text-[#fa4b84] uppercase tracking-widest hidden md:block">Album</span>
              </div>
            </Button>
          </div>

          {/* Modal Overlay */}
          <AnimatePresence>
            {showAchievements && (
              <AchievementGallery onClose={() => setShowAchievements(false)} />
            )}
          </AnimatePresence>
        </div>
      </main>
      
      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-[#ff8fa3] via-[#fa4b84] to-[#ffccd5] opacity-30 z-50" />
    </div>
  );
};
export default StoryMode;
