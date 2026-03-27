import React, { useState, useEffect } from 'react';
import { KanjiWriterCanvas } from './KanjiWriterCanvas';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSRS } from '@/hooks/useSRS';

interface WordWritingLabProps {
  word: string;
  onComplete?: (totalScore: number) => void;
  size?: number;
}

export const WordWritingLab: React.FC<WordWritingLabProps> = ({
  word,
  onComplete,
  size = 300,
}) => {
  const [chars, setChars] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const { syncLabResult } = useSRS();

  useEffect(() => {
    // Split word into characters
    const splitChars = word.split('');
    setChars(splitChars);
    setCurrentIndex(0);
    setScores(new Array(splitChars.length).fill(0));
    setIsFinished(false);
  }, [word]);

  const activeChar = chars[currentIndex];
  // Check if character is Kanji (using Unicode range)
  const isKanji = (char: string) => {
    if (!char) return false;
    const code = char.charCodeAt(0);
    return code >= 0x4E00 && code <= 0x9FFF;
  };

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

    // Sync with SRS
    if (isKanji(activeChar)) {
      syncLabResult(activeChar, score);
    }

    // Auto-advance
    setTimeout(() => {
      handleNext();
    }, 1000);
  };

  const finish = () => {
    setIsFinished(true);
    const totalScore = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    if (onComplete) onComplete(Math.round(totalScore));
  };

  // If the current character is NOT Kanji (Kana/Punctuation), we skip or show it differently
  useEffect(() => {
    if (chars.length > 0 && !isKanji(chars[currentIndex]) && !isFinished) {
      // Auto-skip non-kanji characters (Quick Recognition mode)
      const timer = setTimeout(() => {
        handleNext();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, chars, isFinished]);

  if (chars.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
      {/* Word Progress Indicator */}
      <div className="flex gap-2 justify-center flex-wrap">
        {chars.map((char, idx) => (
          <div 
            key={idx}
            className={cn(
              "w-10 h-14 rounded-xl border-2 flex items-center justify-center font-jp text-2xl transition-all duration-300",
              idx === currentIndex && "border-sakura bg-sakura/5 scale-110 shadow-lg shadow-sakura/10",
              idx < currentIndex && "border-emerald-200 bg-emerald-50 text-emerald-600",
              idx > currentIndex && "border-slate-100 text-slate-300"
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
                <h3 className="text-2xl font-black uppercase tracking-widest text-slate-800">Hoàn thành!</h3>
                <p className="text-muted-foreground font-medium">Bạn đã luyện viết xong từ: <span className="text-slate-900 font-bold">{word}</span></p>
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
                  showGuide={true} // Defaulting to guided in lab, can be made dynamic later
                />
              ) : (
                <div 
                  className="flex flex-col items-center justify-center gap-4 bg-white/40 backdrop-blur-sm border-4 border-dashed border-sakura/10 rounded-[3rem]"
                  style={{ width: size, height: size }}
                >
                  <span className="text-8xl font-jp text-sakura/20 animate-pulse">{activeChar}</span>
                  <p className="text-[10px] font-black text-sakura/40 uppercase tracking-[0.2em]">Tự động hoàn thành...</p>
                </div>
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
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
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
