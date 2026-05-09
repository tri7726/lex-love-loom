/**
 * FlipMode — classic flashcard flip with FSRS 4-level self-rating
 */
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTTS } from '@/hooks/useTTS';
import { FSRSRating, previewIntervals } from '@/hooks/useFSRS';
import { cn } from '@/lib/utils';

interface FlipModeProps {
  cards: any[];
  onRate: (cardId: string, rating: FSRSRating) => Promise<void>;
  onComplete: (done: number) => void;
}

export const FlipMode: React.FC<FlipModeProps> = ({ cards, onRate, onComplete }) => {
  const { speak, isSpeaking } = useTTS({ lang: 'ja-JP' });
  const [idx, setIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [done, setDone] = useState(0);
  // useRef for debounce — React state is async so useState guard can be bypassed on fast double-click
  const ratingInProgress = useRef(false);
  const [activeRating, setActiveRating] = useState<FSRSRating | null>(null);

  const card = cards[idx];
  const progress = ((idx) / cards.length) * 100;

  const handleRate = async (r: FSRSRating) => {
    if (ratingInProgress.current) return; // synchronous guard — safe against double-click
    ratingInProgress.current = true;
    setActiveRating(r);
    await onRate(card.id, r);
    const newDone = done + 1;
    setDone(newDone);
    setTimeout(() => {
      if (idx + 1 < cards.length) {
        setIdx(i => i + 1);
        setIsFlipped(false);
        setActiveRating(null);
        ratingInProgress.current = false;
      } else {
        onComplete(newDone);
      }
    }, 260);
  };

  if (!card) return null;
  const preview = previewIntervals(card);
  const ratingBtns = [
    { r: 1 as FSRSRating, label: 'Lại', sub: '1 ngày', color: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' },
    { r: 2 as FSRSRating, label: 'Khó', sub: `${preview.hard}n`, color: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' },
    { r: 3 as FSRSRating, label: 'Tốt', sub: `${preview.good}n`, color: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' },
    { r: 4 as FSRSRating, label: 'Dễ', sub: `${preview.easy}n`, color: 'bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-between gap-8 w-full max-w-2xl mx-auto">
      {/* Flashcard */}
      <div className="w-full relative" style={{ perspective: '1200px' }}>
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.55, type: 'spring', stiffness: 280, damping: 22 }}
          style={{ transformStyle: 'preserve-3d', cursor: isFlipped ? 'default' : 'pointer' }}
          className="w-full relative"
          onClick={() => !isFlipped && setIsFlipped(true)}
        >
          {/* Front */}
          <div
            className="w-full bg-white rounded-[2.5rem] border-2 border-border/40 shadow-2xl flex flex-col items-center justify-center p-8 text-center space-y-5 min-h-[240px]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge variant="outline" className="bg-sakura/5 text-sakura border-none font-black text-[10px] uppercase tracking-widest px-4 py-1">Tiếng Nhật</Badge>
              {card._injected_reason && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-black text-[10px] uppercase tracking-widest px-3 py-1">
                  🎯 {card._injected_reason}
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-5xl md:text-6xl font-jp font-black text-foreground leading-tight">{card.word}</h3>
              {card.reading && <p className="text-lg font-jp text-sakura/60 font-medium">{card.reading}</p>}
            </div>
            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] animate-pulse">Chạm để xem nghĩa</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-white rounded-[2.5rem] border-2 border-sakura/30 shadow-2xl flex flex-col items-center justify-center p-8 text-center space-y-5"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase tracking-widest px-4 py-1">Ý nghĩa</Badge>
            <div className="space-y-3">
              <h3 className="text-2xl md:text-3xl font-black text-foreground leading-tight">{card.meaning}</h3>
              {card.hanviet && <p className="text-base text-sakura-dark/60 font-jp font-bold">Hán Việt: {card.hanviet}</p>}
              <button
                onClick={e => { e.stopPropagation(); speak(card.word); }}
                className={cn('mx-auto flex items-center gap-1.5 font-black text-xs mt-2 transition-all', isSpeaking ? 'text-primary animate-pulse' : 'text-sakura hover:scale-105')}
              >
                <Volume2 className="h-4 w-4" /> Phát âm
              </button>
            </div>
            {card.example_sentence && (
              <div className="max-w-xs p-3 rounded-2xl bg-muted/30 border border-border/40 text-left">
                <p className="text-xs font-jp text-foreground/70 italic">{card.example_sentence}</p>
                {card.example_translation && <p className="text-[10px] text-muted-foreground/60 mt-1">{card.example_translation}</p>}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="w-full h-24 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div key="hint" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Button
                onClick={() => setIsFlipped(true)}
                className="bg-sakura hover:bg-sakura/90 text-white rounded-full px-10 h-14 font-black shadow-xl shadow-sakura/20 gap-2 text-base"
              >
                Xem đáp án <Sparkles className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div key="rating" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-4 gap-2.5 w-full">
              {ratingBtns.map(b => (
                <button
                  key={b.r}
                  onClick={() => handleRate(b.r)}
                  disabled={ratingInProgress.current}
                  className={cn(
                    'flex flex-col items-center justify-center py-3 rounded-2xl border-2 transition-all active:scale-95 space-y-0.5 font-bold',
                    b.color,
                    ratingInProgress.current && 'opacity-50 pointer-events-none',
                    activeRating === b.r && 'ring-2 ring-offset-1 ring-current opacity-100 scale-95'
                  )}
                >
                  <span className="text-base">{b.label}</span>
                  <span className="text-[9px] opacity-60 font-black uppercase tracking-widest">{b.sub}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress */}
      <div className="w-full space-y-1.5">
        <div className="flex justify-between text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
          <span>Tiến độ</span>
          <span>{idx}/{cards.length} thẻ</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
};
