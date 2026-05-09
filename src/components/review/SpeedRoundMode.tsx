/**
 * SpeedRoundMode — see word+meaning together, tap ✅/❌ as fast as possible.
 * 60-second countdown. Rates Good(3) for known, Again(1) for unknown.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FSRSRating } from '@/hooks/useFSRS';
import { cn } from '@/lib/utils';

const TOTAL_SECONDS = 60;

interface SpeedRoundProps {
  cards: any[];
  onRate: (cardId: string, rating: FSRSRating) => Promise<void>;
  onComplete: (done: number) => void;
}

export const SpeedRoundMode: React.FC<SpeedRoundProps> = ({ cards, onRate, onComplete }) => {
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [done, setDone] = useState(0);
  const [known, setKnown] = useState(0);
  const [showWord, setShowWord] = useState(true); // brief flash between cards
  const [lastResult, setLastResult] = useState<'known' | 'unknown' | null>(null);
  const ratingQueue = useRef<Promise<void>>(Promise.resolve());
  const finished = useRef(false);

  // Countdown timer
  useEffect(() => {
    if (finished.current) return;
    if (timeLeft <= 0) {
      finished.current = true;
      ratingQueue.current.then(() => onComplete(done));
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, done, onComplete]);

  const handleAnswer = useCallback((knowIt: boolean) => {
    if (!showWord || finished.current) return;
    const card = cards[idx];
    if (!card) return;

    const rating: FSRSRating = knowIt ? 3 : 1;
    setLastResult(knowIt ? 'known' : 'unknown');
    if (knowIt) setKnown(k => k + 1);

    // Queue FSRS update (fire-and-forget, don't block UI)
    ratingQueue.current = ratingQueue.current.then(() => onRate(card.id, rating));

    const newDone = done + 1;
    setDone(newDone);

    const nextIdx = idx + 1;
    if (nextIdx >= cards.length || timeLeft <= 1) {
      finished.current = true;
      ratingQueue.current.then(() => onComplete(newDone));
      return;
    }

    // Brief flash transition
    setShowWord(false);
    setTimeout(() => {
      setIdx(nextIdx);
      setLastResult(null);
      setShowWord(true);
    }, 220);
  }, [showWord, cards, idx, done, timeLeft, onRate, onComplete]);

  // Keyboard support: ArrowRight = known, ArrowLeft = unknown
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'k') handleAnswer(true);
      if (e.key === 'ArrowLeft' || e.key === 'j') handleAnswer(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAnswer]);

  const card = cards[idx];
  if (!card) return null;

  const timerPct = (timeLeft / TOTAL_SECONDS) * 100;
  const timerColor = timeLeft > 20 ? 'text-matcha' : timeLeft > 10 ? 'text-gold' : 'text-red-500';

  return (
    <div className="flex-1 flex flex-col gap-6 w-full max-w-xl mx-auto">
      {/* Timer bar — full width at top, no absolute positioning */}
      <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full transition-colors', timeLeft > 20 ? 'bg-matcha' : timeLeft > 10 ? 'bg-gold' : 'bg-red-500')}
          animate={{ width: `${timerPct}%` }}
          transition={{ duration: 0.8, ease: 'linear' }}
        />
      </div>

      {/* Timer + stats header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className={cn('h-5 w-5', timerColor)} />
          <span className={cn('text-2xl font-black tabular-nums', timerColor)}>{timeLeft}s</span>
        </div>
        <div className="flex gap-3 text-sm font-black">
          <span className="text-emerald-600">✅ {known}</span>
          <span className="text-red-500">❌ {done - known}</span>
        </div>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        {showWord && (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'relative bg-white rounded-[2.5rem] border-2 shadow-xl p-8 text-center space-y-4 transition-colors',
              lastResult === 'known' ? 'border-emerald-300' : lastResult === 'unknown' ? 'border-red-300' : 'border-border/40'
            )}
          >
            {lastResult && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4"
              >
                {lastResult === 'known'
                  ? <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  : <XCircle className="h-7 w-7 text-red-500" />
                }
              </motion.div>
            )}

            <Badge className="bg-sakura/10 text-sakura border-none font-black text-[10px] uppercase tracking-widest">Speed Round</Badge>
            <h2 className="text-5xl font-jp font-black text-foreground leading-tight">{card.word}</h2>
            {card.reading && <p className="text-base font-jp text-sakura/60">{card.reading}</p>}

            {/* Divider */}
            <div className="w-16 h-0.5 bg-border/40 mx-auto" />

            <p className="text-lg font-semibold text-foreground/80">{card.meaning}</p>
            {card.hanviet && <p className="text-sm text-muted-foreground">{card.hanviet}</p>}

            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
              Bạn có nhớ từ này không?
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleAnswer(false)}
          className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-black transition-all active:scale-95"
        >
          <XCircle className="h-8 w-8" />
          <span className="text-base">Không nhớ</span>
          <span className="text-[9px] opacity-60 uppercase tracking-widest">← hoặc J</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleAnswer(true)}
          className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-black transition-all active:scale-95"
        >
          <CheckCircle2 className="h-8 w-8" />
          <span className="text-base">Biết rồi!</span>
          <span className="text-[9px] opacity-60 uppercase tracking-widest">→ hoặc K</span>
        </motion.button>
      </div>

      {/* Progress */}
      <p className="text-center text-[11px] font-black text-muted-foreground/50 uppercase tracking-widest">
        {idx + 1} / {cards.length} thẻ
      </p>
    </div>
  );
};
