/**
 * SenseiWisdomWidget — Widget Dashboard tĩnh, zero API cost
 * Hiển thị lời chào theo giờ/mùa + kiến thức văn hóa Nhật từ prompt_repository.
 * Render tức thì, không block, không gọi API.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Flower2, BookOpen, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getNonRepeatingCulturalFact,
  getContextualGreeting,
  getTimeOfDay,
  getSeason,
  type TimeOfDay,
  type Season,
} from '@/components/chat/SenseiChatHub/prompt_repository';

// ─── Time/Season theme config ─────────────────────────────────────────────────
const TIME_CONFIG: Record<TimeOfDay, { label: string; emoji: string; gradient: string }> = {
  morning:   { label: 'Buổi sáng',  emoji: '☀️', gradient: 'from-amber-50 via-orange-50/40 to-rose-50/30' },
  afternoon: { label: 'Buổi chiều', emoji: '🌤️', gradient: 'from-sky-50 via-blue-50/40 to-indigo-50/30' },
  evening:   { label: 'Buổi tối',   emoji: '🌆', gradient: 'from-violet-50 via-purple-50/40 to-rose-50/30' },
  night:     { label: 'Đêm khuya',  emoji: '🌙', gradient: 'from-slate-900/5 via-indigo-50/30 to-violet-50/30' },
};

const SEASON_CONFIG: Record<Season, { label: string; color: string }> = {
  spring: { label: '🌸 Mùa Xuân', color: 'text-rose-400' },
  summer: { label: '🌻 Mùa Hạ',   color: 'text-amber-500' },
  autumn: { label: '🍂 Mùa Thu',  color: 'text-orange-500' },
  winter: { label: '❄️ Mùa Đông', color: 'text-blue-400' },
};

export const SenseiWisdomWidget: React.FC = () => {
  const [greeting, setGreeting] = useState('');
  const [fact, setFact] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFact, setShowFact] = useState(true); // true = fact, false = greeting

  const timeOfDay = getTimeOfDay();
  const season = getSeason();
  const timeConfig = TIME_CONFIG[timeOfDay];
  const seasonConfig = SEASON_CONFIG[season];

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setGreeting(getContextualGreeting('tutor'));
      setFact(getNonRepeatingCulturalFact());
      setIsRefreshing(false);
    }, 400);
  }, []);

  // Khởi tạo lần đầu
  useEffect(() => {
    setGreeting(getContextualGreeting('tutor'));
    setFact(getNonRepeatingCulturalFact());
  }, []);

  // Auto-toggle giữa greeting và fact mỗi 12 giây
  useEffect(() => {
    const interval = setInterval(() => {
      setShowFact(prev => !prev);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className={cn(
      'relative overflow-hidden border border-white/60 shadow-soft',
      'bg-gradient-to-br', timeConfig.gradient,
      'backdrop-blur-sm'
    )}>
      {/* Decorative background glyph */}
      <div className="absolute -right-4 -bottom-6 opacity-[0.04] pointer-events-none select-none">
        <span className="text-[120px] font-jp">智</span>
      </div>

      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-sakura/15 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-sakura" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">
                Sensei Wisdom
              </p>
              <p className={cn('text-[9px] font-semibold mt-0.5', seasonConfig.color)}>
                {seasonConfig.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Time badge */}
            <div className="flex items-center gap-1 rounded-full bg-white/50 border border-white/60 px-2 py-0.5">
              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[9px] font-semibold text-muted-foreground">{timeConfig.label}</span>
            </div>

            {/* Tab toggle */}
            <button
              onClick={() => setShowFact(v => !v)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold border transition-all',
                showFact
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-sakura/10 text-sakura border-sakura/20'
              )}
            >
              {showFact
                ? <><BookOpen className="h-2.5 w-2.5" /> Văn hóa</>
                : <><Sparkles className="h-2.5 w-2.5" /> Lời chào</>
              }
            </button>

            {/* Refresh */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-white/60 text-muted-foreground"
              onClick={refresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="min-h-[64px] flex items-start">
          <AnimatePresence mode="wait">
            {showFact ? (
              <motion.div
                key="fact"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex gap-2.5"
              >
                <Flower2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm leading-relaxed text-foreground/80 font-medium">
                  {fact}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="greeting"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex gap-2.5"
              >
                <span className="text-lg leading-none shrink-0">{timeConfig.emoji}</span>
                <p className="text-sm leading-relaxed text-foreground/80 italic">
                  "{greeting}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress dots (giờ vs fact) */}
        <div className="flex items-center gap-1 mt-3">
          <button
            onClick={() => setShowFact(false)}
            className={cn('h-1.5 rounded-full transition-all duration-300', !showFact ? 'w-6 bg-sakura' : 'w-1.5 bg-sakura/20')}
          />
          <button
            onClick={() => setShowFact(true)}
            className={cn('h-1.5 rounded-full transition-all duration-300', showFact ? 'w-6 bg-amber-400' : 'w-1.5 bg-amber-200')}
          />
        </div>
      </CardContent>
    </Card>
  );
};
