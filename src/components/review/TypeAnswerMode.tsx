/**
 * TypeAnswerMode — show JP word, user types Vietnamese meaning.
 * Uses fuzzy match to rate: exact=Easy(4), ≥70%=Good(3), ≥40%=Hard(2), else Again(1).
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Send, Volume2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useTTS } from '@/hooks/useTTS';
import { FSRSRating } from '@/hooks/useFSRS';
import { cn } from '@/lib/utils';

interface TypeAnswerProps {
  cards: any[];
  onRate: (cardId: string, rating: FSRSRating) => Promise<void>;
  onComplete: (done: number) => void;
}

/** Simple Levenshtein-based similarity 0..1 */
function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const dp: number[][] = Array.from({ length: s1.length + 1 }, (_, i) =>
    Array.from({ length: s2.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      dp[i][j] = s1[i - 1] === s2[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - dp[s1.length][s2.length] / maxLen;
}

function ratingFromSim(sim: number): FSRSRating {
  if (sim >= 0.95) return 4; // Easy
  if (sim >= 0.7)  return 3; // Good
  if (sim >= 0.4)  return 2; // Hard
  return 1;                  // Again
}

function resultLabel(r: FSRSRating): { text: string; color: string } {
  switch (r) {
    case 4: return { text: '🎉 Chính xác!', color: 'text-emerald-600' };
    case 3: return { text: '✅ Gần đúng', color: 'text-teal-600' };
    case 2: return { text: '🟡 Khá gần', color: 'text-amber-600' };
    default: return { text: '❌ Chưa đúng', color: 'text-red-600' };
  }
}

export const TypeAnswerMode: React.FC<TypeAnswerProps> = ({ cards, onRate, onComplete }) => {
  const { speak } = useTTS({ lang: 'ja-JP' });
  const inputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true); // guard setState after unmount
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resultRating, setResultRating] = useState<FSRSRating | null>(null);
  const [simPct, setSimPct] = useState(0);
  const [done, setDone] = useState(0);
  const [totalSim, setTotalSim] = useState(0);

  // Mark unmounted on cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const card = cards[idx];
  const progress = (idx / cards.length) * 100;

  // Auto-focus input on each card
  useEffect(() => {
    if (!submitted) inputRef.current?.focus();
  }, [idx, submitted]);

  const handleSubmit = async () => {
    if (!input.trim() || submitted || !card) return;
    const sim = similarity(input, card.meaning);
    const rating = ratingFromSim(sim);
    setSimPct(Math.round(sim * 100));
    setResultRating(rating);
    setSubmitted(true);
    setTotalSim(t => t + sim);
    await onRate(card.id, rating);
    const newDone = done + 1;
    setDone(newDone);

    // Auto-advance after 1.4s — guard against setState on unmounted component
    setTimeout(() => {
      if (!isMounted.current) return;
      if (idx + 1 < cards.length) {
        setIdx(i => i + 1);
        setInput('');
        setSubmitted(false);
        setResultRating(null);
        setSimPct(0);
      } else {
        onComplete(newDone);
      }
    }, 1400);
  };

  if (!card) return null;
  const res = resultRating ? resultLabel(resultRating) : null;
  const avgSim = done > 0 ? Math.round((totalSim / done) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col gap-5 w-full max-w-xl mx-auto">
      {/* Word */}
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] border-2 border-border/40 shadow-xl p-8 text-center space-y-3"
      >
        <Badge className="bg-sakura/10 text-sakura border-none font-black text-[10px] uppercase tracking-widest px-4 py-1">Nghĩa tiếng Việt là gì?</Badge>
        <h2 className="text-5xl font-jp font-black text-foreground leading-tight">{card.word}</h2>
        {card.reading && <p className="text-base font-jp text-sakura/60">{card.reading}</p>}
        <button onClick={() => speak(card.word)} className="text-xs text-sakura/70 hover:text-sakura font-black flex items-center gap-1 mx-auto">
          <Volume2 className="h-3.5 w-3.5" /> Nghe
        </button>
      </motion.div>

      {/* Input area */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => !submitted && setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !submitted && handleSubmit()}
            placeholder="Gõ nghĩa tiếng Việt..."
            disabled={submitted}
            className={cn(
              'flex-1 px-5 py-4 rounded-2xl border-2 font-medium text-sm outline-none transition-all',
              submitted
                ? resultRating === 1 ? 'border-red-300 bg-red-50/50' : 'border-emerald-300 bg-emerald-50/50'
                : 'border-border/50 bg-background focus:border-sakura focus:ring-2 focus:ring-sakura/20'
            )}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || submitted}
            className="rounded-2xl px-5 bg-sakura hover:bg-sakura/90 text-white h-auto"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Result reveal */}
        <AnimatePresence>
          {submitted && res && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-border/40 bg-muted/20 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className={cn('font-black text-sm', res.color)}>{res.text}</span>
                <span className="text-xs font-black text-muted-foreground/60">{simPct}% khớp</span>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground/60 uppercase font-black tracking-wider mb-0.5">Đáp án đúng:</p>
                <p className="font-semibold text-sm text-foreground">{card.meaning}</p>
              </div>
              {card.example_sentence && (
                <p className="text-[11px] font-jp text-muted-foreground/70 italic border-t border-border/30 pt-2">{card.example_sentence}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats + Progress */}
      <div className="space-y-2 mt-auto">
        <div className="flex justify-between text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
          <span>Độ chính xác trung bình: {avgSim}%</span>
          <span>{idx + 1}/{cards.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-[10px] text-center text-muted-foreground/40 font-medium">Nhấn Enter để nộp · Chấp nhận gần đúng</p>
      </div>
    </div>
  );
};
