/**
 * MultipleChoiceMode — show JP word, pick correct meaning from 4 options.
 * Auto-rates: correct = Good(3), wrong = Again(1).
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Volume2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTTS } from '@/hooks/useTTS';
import { FSRSRating } from '@/hooks/useFSRS';
import { cn } from '@/lib/utils';

interface ChoiceModeProps {
  cards: any[];
  onRate: (cardId: string, rating: FSRSRating) => Promise<void>;
  onComplete: (done: number) => void;
}

/** Shuffle array in-place using Fisher-Yates */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fallback meanings to pad options when deck has < 4 cards
const FALLBACK_DISTRACTORS = [
  'Hoa anh đào', 'Mặt trời', 'Biển cả', 'Núi cao', 'Bầu trời',
  'Gió nhẹ', 'Mưa rơi', 'Ánh sáng', 'Bóng tối', 'Thời gian',
  'Cô đơn', 'Hạnh phúc', 'Tình yêu', 'Bạn bè', 'Gia đình',
];

function buildOptions(cards: any[], correctIdx: number): string[] {
  const correct = cards[correctIdx].meaning;
  const deckDistractors = cards
    .filter((_, i) => i !== correctIdx)
    .map(c => c.meaning)
    .filter(m => m && m !== correct);

  // Pad with fallback distractors if deck has < 3 other cards
  const needed = 3 - deckDistractors.length;
  const padded = needed > 0
    ? shuffle(FALLBACK_DISTRACTORS.filter(f => f !== correct)).slice(0, needed)
    : [];

  const pool = shuffle([...deckDistractors, ...padded]).slice(0, 3);
  return shuffle([correct, ...pool]);
}

export const MultipleChoiceMode: React.FC<ChoiceModeProps> = ({ cards, onRate, onComplete }) => {
  const { speak } = useTTS({ lang: 'ja-JP' });
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);

  const card = cards[idx];
  const options = useMemo(() => buildOptions(cards, idx), [cards, idx]);
  const progress = (idx / cards.length) * 100;

  const handleSelect = async (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const isCorrect = opt === card.meaning;
    const rating: FSRSRating = isCorrect ? 3 : 1;
    if (isCorrect) setCorrect(c => c + 1);
    await onRate(card.id, rating);
    const newDone = done + 1;
    setDone(newDone);
    setTimeout(() => {
      if (idx + 1 < cards.length) {
        setIdx(i => i + 1);
        setSelected(null);
      } else {
        onComplete(newDone);
      }
    }, 900);
  };

  if (!card) return null;

  return (
    <div className="flex-1 flex flex-col gap-6 w-full max-w-xl mx-auto">
      {/* Word display */}
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] border-2 border-border/40 shadow-xl p-8 text-center space-y-3"
      >
        <Badge className="bg-sakura/10 text-sakura border-none font-black text-[10px] uppercase tracking-widest px-4 py-1">Nghĩa của từ này là?</Badge>
        <h2 className="text-5xl font-jp font-black text-foreground leading-tight">{card.word}</h2>
        {card.reading && <p className="text-base font-jp text-sakura/60 font-medium">{card.reading}</p>}
        <button onClick={() => speak(card.word)} className="text-xs text-sakura/70 hover:text-sakura font-black flex items-center gap-1 mx-auto transition-colors">
          <Volume2 className="h-3.5 w-3.5" /> Nghe
        </button>
      </motion.div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence mode="wait">
          {options.map((opt, i) => {
            const isCorrectOpt = opt === card.meaning;
            const isSelected = selected === opt;
            const revealed = selected !== null;

            let optClass = 'border-border/50 bg-card hover:bg-muted/40 hover:border-border';
            if (revealed && isCorrectOpt) optClass = 'border-emerald-400 bg-emerald-50 text-emerald-700';
            else if (revealed && isSelected && !isCorrectOpt) optClass = 'border-red-400 bg-red-50 text-red-700';
            else if (revealed) optClass = 'border-border/30 bg-muted/20 text-muted-foreground/50';

            return (
              <motion.button
                key={opt + i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleSelect(opt)}
                disabled={!!selected}
                className={cn(
                  'w-full text-left p-4 rounded-2xl border-2 font-semibold text-sm transition-all duration-200 flex items-center justify-between gap-3',
                  optClass,
                  !selected && 'active:scale-[0.98] cursor-pointer'
                )}
              >
                <span className="flex items-center gap-3">
                  <span className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0',
                    revealed && isCorrectOpt ? 'bg-emerald-500 text-white' : revealed && isSelected ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </span>
                {revealed && isCorrectOpt && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
                {revealed && isSelected && !isCorrectOpt && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Stats + Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
          <span>✅ {correct} đúng / {done} đã làm</span>
          <span>{idx + 1}/{cards.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
};
