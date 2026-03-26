import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Shield, Zap, Target, BookOpen, Crown, Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  unlocked: boolean;
  category: 'combat' | 'learning' | 'story' | 'hidden';
  color: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'hiragana_slayer',
    title: 'Sát Thủ Hiragana',
    description: 'Chinh phục 100 từ vựng Hiragana không sai.',
    icon: Zap,
    unlocked: true,
    category: 'learning',
    color: 'from-blue-400 to-indigo-600',
  },
  {
    id: 'demon_conqueror',
    title: 'Kẻ Chinh Phục Địa Ngục',
    description: 'Thắng 10 trận liên tiếp ở độ khó Ác Quỷ.',
    icon: Flame,
    unlocked: false,
    category: 'combat',
    color: 'from-orange-500 to-red-700',
  },
  {
    id: 'sakura_child',
    title: 'Đứa Con Của Sakura',
    description: 'Hoàn thành 10 Episode cốt truyện.',
    icon: Star,
    unlocked: true,
    category: 'story',
    color: 'from-pink-300 to-[#fa4b84]',
  },
  {
    id: 'legendary_sensei',
    title: 'Sensei Huyền Thoại',
    description: 'Đạt cấp độ XP cao nhất trong League.',
    icon: Crown,
    unlocked: false,
    category: 'hidden',
    color: 'from-yellow-400 to-amber-600',
  },
];

export const AchievementGallery = ({ onClose }: { onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#2d1b24]/40 backdrop-blur-xl flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden border-4 border-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-10 bg-gradient-to-br from-[#fa4b84] to-[#ffccd5] relative overflow-hidden">
           <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
              <Trophy className="w-64 h-64 text-white" />
           </div>
           <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter mb-2">Hệ Thống Thành Tựu</h2>
                <p className="text-white/80 font-medium tracking-wide uppercase text-xs">Sakura Nihongo • Achievement System</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 text-white font-black">
                 2 / 4 MỞ KHÓA
              </div>
           </div>
        </div>
        
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#fdfbf9] max-h-[60vh] overflow-y-auto custom-scrollbar">
           {ACHIEVEMENTS.map((achievement) => {
             const Icon = achievement.icon;
             return (
               <motion.div 
                 key={achievement.id}
                 whileHover={{ y: -5 }}
                 className={cn(
                   "relative p-6 rounded-[32px] border-2 transition-all duration-500",
                   achievement.unlocked 
                    ? "bg-white border-[#fa4b84]/10 shadow-[0_10px_30px_rgba(250,75,132,0.05)]" 
                    : "bg-[#f5eef0]/50 border-transparent grayscale"
                 )}
               >
                  <div className="flex items-start gap-6">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg",
                      achievement.color
                    )}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <div className="flex-1 space-y-2">
                       <div className="flex items-center justify-between">
                          <h3 className="font-black text-[#1a1a1a] text-lg">{achievement.title}</h3>
                          {achievement.unlocked && (
                            <Badge className="bg-[#fa4b84]/10 text-[#fa4b84] border-none px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">
                               UNLOCKED
                            </Badge>
                          )}
                       </div>
                       <p className="text-[#8c7a82] text-sm leading-relaxed font-medium line-clamp-2">
                          {achievement.description}
                       </p>
                    </div>
                  </div>
                  {!achievement.unlocked && (
                    <div className="absolute inset-x-0 bottom-4 flex justify-center">
                       <span className="text-[9px] font-black text-[#fa4b84]/40 uppercase tracking-[0.3em]">Bị Khóa bởi Sensei</span>
                    </div>
                  )}
               </motion.div>
             );
           })}
        </div>
        
        <div className="p-8 border-t border-[#f5eef0] flex justify-center bg-white">
           <button 
             onClick={onClose}
             className="px-12 h-14 rounded-2xl bg-[#fa4b84] text-white font-black uppercase tracking-widest text-xs hover:bg-[#ff1a66] transition-all shadow-lg"
           >
             Đóng Gallery
           </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
