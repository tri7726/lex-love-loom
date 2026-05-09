import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, Headphones, PenTool, Mic, Sparkles, Settings, SlidersHorizontal, Filter, Hash, Keyboard, Skull } from 'lucide-react';
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
  // Custom session config
  customConfig?: {
    questionCount: number;
    focus: 'all' | 'weak' | 'random';
    timer: boolean;
    mixMode: boolean;
  };
  setCustomConfig?: (config: { questionCount: number; focus: 'all' | 'weak' | 'random'; timer: boolean; mixMode: boolean }) => void;
}

const MODES = [
  { mode: 'classic' as GameMode, icon: Target, label: 'Cổ điển', desc: 'Trắc nghiệm trí tuệ', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-500', shadow: 'hover:shadow-rose-100' },
  { mode: 'speed' as GameMode, icon: Zap, label: 'Tốc độ', desc: 'Phản xạ chớp nhoáng', gradient: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', iconColor: 'text-pink-500', shadow: 'hover:shadow-pink-100' },
  { mode: 'listening' as GameMode, icon: Headphones, label: 'Nghe', desc: 'Luyện tai tinh tường', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-400', shadow: 'hover:shadow-rose-100' },
  { mode: 'writing' as GameMode, icon: PenTool, label: 'Viết', desc: 'Rèn luyện nét chữ', gradient: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', iconColor: 'text-pink-400', shadow: 'hover:shadow-pink-100' },
  { mode: 'match' as GameMode, icon: Sparkles, label: 'Ghép cặp', desc: 'Kết nối tri thức', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-500', shadow: 'hover:shadow-rose-100' },
  { mode: 'pronunciation' as GameMode, icon: Mic, label: 'Phát âm', desc: 'Ngữ điệu bản xứ', gradient: 'from-pink-50 to-rose-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-sakura', shadow: 'hover:shadow-sakura/10' },
  { mode: 'lab' as GameMode, icon: PenTool, label: 'Viết tay', desc: 'Luyện nét chữ', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-sakura', shadow: 'hover:shadow-sakura/10' },
  { mode: 'fillblank' as GameMode, icon: Keyboard, label: 'Điền từ', desc: 'Gõ từ vào chỗ trống', gradient: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', iconColor: 'text-sakura', shadow: 'hover:shadow-sakura/10' },
  { mode: 'boss' as GameMode, icon: Skull, label: 'BOSS BATTLE', desc: 'Thử thách cuối chương', gradient: 'from-rose-100 to-pink-100', border: 'border-rose-400 hover:border-rose-600', iconColor: 'text-rose-600', shadow: 'hover:shadow-rose-200' },
];

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  showReviewPanel,
  setShowReviewPanel,
  wordCount,
  levelText,
  levelAccentClass,
  onSelectGame,
  isCustom = false,
  customConfig,
  setCustomConfig,
}) => {
  const [showConfig, setShowConfig] = useState(false);

  const handleSelectGame = (mode: GameMode) => {
    if (isCustom && wordCount < 4) return;
    onSelectGame(mode);
  };

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
                {/* Header + Config toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-rose-400" />
                    <h3 className="font-bold text-lg">Chọn chế độ chơi</h3>
                  </div>
                  {setCustomConfig && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfig(!showConfig)}
                      className={cn(
                        'gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all',
                        showConfig ? 'text-rose-600 bg-rose-50' : 'text-muted-foreground/60 hover:text-rose-500'
                      )}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      {showConfig ? 'Đóng' : 'Tùy chỉnh'}
                    </Button>
                  )}
                </div>

                {/* Custom config panel */}
                <AnimatePresence>
                  {showConfig && customConfig && setCustomConfig && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-pink-50 to-white border border-rose-100 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
                          <SlidersHorizontal className="h-3 w-3" /> Cấu hình nâng cao
                        </p>

                        {/* Question count */}
                        <div>
                          <p className="text-xs font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Hash className="h-3 w-3" /> Số câu hỏi
                          </p>
                          <div className="flex gap-1.5">
                            {[5, 10, 15, 20].map(n => (
                              <button
                                key={n}
                                onClick={() => setCustomConfig({ ...customConfig, questionCount: n })}
                                className={cn(
                                  'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                                  customConfig.questionCount === n
                                    ? 'bg-rose-400 text-white shadow-sm'
                                    : 'bg-white text-muted-foreground/60 border border-rose-200/50 hover:border-rose-300'
                                )}
                              >{n}</button>
                            ))}
                            <button
                              onClick={() => setCustomConfig({ ...customConfig, questionCount: wordCount })}
                              className={cn(
                                'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                                customConfig.questionCount >= wordCount
                                  ? 'bg-rose-400 text-white shadow-sm'
                                  : 'bg-white text-muted-foreground/60 border border-rose-200/50 hover:border-rose-300'
                              )}
                            >All</button>
                          </div>
                        </div>

                        {/* Focus */}
                        <div>
                          <p className="text-xs font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Filter className="h-3 w-3" /> Tập trung vào
                          </p>
                          <div className="flex gap-1.5">
                            {([
                              { value: 'all', label: 'Tất cả' },
                              { value: 'weak', label: 'Từ yếu' },
                              { value: 'random', label: 'Ngẫu nhiên' },
                            ] as const).map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setCustomConfig({ ...customConfig, focus: opt.value })}
                                className={cn(
                                  'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                                  customConfig.focus === opt.value
                                    ? 'bg-rose-400 text-white shadow-sm'
                                    : 'bg-white text-muted-foreground/60 border border-rose-200/50 hover:border-rose-300'
                                )}
                              >{opt.label}</button>
                            ))}
                          </div>
                        </div>

                        <p className="text-[9px] text-muted-foreground/40 italic">
                          {customConfig.focus === 'weak' ? 'Ưu tiên các từ có độ thuần thục thấp' :
                           customConfig.focus === 'random' ? 'Chọn ngẫu nhiên từ trong danh sách' :
                           `Sử dụng tất cả ${wordCount} từ`}
                          {customConfig.questionCount < wordCount && ` (tối đa ${customConfig.questionCount} từ)`}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Game cards */}
                <div className={cn("grid gap-3", isCustom ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2")}>
                  {MODES.map(({ mode, icon: Icon, label, desc, gradient, border, iconColor, shadow }) => (
                    <motion.div key={mode} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Card
                        className={cn('cursor-pointer border-2 transition-all duration-200 shadow-sm', border, shadow, `bg-gradient-to-br ${gradient}`)}
                        onClick={() => handleSelectGame(mode)}
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
                      <p className="text-3xl font-bold text-amber-500 tracking-tighter">7</p>
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
