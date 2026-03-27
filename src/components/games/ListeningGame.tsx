import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, CheckCircle2, XCircle, ArrowRight, RotateCcw, ChevronLeft, Headphones, Star, Sparkles, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { VocabularyItem } from '@/types/vocabulary';

interface ListeningGameProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

interface Question {
  word: VocabularyItem;
  options: VocabularyItem[];
  correctIndex: number;
}

export const ListeningGame: React.FC<ListeningGameProps> = ({
  vocabulary,
  onComplete,
  onUpdateMastery,
  onBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isBlind, setIsBlind] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Generate questions
  const questions = useMemo(() => {
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    const gameWords = shuffled.slice(0, Math.min(10, vocabulary.length));

    return gameWords.map((word): Question => {
      // Get 3 random wrong options
      const wrongOptions = vocabulary
        .filter((v) => v.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      // Create options array and shuffle
      const options = [...wrongOptions, word].sort(() => Math.random() - 0.5);
      const correctIndex = options.findIndex((o) => o.id === word.id);

      return { word, options, correctIndex };
    });
  }, [vocabulary]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = playbackRate * 0.7; // Base rate adjusted by multiplier
      speechSynthesis.speak(utterance);
    }
  }, [playbackRate]);

  useEffect(() => {
    // Auto-play on new question
    if (currentQuestion && !hasPlayed) {
      const timer = setTimeout(() => speak(currentQuestion.word.word), 500);
      setHasPlayed(true);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, hasPlayed, speak]);

  const handleAnswer = useCallback((index: number) => {
    if (showResult) return;

    setSelectedAnswer(index);
    setShowResult(true);

    const isCorrect = index === currentQuestion?.correctIndex;
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }
    if (currentQuestion) {
      onUpdateMastery(currentQuestion.word.id, isCorrect);
    }
  }, [showResult, currentQuestion, onUpdateMastery]);

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setGameComplete(true);
      onComplete({
        correct: correctCount + (selectedAnswer === currentQuestion?.correctIndex ? 1 : 0),
        total: questions.length,
      });
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setHasPlayed(false);
    }
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setCorrectCount(0);
    setGameComplete(false);
    setHasPlayed(false);
  };

  if (gameComplete) {
    const finalScore = correctCount;
    const percentage = Math.round((finalScore / questions.length) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-0 shadow-2xl overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 via-white to-rose-50">
          <div className="h-2 bg-gradient-to-r from-orange-400 via-rose-400 to-pink-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-display font-bold text-center text-rose-800 flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-amber-500" />
              Kết quả
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <div className="text-center relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-7xl font-display font-black bg-gradient-to-br from-orange-600 to-rose-500 bg-clip-text text-transparent inline-block"
              >
                {percentage}%
              </motion.div>
              <p className="text-rose-400 font-medium tracking-widest uppercase text-sm mt-2">Độ nhạy tai</p>
              <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-amber-300 animate-pulse" />
            </div>

            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-rose-100 text-center">
              <p className="text-lg text-rose-800">
                Bạn nghe đúng <span className="font-bold text-rose-600">{finalScore}</span> / {questions.length} câu
              </p>
              <div className="mt-2 text-sm">
                {percentage >= 80 ? (
                  <p className="text-green-600 font-bold">🌟 Tai nghe cực nhạy!</p>
                ) : percentage >= 60 ? (
                  <p className="text-amber-600 font-bold">👍 Nghe tốt lắm!</p>
                ) : (
                  <p className="text-orange-600 font-bold">💪 Cần luyện thêm nhé!</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={restartGame} 
                className="w-full gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-2xl py-6 text-lg font-bold shadow-lg shadow-orange-200 transition-all active:scale-95"
              >
                <RotateCcw className="h-5 w-5 inline-block mr-2" />
                Chơi lại
              </button>
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="w-full text-rose-500 hover:bg-rose-50 rounded-2xl py-6"
              >
                Quay lại danh sách
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Progress */}
      <div className="space-y-4 px-2">
        <div className="flex justify-between items-center transition-all duration-300">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-100 px-3 py-1 rounded-full text-xs font-bold">
              Câu {currentIndex + 1} / {questions.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBlind(!isBlind)}
              className={cn(
                "h-8 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-colors",
                isBlind ? "bg-orange-100 text-orange-600" : "text-orange-400 hover:text-orange-600"
              )}
            >
              {isBlind ? 'Ẩn chữ (ON)' : 'Ẩn chữ (OFF)'}
            </Button>
          </div>
          
          <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-orange-100">
            {[0.75, 1, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all",
                  playbackRate === rate ? "bg-orange-500 text-white shadow-sm" : "text-orange-400 hover:bg-orange-100"
                )}
              >
                {rate}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-bold text-green-600">{correctCount}</span>
          </div>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-orange-400 to-rose-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Action Area */}
      <Card className="border-0 shadow-xl rounded-[3rem] bg-white overflow-hidden border border-orange-100/50">
        <CardContent className="py-16 text-center space-y-8">
          <div className="space-y-4">
            <p className="text-rose-400 font-medium uppercase tracking-widest text-sm">Nghe và chọn đáp án đúng</p>
            
            <div className="relative inline-block">
              {/* Pulsing rings animation */}
              <motion.div 
                animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-orange-200"
              />
              <motion.div 
                animate={{ scale: [1, 1.2], opacity: [0.3, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-orange-100"
              />
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => speak(currentQuestion.word.word)}
                className="relative w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white flex items-center justify-center shadow-2xl shadow-orange-200 z-10 transition-all"
              >
                <Volume2 className="h-14 w-14" />
              </motion.button>
            </div>

            <p className="text-sm text-muted-foreground font-medium pt-4">
              Nhấn vào nút để nghe lại
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Options Grid */}
      <div className="grid grid-cols-2 gap-4">
        <AnimatePresence mode="wait">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correctIndex;
            const showCorrect = showResult && isCorrect;
            const showWrong = showResult && isSelected && !isCorrect;

            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <button
                  className={cn(
                    "w-full min-h-[140px] p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 text-center",
                    !showResult && "bg-white border-muted hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-lg shadow-sm backdrop-blur-sm",
                    showCorrect && "bg-[#ebf8f1] border-[#22c55e] text-[#166534] shadow-md",
                    showWrong && "bg-red-50 border-red-500 text-red-700 shadow-md",
                    isSelected && !showResult && "border-orange-500 bg-orange-50 ring-4 ring-orange-100",
                    showResult && !isCorrect && !isSelected && "opacity-50 grayscale-[0.2]"
                  )}
                  onClick={() => handleAnswer(index)}
                  disabled={showResult}
                >
                  <div className={cn(
                    "transition-all duration-500",
                    isBlind && !showResult ? "blur-md opacity-20" : "blur-0 opacity-100"
                  )}>
                    <p className={cn(
                      "font-jp text-3xl font-bold transition-colors",
                      !showResult ? "text-slate-800" : (showCorrect ? "text-[#166534]" : "text-red-700")
                    )}>
                      {option.word}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{option.reading}</p>
                  </div>
                  
                  {showResult && (
                    <div className="mt-1">
                      {showCorrect && <CheckCircle2 className="h-6 w-6 text-green-600 animate-in zoom-in" />}
                      {showWrong && <XCircle className="h-6 w-6 text-red-600 animate-in zoom-in" />}
                    </div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-col items-center gap-6 pt-4">
        {showResult && (
          <motion.button 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNext} 
            className="flex items-center gap-3 bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold shadow-2xl hover:bg-black transition-all active:scale-95 group"
          >
            {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        )}

        <Button 
          variant="ghost" 
          onClick={onBack}
          className="text-muted-foreground gap-2 hover:text-orange-600 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại Flashcard Hub
        </Button>
      </div>
    </div>
  );
};
