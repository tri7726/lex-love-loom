import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, Headphones, PenTool, Mic, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GameMode } from './types';

interface ReviewPanelProps {
  showReviewPanel: boolean;
  setShowReviewPanel: (show: boolean) => void;
  wordCount: number;
  levelText?: string;
  levelAccentClass?: string;
  onSelectGame: (mode: GameMode) => void;
  isCustom?: boolean;
}

const MODES = [
  { mode: 'classic' as GameMode, icon: Target, label: 'Cổ điển', desc: 'Trắc nghiệm trí tuệ', gradient: 'bg-white', border: 'border-slate-50 hover:border-sakura/20', iconColor: 'text-sakura', shadow: 'hover:shadow-lg' },
  { mode: 'speed' as GameMode, icon: Zap, label: 'Tốc độ', desc: 'Phản xạ chớp nhoáng', gradient: 'bg-white', border: 'border-slate-50 hover:border-sakura/20', iconColor: 'text-sakura', shadow: 'hover:shadow-lg' },
  { mode: 'listening' as GameMode, icon: Headphones, label: 'Nghe', desc: 'Luyện tai tinh tường', gradient: 'bg-white', border: 'border-slate-50 hover:border-sakura/20', iconColor: 'text-sakura', shadow: 'hover:shadow-lg' },
  { mode: 'writing' as GameMode, icon: PenTool, label: 'Viết', desc: 'Rèn luyện nét chữ', gradient: 'bg-white', border: 'border-slate-50 hover:border-sakura/20', iconColor: 'text-sakura', shadow: 'hover:shadow-lg' },
  { mode: 'match' as GameMode, icon: Sparkles, label: 'Ghép cặp', desc: 'Kết nối tri thức', gradient: 'bg-white', border: 'border-slate-50 hover:border-sakura/20', iconColor: 'text-sakura', shadow: 'hover:shadow-lg' },
  { mode: 'pronunciation' as GameMode, icon: Mic, label: 'Phát âm', desc: 'Ngữ điệu bản xứ', gradient: 'bg-white', border: 'border-slate-50 hover:border-sakura/20', iconColor: 'text-sakura', shadow: 'hover:shadow-lg' },
];

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  showReviewPanel,
  setShowReviewPanel,
  wordCount,
  levelText,
  levelAccentClass,
  onSelectGame,
  isCustom = false,
}) => {
  return (
    <>
      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Button
          className={cn(
            'w-full gap-4 py-8 text-sm font-black uppercase tracking-[0.3em] rounded-[1.5rem] shadow-xl transition-all duration-500',
            'bg-slate-900 border-2 border-white/10 text-white',
            'hover:bg-black hover:scale-[1.01] active:scale-[0.99]'
          )}
          onClick={() => setShowReviewPanel(!showReviewPanel)}
        >
          <Target className="h-5 w-5" />
          {isCustom ? (showReviewPanel ? 'Ẩn ôn tập' : '🎯 Ôn tập ngay!') : 'Ôn tập bài này'}
          <Sparkles className="h-4 w-4 opacity-60" />
        </Button>
      </motion.div>

      <AnimatePresence>
        {showReviewPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Card className="border-0 shadow-2xl rounded-[2.5rem] overflow-hidden mt-4 bg-white">
              <div className="h-1 w-full bg-slate-900" />
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-rose-400" />
                  <h3 className="font-bold text-lg">Chọn chế độ chơi</h3>
                </div>
                <div className={cn("grid gap-3", isCustom ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2")}>
                  {MODES.map(({ mode, icon: Icon, label, desc, gradient, border, iconColor, shadow }) => (
                    <motion.div key={mode} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Card
                        className={cn('cursor-pointer border-2 transition-all duration-200 shadow-sm', border, shadow, `bg-gradient-to-br ${gradient}`)}
                        onClick={() => {
                          if (isCustom && wordCount < 4) return;
                          onSelectGame(mode);
                        }}
                      >
                        <CardContent className={cn("space-y-2 text-center", isCustom ? "p-4" : "p-4 text-left")}>
                          <div className={cn(
                            'rounded-xl flex items-center justify-center bg-white/80 shadow-sm',
                            isCustom ? 'mx-auto w-10 h-10' : 'w-10 h-10',
                            iconColor
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          {!isCustom && <p className="font-bold text-left">{label}</p>}
                          {isCustom && <p className="text-sm font-bold">{label}</p>}
                          <p className={cn("text-muted-foreground", isCustom ? "text-[10px]" : "text-xs text-left")}>
                            {desc}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {isCustom && wordCount < 4 && (
                  <p className="text-xs text-center text-rose-400">Cần ít nhất 4 từ để ôn tập</p>
                )}

                {!isCustom && (
                  <div className="flex justify-around pt-8 border-t border-slate-50 text-center">
                    <div>
                      <p className="text-3xl font-display font-black text-slate-800 tracking-tighter">{wordCount}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mt-1">Nữ vựng</p>
                    </div>
                    <div className="w-px h-8 bg-slate-50" />
                    <div>
                      <p className="text-3xl font-display font-black text-slate-800 tracking-tighter">6</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mt-1">Chủ đồ</p>
                    </div>
                    <div className="w-px h-8 bg-slate-50" />
                    <div>
                      <p className={cn('text-3xl font-display font-black tracking-tighter', levelAccentClass)}>{levelText}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mt-1">Cấp bậc</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
