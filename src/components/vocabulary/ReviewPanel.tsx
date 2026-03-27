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
  { mode: 'classic' as GameMode, icon: Target, label: 'Cổ điển', desc: 'Trắc nghiệm trí tuệ', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-500', shadow: 'hover:shadow-rose-100' },
  { mode: 'speed' as GameMode, icon: Zap, label: 'Tốc độ', desc: 'Phản xạ chớp nhoáng', gradient: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', iconColor: 'text-pink-500', shadow: 'hover:shadow-pink-100' },
  { mode: 'listening' as GameMode, icon: Headphones, label: 'Nghe', desc: 'Luyện tai tinh tường', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-400', shadow: 'hover:shadow-rose-100' },
  { mode: 'writing' as GameMode, icon: PenTool, label: 'Viết', desc: 'Rèn luyện nét chữ', gradient: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', iconColor: 'text-pink-400', shadow: 'hover:shadow-pink-100' },
  { mode: 'match' as GameMode, icon: Sparkles, label: 'Ghép cặp', desc: 'Kết nối tri thức', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-500', shadow: 'hover:shadow-rose-100' },
  { mode: 'pronunciation' as GameMode, icon: Mic, label: 'Phát âm', desc: 'Ngữ điệu bản xứ', gradient: 'from-pink-50 to-rose-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-sakura', shadow: 'hover:shadow-sakura/10' },
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
            'w-full gap-4 py-8 text-sm font-black uppercase tracking-[0.3em] rounded-full shadow-[0_20px_40px_-12px_rgba(244,63,94,0.3)] transition-all duration-500',
            'bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500 border-t border-white/20 text-white',
            'hover:from-rose-500 hover:via-pink-500 hover:to-rose-600 hover:scale-[1.02] hover:shadow-rose-300/40 active:scale-[0.98]'
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
            <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden mt-4 bg-white">
              <div className="h-1 w-full bg-gradient-to-r from-rose-300 via-pink-300 to-rose-400" />
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
                  <div className="flex justify-around pt-8 border-t border-rose-50 text-center">
                    <div>
                      <p className="text-3xl font-bold text-rose-500 tracking-tighter">{wordCount}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300 mt-1">Từ vựng</p>
                    </div>
                    <div className="w-px h-8 bg-rose-50" />
                    <div>
                      <p className="text-3xl font-bold text-amber-500 tracking-tighter">6</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300 mt-1">Chế độ</p>
                    </div>
                    <div className="w-px h-8 bg-rose-50" />
                    <div>
                      <p className={cn('text-3xl font-bold tracking-tighter', levelAccentClass?.replace('text-', 'text-rose-500'))}>{levelText}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300 mt-1">Level</p>
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
