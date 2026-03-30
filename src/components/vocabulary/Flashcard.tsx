import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, CheckCircle2, RotateCcw, Volume2, Shuffle, ArrowUpDown, Star, Sparkles, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VocabWord } from '@/types/vocabulary';
import { JapaneseText } from '@/components/JapaneseText';
import { useWritingLab } from '@/contexts/WritingLabContext';

export interface FlashcardProps {
  words: VocabWord[];
  currentWord: VocabWord;
  flashcardIndex: number;
  isFlipped: boolean;
  setIsFlipped: (flipped: boolean) => void;
  autoSpeak: boolean;
  setAutoSpeak: (auto: boolean) => void;
  reversedCard: boolean;
  setReversedCard: (rev: boolean) => void;
  shuffled: boolean;
  setShuffled: (shuffled: boolean) => void;
  speak: (text: string) => void;
  onPrev: (e?: React.MouseEvent) => void;
  onNext: (e?: React.MouseEvent) => void;
  onReset: () => void;
  isWordSaved?: (word: string) => boolean;
  toggleSaved?: (vocab: VocabWord) => void;
  grad?: string;
  isCustom?: boolean;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  words,
  currentWord,
  flashcardIndex,
  isFlipped,
  setIsFlipped,
  autoSpeak,
  setAutoSpeak,
  reversedCard,
  setReversedCard,
  shuffled,
  setShuffled,
  speak,
  onPrev,
  onNext,
  onReset,
  isWordSaved,
  toggleSaved,
  grad = 'from-rose-50 to-white',
  isCustom = false,
}) => {
  const { openWritingLab } = useWritingLab();
  const progress = words.length > 0 ? ((flashcardIndex + 1) / words.length) * 100 : 0;

  return (
    <div className="space-y-8 py-4">
      <div className="perspective-1000">
        <motion.div
          className="relative cursor-pointer select-none"
          onClick={() => {
            const willFlip = !isFlipped;
            setIsFlipped(willFlip);
            if (autoSpeak && currentWord) speak(currentWord.word);
          }}
        >
          <div className={cn(
            'relative rounded-3xl overflow-hidden min-h-[240px] md:min-h-[280px] shadow-2xl shadow-rose-200/40 transition-all duration-500',
            'bg-gradient-to-br from-rose-100 via-pink-50 to-white border border-rose-200'
          )}>
            {/* Decorative elements - Snippet Style Optimized */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-200/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-pink-200/15 rounded-full blur-2xl" />
              <div className="absolute top-4 right-4 text-rose-200/30 text-[80px] font-jp select-none leading-none">
                {isFlipped ? '🌸' : '語'}
              </div>
            </div>

            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-200/30 pointer-events-none">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-300 via-pink-300 to-rose-400"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[240px] md:min-h-[280px] p-8">
              <AnimatePresence mode="wait">
                {(reversedCard ? isFlipped : !isFlipped) ? (
                  <motion.div
                    key={`front-${flashcardIndex}`}
                    initial={{ opacity: 0, rotateY: -90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0, rotateY: 90 }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                  >
                    {isWordSaved && toggleSaved && (
                      <Button
                        variant="ghost" size="icon"
                        className="absolute -top-16 right-0 h-10 w-10 text-slate-200 hover:text-amber-400 active:scale-125 transition-all"
                        onClick={(e) => { e.stopPropagation(); toggleSaved(currentWord); }}
                      >
                        <Star className={cn('h-6 w-6', isWordSaved(currentWord.word) && 'fill-amber-400 text-amber-400')} />
                      </Button>
                    )}
                    <p className="text-6xl md:text-7xl font-jp text-rose-800 mb-4 drop-shadow-sm">{currentWord.word}</p>
                    {currentWord.reading && (
                      <p className="text-xl text-rose-400 font-jp">{currentWord.reading}</p>
                    )}
                    <div className="mt-4 flex items-center justify-center gap-2">
                       <span className="text-xs text-rose-400 border border-rose-200 rounded-full px-3 py-1">
                         nhấp để lật
                       </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`back-${flashcardIndex}`}
                    initial={{ opacity: 0, rotateY: 90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0, rotateY: -90 }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                  >
                    <p className="text-3xl md:text-4xl font-bold text-rose-800 mb-3">{currentWord.meaning}</p>
                    {currentWord.hanviet && (
                      <p className="text-base text-amber-400/80 uppercase tracking-widest font-medium">{currentWord.hanviet}</p>
                    )}
                    <p className="text-lg text-rose-400 font-jp mt-2">
                      {currentWord.word} {currentWord.reading && `(${currentWord.reading})`}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Nav arrows */}
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
              <button
                className="pointer-events-auto w-12 h-12 rounded-2xl bg-white/80 border border-slate-50 shadow-sm flex items-center justify-center text-slate-300 hover:text-sakura hover:shadow-md transition-all active:scale-90"
                onClick={onPrev}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                className="pointer-events-auto w-12 h-12 rounded-2xl bg-white/80 border border-slate-50 shadow-sm flex items-center justify-center text-slate-300 hover:text-sakura hover:shadow-md transition-all active:scale-90"
                onClick={onNext}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {/* Counter */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-none">
              <span className="text-xs text-rose-400 font-bold tracking-widest tabular-nums">
                {flashcardIndex + 1} / {words.length}
              </span>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-[10px] text-slate-300 font-black uppercase tracking-widest mt-6 flex items-center justify-center gap-4">
          <span><kbd className="px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100">Space</kbd> Flip</span>
          <span className="w-1 h-1 rounded-full bg-slate-200" />
          <span><kbd className="px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100">→</kbd> Nav</span>
        </p>
      </div>

      {/* Controls Container */}
      <div className="bg-white/50 backdrop-blur-md p-2 rounded-[2rem] border border-white shadow-xl max-w-fit mx-auto">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-xl text-slate-400 hover:text-sakura" 
            onClick={onReset}
            title="Chơi lại"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-slate-100 mx-1" />
          
          <Button
            variant="ghost" 
            size="icon"
            className="h-10 w-10 rounded-xl text-slate-400 hover:text-sakura group transition-all"
            onClick={(e) => { e.stopPropagation(); openWritingLab(currentWord.word); }}
            title="Luyện viết (Lab)"
          >
            <PenTool className="h-4 w-4 group-hover:rotate-12 transition-transform" />
          </Button>

          <Button
            variant="ghost" 
            size="icon"
            className={cn('h-10 w-10 rounded-xl transition-all', autoSpeak ? 'bg-rose-100 text-rose-600' : 'text-slate-400')}
            onClick={() => setAutoSpeak(!autoSpeak)}
            title={autoSpeak ? 'Tắt tự phát âm' : 'Bật tự phát âm khi lật'}
          >
            <Volume2 className={cn("h-4 w-4", autoSpeak && "animate-pulse")} />
          </Button>
          
          <Button
            variant="ghost" 
            size="icon"
            className={cn('h-10 w-10 rounded-xl transition-all', shuffled ? 'bg-rose-100 text-rose-600' : 'text-slate-400')}
            onClick={() => setShuffled(!shuffled)}
            title="Xáo trộn thẻ"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost" 
            size="icon"
            className={cn('h-10 w-10 rounded-xl transition-all', reversedCard ? 'bg-rose-100 text-rose-600' : 'text-slate-400')}
            onClick={() => { setReversedCard(!reversedCard); setIsFlipped(false); }}
            title={reversedCard ? 'Mặt trước: Nhật' : 'Mặt trước: Nghĩa'}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-slate-100 mx-1" />

          <div className="flex items-center gap-1.5 px-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-red-300 hover:bg-red-50 hover:text-red-500">
              <X className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-emerald-300 hover:bg-emerald-50 hover:text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
