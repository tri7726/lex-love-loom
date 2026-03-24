import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, CheckCircle2, RotateCcw, Volume2, Shuffle, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VocabWord } from '@/hooks/useFlashcardFolders';

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
  grad = 'from-rose-300 via-pink-300 to-rose-400',
  isCustom = false,
}) => {
  const progress = words.length > 0 ? ((flashcardIndex + 1) / words.length) * 100 : 0;

  return (
    <div className="space-y-6">
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
            'relative rounded-3xl overflow-hidden min-h-[240px] md:min-h-[280px] shadow-2xl shadow-rose-200/40',
            'bg-gradient-to-br from-rose-100 via-pink-50 to-white border border-rose-200'
          )}>
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className={cn('absolute -top-20 -right-20 w-52 h-52 bg-gradient-to-br rounded-full blur-3xl opacity-20', grad, isCustom ? 'from-rose-300 to-pink-200' : '')} />
              <div className={cn('absolute -bottom-16 -left-16 w-40 h-40 bg-gradient-to-tr rounded-full blur-3xl opacity-15', grad, isCustom ? 'from-pink-300 to-rose-200' : '')} />
              <div className="absolute top-4 right-4 text-rose-200/40 text-[80px] font-jp select-none leading-none">
                {isCustom ? ((reversedCard ? isFlipped : !isFlipped) ? '語' : '🌸') : (isFlipped ? '🌸' : '語')}
              </div>
            </div>

            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-200/30 pointer-events-none">
              <motion.div
                className={cn('h-full bg-gradient-to-r', grad)}
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
                    className="text-center relative w-full"
                  >
                    {isWordSaved && toggleSaved && (
                      <Button
                        variant="ghost" size="icon"
                        className="absolute -top-12 right-0 h-10 w-10 text-rose-300 hover:text-amber-400 active:scale-125 transition-all"
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
                    <p className="text-lg text-rose-400 font-jp mt-2">{currentWord.word} {currentWord.reading && `(${currentWord.reading})`}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Nav arrows */}
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-rose-200/30 backdrop-blur-sm flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-200/50 transition-all z-20"
              onClick={onPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-rose-200/30 backdrop-blur-sm flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-200/50 transition-all z-20"
              onClick={onNext}
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-none">
              <span className="text-sm text-rose-400 font-medium tabular-nums">
                {flashcardIndex + 1} / {words.length}
              </span>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Nhấn <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Space</kbd> để lật · <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">←</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">→</kbd> để chuyển
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {!isCustom && (
          <div className="inline-flex bg-muted rounded-lg p-1 gap-1">
            <Button variant="default" size="sm" className="rounded-md text-xs h-8">Từ đơn</Button>
            <Button variant="ghost" size="sm" className="rounded-md text-xs h-8">Ví dụ</Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600">
            <X className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-green-200 text-green-400 hover:bg-green-50 hover:text-green-600">
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => speak(currentWord?.word || '')}>
            <Volume2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className={cn('h-9 w-9 rounded-xl', shuffled && 'bg-primary/10 text-primary')}
            onClick={() => setShuffled(!shuffled)}
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className={cn('h-9 w-9 rounded-xl', autoSpeak && 'bg-rose-100 text-rose-600')}
            onClick={() => setAutoSpeak(!autoSpeak)}
            title={autoSpeak ? 'Tắt tự phát âm' : 'Bật tự phát âm khi lật'}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className={cn('h-9 w-9 rounded-xl', reversedCard && 'bg-pink-100 text-pink-600')}
            onClick={() => { setReversedCard(!reversedCard); setIsFlipped(false); }}
            title={reversedCard ? 'Mặt trước: Từ JP' : 'Mặt trước: Nghĩa VN'}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
