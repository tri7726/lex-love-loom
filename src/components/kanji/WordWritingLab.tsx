import React, { useState, useEffect, useMemo, useRef } from 'react';
import { KanjiWriterCanvas } from './KanjiWriterCanvas';
import { KanaStrokeCanvas } from './KanaStrokeCanvas';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Target, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WordWritingLabProps {
  word: string;
  onComplete?: (totalScore: number) => void;
  size?: number;
  getMastery?: (word: string) => number | null;
  tierMode?: 'auto' | 'trace' | 'prompted' | 'freehand';
}

const TIER_LABELS = {
  trace: { label: 'Tập tô', desc: 'Viết theo các nét có sẵn', icon: Eye, color: 'text-sky-600', bg: 'bg-sky-100' },
  prompted: { label: 'Có gợi ý', desc: 'Gợi ý sau khi sai', icon: Target, color: 'text-amber-600', bg: 'bg-amber-100' },
  freehand: { label: 'Tự do', desc: 'Viết từ trí nhớ', icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-100' },
};

const computeTier = (mastery: number | null): 'trace' | 'prompted' | 'freehand' => {
  if (mastery === null) return 'trace';
  if (mastery < 30) return 'trace';
  if (mastery < 70) return 'prompted';
  return 'freehand';
};

export const WordWritingLab: React.FC<WordWritingLabProps> = ({
  word,
  onComplete,
  size = 300,
  getMastery,
  tierMode: tierModeProp = 'auto',
}) => {
  const [chars, setChars] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const scoresRef = useRef(scores);
  onCompleteRef.current = onComplete;
  scoresRef.current = scores;

  const isKanji = (char: string) => {
    if (!char) return false;
    const code = char.charCodeAt(0);
    return code >= 0x4E00 && code <= 0x9FFF;
  };

  // Reset when word changes
  useEffect(() => {
    const splitChars = word.split('');
    setChars(splitChars);
    setCurrentIndex(0);
    setScores(new Array(splitChars.length).fill(0));
    setIsFinished(false);
  }, [word]);

  // Determine tier for this word
  const wordTier = useMemo<'trace' | 'prompted' | 'freehand'>(() => {
    if (tierModeProp !== 'auto') return tierModeProp;
    if (!getMastery) return 'prompted';
    return computeTier(getMastery(word));
  }, [tierModeProp, getMastery, word]);

  const activeChar = chars[currentIndex];

  const handleNext = () => {
    if (currentIndex < chars.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const onCharSuccess = (score: number) => {
    const newScores = [...scores];
    newScores[currentIndex] = score;
    setScores(newScores);

    setTimeout(() => {
      handleNext();
    }, 1000);
  };

  const finish = () => {
    setIsFinished(true);
    const s = scoresRef.current;
    const totalScore = s.reduce((a, b) => a + b, 0) / (s.length || 1);
    if (onCompleteRef.current) onCompleteRef.current(Math.round(totalScore));
  };

  if (chars.length === 0) return null;

  const tierInfo = TIER_LABELS[wordTier];

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
      {/* Tier badge + Word Progress */}
      <div className="w-full space-y-3">
        {/* Tier indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider',
            tierInfo.bg, tierInfo.color,
            `${tierInfo.color.replace('text-', 'border-')}/30`
          )}>
            {React.createElement(tierInfo.icon, { className: "h-3 w-3" })}
            {tierInfo.label} — {tierInfo.desc}
          </div>
        </div>

        {/* Character progress */}
        <div className="flex gap-2 justify-center flex-wrap">
          {chars.map((char, idx) => (
            <div
              key={idx}
              className={cn(
                "w-10 h-14 rounded-xl border-2 flex items-center justify-center font-jp text-2xl transition-all duration-300 relative",
                idx === currentIndex && "border-sakura bg-sakura/5 scale-110 shadow-lg shadow-sakura/10",
                idx < currentIndex && "border-emerald-200 bg-emerald-50 text-emerald-600",
                idx > currentIndex && "border-border/50 text-muted-foreground/50"
              )}
            >
              {char}
              {idx < currentIndex && (
                <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative w-full flex justify-center min-h-[400px]">
        <AnimatePresence mode="wait">
          {isFinished ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center gap-6 py-12"
            >
              <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black uppercase tracking-widest text-foreground">Hoàn thành!</h3>
                <p className="text-muted-foreground font-medium">Bạn đã luyện viết xong từ: <span className="text-foreground font-bold">{word}</span></p>
              </div>
              <div className="text-5xl font-black text-sakura">
                {Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1))}%
              </div>
              <Button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFinished(false);
                  setScores(new Array(chars.length).fill(0));
                }}
                variant="outline"
                className="rounded-2xl px-8 h-12 border-2 border-sakura/20 text-sakura font-bold hover:bg-sakura/5"
              >
                Luyện lại từ này
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full flex flex-col items-center gap-6"
            >
              {isKanji(activeChar) ? (
                <KanjiWriterCanvas
                  kanji={activeChar}
                  onSuccess={onCharSuccess}
                  size={size}
                  showGuide={true}
                  tierMode={wordTier}
                />
              ) : (
                <KanaStrokeCanvas
                  kana={activeChar}
                  size={size}
                  onSuccess={onCharSuccess}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isFinished && (
        <div className="flex gap-4 w-full justify-between items-center max-w-[340px]">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="rounded-xl h-12 px-4 gap-2 text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Trước
          </Button>
          <div className="text-xs font-black text-muted-foreground/70 uppercase tracking-widest">
            {currentIndex + 1} / {chars.length}
          </div>
          <Button
            variant="ghost"
            onClick={handleNext}
            className="rounded-xl h-12 px-4 gap-2 text-muted-foreground"
          >
            Tiếp <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
