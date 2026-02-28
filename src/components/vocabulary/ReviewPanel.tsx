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
  { mode: 'classic' as GameMode, icon: Target, label: 'Cổ điển', desc: 'Trắc nghiệm không giới hạn', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-500', shadow: 'hover:shadow-rose-100' },
  { mode: 'speed' as GameMode, icon: Zap, label: 'Tốc độ', desc: '10 giây mỗi câu', gradient: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', iconColor: 'text-pink-500', shadow: 'hover:shadow-pink-100' },
  { mode: 'listening' as GameMode, icon: Headphones, label: 'Nghe', desc: 'Nghe và chọn đáp án', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-400', shadow: 'hover:shadow-rose-100' },
  { mode: 'writing' as GameMode, icon: PenTool, label: 'Viết', desc: 'Tự gõ đáp án', gradient: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', iconColor: 'text-pink-400', shadow: 'hover:shadow-pink-100' },
  { mode: 'pronunciation' as GameMode, icon: Mic, label: 'Phát âm', desc: 'Luyện nói từ vựng', gradient: 'from-rose-50 to-pink-50', border: 'border-sakura/20 hover:border-sakura', iconColor: 'text-sakura', shadow: 'hover:shadow-sakura/10' },
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
            'w-full gap-3 py-7 text-lg font-bold rounded-2xl shadow-lg transition-all duration-300',
            'bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500',
            'hover:from-rose-500 hover:via-pink-500 hover:to-rose-600',
            'hover:shadow-xl hover:shadow-rose-300/40 text-white'
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
            <Card className="border-0 shadow-xl overflow-hidden mt-4">
              <div className="h-1 bg-gradient-to-r from-rose-300 via-pink-300 to-rose-400" />
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
                  <div className="flex justify-around pt-4 border-t text-center">
                    <div>
                      <p className="text-2xl font-bold text-rose-500">{wordCount}</p>
                      <p className="text-xs text-muted-foreground">Câu hỏi</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-500">5</p>
                      <p className="text-xs text-muted-foreground">Chế độ</p>
                    </div>
                    <div>
                      <p className={cn('text-2xl font-bold', levelAccentClass)}>{levelText}</p>
                      <p className="text-xs text-muted-foreground">Level</p>
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
