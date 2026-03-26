import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, CheckCircle2, XCircle, ArrowRight, RotateCcw, ChevronLeft, Sparkles, Star, Trophy, Target, BookOpen, Timer, Skull, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { VocabularyItem } from '@/types/vocabulary';

type ClassicSubMode = 'kanji-meaning' | 'kanji-reading' | 'reading-meaning' | 'mixed';
type ClassicDifficulty = 'peaceful' | 'warmup' | 'challenge' | 'demon' | 'hell' | 'infinite';

interface MultipleChoiceGameProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

interface Question {
  word: VocabularyItem;
  options: string[];
  correctIndex: number;
}

export const MultipleChoiceGame: React.FC<MultipleChoiceGameProps> = ({
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
  const [isReversed, setIsReversed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showStreak, setShowStreak] = useState(false);
  const [subMode, setSubMode] = useState<ClassicSubMode | null>(null);
  const [difficulty, setDifficulty] = useState<ClassicDifficulty | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  // Generate questions
  const questions = useMemo(() => {
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    const gameWords = shuffled.slice(0, Math.min(10, vocabulary.length));

    return gameWords.map((word): Question => {
      // Determine question type for this word
      let qType = subMode;
      if (subMode === 'mixed') {
        const types: ClassicSubMode[] = ['kanji-meaning', 'kanji-reading', 'reading-meaning'];
        qType = types[Math.floor(Math.random() * types.length)];
      }

      // Get 3 random wrong answers based on question type
      const wrongAnswers = vocabulary
        .filter((v) => v.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((v) => {
          if (qType === 'kanji-reading') return isReversed ? v.word : v.reading;
          if (qType === 'reading-meaning') return isReversed ? v.reading : v.meaning;
          return isReversed ? v.word : v.meaning;
        });

      // Create options array and shuffle
      let correctOption = '';
      if (qType === 'kanji-reading') correctOption = isReversed ? word.word : word.reading;
      else if (qType === 'reading-meaning') correctOption = isReversed ? word.reading : word.meaning;
      else correctOption = isReversed ? word.word : word.meaning;

      const options = [...wrongAnswers, correctOption].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(correctOption);

      return { word, options, correctIndex };
    });
  }, [vocabulary, isReversed, subMode, gameKey]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Timer & Flash Effect
  useEffect(() => {
    if (!difficulty || difficulty === 'peaceful' || gameComplete || showResult) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          handleAnswer(-1); // Timeout is treated as wrong
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    // Flash effect for Demon/Hell
    if (difficulty === 'demon' || difficulty === 'hell') {
      const flashTimer = setTimeout(() => setIsFlashActive(true), 1500);
      return () => {
        clearInterval(timer);
        clearTimeout(flashTimer);
      };
    }

    return () => clearInterval(timer);
  }, [currentIndex, difficulty, gameComplete, showResult]);

  useEffect(() => {
    if (difficulty && difficulty !== 'peaceful') {
      setTimeLeft(getTimerForDifficulty(difficulty));
      setIsFlashActive(false);
    }
  }, [currentIndex, difficulty]);

  // Auto-advance for high difficulties
  useEffect(() => {
    if (showResult && (difficulty === 'demon' || difficulty === 'hell' || difficulty === 'infinite')) {
      const isCorrect = selectedAnswer === currentQuestion?.correctIndex;
      // If correct, auto-advance after a short reading delay
      if (isCorrect) {
        const delay = difficulty === 'hell' ? 1000 : 2000;
        const autoNext = setTimeout(() => {
          handleNext();
        }, delay);
        return () => clearTimeout(autoNext);
      }
    }
  }, [showResult, difficulty, selectedAnswer, currentQuestion]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;

    setSelectedAnswer(index);
    setShowResult(true);

    const isCorrect = index === currentQuestion?.correctIndex;
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak(Math.max(maxStreak, newStreak));
      if (newStreak >= 3) setShowStreak(true);
      speak(currentQuestion.word.word);
    } else {
      setStreak(0);
      setShowStreak(false);
      // Sudden Death for Hell Mode
      if (difficulty === 'hell') {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setTimeout(() => setGameComplete(true), 1000);
      }
    }
    if (currentQuestion) {
      onUpdateMastery(currentQuestion.word.id, isCorrect);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      if (difficulty === 'infinite') {
        // Infinite mode reshuffles and continues
        setGameKey(prev => prev + 1);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setIsFlashActive(false);
        setTimeLeft(getTimerForDifficulty(difficulty));
      } else {
        setGameComplete(true);
        onComplete({
          correct: correctCount + (selectedAnswer === currentQuestion?.correctIndex ? 1 : 0),
          total: questions.length,
        });
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setCorrectCount(0);
    setGameComplete(false);
    setStreak(0);
    setShowStreak(false);
    setTimeLeft(getTimerForDifficulty(difficulty));
    setIsFlashActive(false);
  };

  const getTimerForDifficulty = (diff: ClassicDifficulty | null) => {
    switch (diff) {
      case 'warmup': return 15;
      case 'challenge': return 10;
      case 'demon': return 5;
      case 'hell': return 2;
      case 'infinite': return 10;
      default: return 0;
    }
  };

  if (!subMode || !difficulty) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3">
          <div className="inline-block p-4 bg-sky-50 rounded-3xl border border-sky-100 shadow-sm">
            <Target className="h-10 w-10 text-sky-500" />
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Cổ Điển - Demon Ops</h2>
          <p className="text-slate-400 font-medium">Chọn chế độ và cấp độ thử thách</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> 1. Chế độ học
            </h3>
            <div className="grid gap-3">
              {[
                { id: 'kanji-meaning', label: 'Hán tự ➔ Nghĩa', desc: 'Luyện ý nghĩa từ vựng' },
                { id: 'kanji-reading', label: 'Hán tự ➔ Cách đọc', desc: 'Luyện Furigana' },
                { id: 'reading-meaning', label: 'Cách đọc ➔ Nghĩa', desc: 'Luyện nghe & hiểu' },
                { id: 'mixed', label: 'Hỗn hợp (Mixed)', desc: 'Trùm cuối tổng hợp' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSubMode(m.id as ClassicSubMode)}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 text-left transition-all",
                    subMode === m.id 
                      ? "border-sky-500 bg-sky-50 shadow-lg shadow-sky-100 ring-2 ring-sky-100" 
                      : "border-slate-100 bg-white hover:border-sky-200"
                  )}
                >
                  <p className="font-bold text-slate-800">{m.label}</p>
                  <p className="text-[10px] text-slate-400">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> 2. Cấp độ lời nguyền
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'peaceful', label: 'Bình dị', icon: '🍃', desc: 'Thảnh thơi' },
                { id: 'warmup', label: 'Khởi động', icon: '👣', desc: '15 giây' },
                { id: 'challenge', label: 'Thử thách', icon: '⚔️', desc: '10 giây' },
                { id: 'demon', label: 'Ác quỷ', icon: '💀', desc: 'Flash Mode' },
                { id: 'hell', label: 'Địa ngục', icon: '🔥', desc: 'Sudden Death' },
                { id: 'infinite', label: 'Vô cực', icon: '♾️', desc: 'Tăng tốc' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id as ClassicDifficulty)}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-1",
                    difficulty === d.id 
                      ? "border-rose-500 bg-rose-50 shadow-lg shadow-rose-100 ring-2 ring-rose-100" 
                      : "border-slate-100 bg-white hover:border-rose-200"
                  )}
                >
                  <span className="text-2xl mb-1">{d.icon}</span>
                  <p className="text-xs font-black text-slate-800">{d.label}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-8">
           <Button variant="ghost" onClick={onBack} className="rounded-2xl gap-2 text-slate-400">
             <ChevronLeft className="h-4 w-4" /> Quay lại thư viện
           </Button>
        </div>
      </div>
    );
  }

  if (gameComplete) {
    const finalScore = correctCount;
    const percentage = Math.round((finalScore / questions.length) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-0 shadow-2xl overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 via-white to-blue-50">
          <div className="h-2 bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-display font-bold text-center text-sky-900 flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-amber-500" />
              Kết quả
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <div className="text-center relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-7xl font-display font-black bg-gradient-to-br from-sky-600 to-indigo-500 bg-clip-text text-transparent inline-block"
              >
                {percentage}%
              </motion.div>
              <p className="text-sky-400 font-medium tracking-widest uppercase text-sm mt-2">Chính xác</p>
              <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-amber-300 animate-pulse" />
            </div>

            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-sky-100 text-center">
              <p className="text-lg text-sky-800">
                Bạn trả lời đúng <span className="font-bold text-sky-600">{finalScore}</span> / {questions.length} câu
              </p>
              {maxStreak >= 3 && (
                <p className="text-sm text-amber-600 font-bold mt-1">
                  🔥 Chuỗi dài nhất: {maxStreak}
                </p>
              )}
              <div className="mt-2 text-sm">
                {percentage >= 80 ? (
                  <p className="text-green-600 font-bold">🌟 Xuất sắc!</p>
                ) : percentage >= 60 ? (
                  <p className="text-amber-600 font-bold">👍 Tốt lắm!</p>
                ) : (
                  <p className="text-orange-600 font-bold">💪 Cố gắng thêm nhé!</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={restartGame} 
                className="w-full gap-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white rounded-2xl py-6 text-lg font-bold shadow-lg shadow-sky-200 transition-all active:scale-95"
              >
                <RotateCcw className="h-5 w-5 inline-block mr-2" />
                Chơi lại
              </button>
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="w-full text-sky-500 hover:bg-sky-50 rounded-2xl py-6"
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
    <motion.div 
      animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Progress */}
      <div className="space-y-2 px-2">
        <div className="flex justify-between items-end mb-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-100 px-3 py-1 rounded-full text-xs font-bold">
              Câu {currentIndex + 1} {difficulty !== 'infinite' && `/ ${questions.length}`}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsReversed(!isReversed);
                restartGame();
              }}
              className="h-8 text-[10px] uppercase tracking-wider font-bold text-sky-400 hover:text-sky-600"
            >
              {isReversed ? 'Nghĩa → Nhật' : 'Nhật → Nghĩa'}
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            {difficulty !== 'peaceful' && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-lg border transition-all",
                timeLeft < 1.5 ? "bg-red-50 border-red-200 text-red-500" : "bg-sky-50 border-sky-100 text-sky-600"
              )}>
                <Timer className={cn("h-3.5 w-3.5", timeLeft < 1.5 && "animate-pulse")} />
                <span className="text-sm font-mono font-bold">{timeLeft.toFixed(1)}s</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {showStreak && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="flex items-center gap-1 bg-amber-100 text-amber-600 px-2 py-1 rounded-lg text-xs font-black shadow-sm"
                  >
                    <Sparkles className="h-3 w-3" />
                    STREAK {streak}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-sm font-bold text-green-600">{correctCount}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-sky-400 to-indigo-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-0 shadow-xl rounded-[2.5rem] bg-white overflow-hidden border border-sky-100/50">
          <CardContent className="py-12 text-center space-y-4">
            <div className={cn("space-y-4 transition-all duration-300", isFlashActive && !showResult && "blur-xl opacity-0 scale-90")}>
              {isReversed ? (
                <p className="text-4xl font-display font-medium text-sky-900 px-6">{currentQuestion.word.meaning}</p>
              ) : (
                <>
                  <p className="text-5xl font-jp font-bold text-sky-900">{currentQuestion.word.word}</p>
                  {currentQuestion.word.reading && (
                    <p className="text-xl text-sky-400 font-jp font-medium">
                      {currentQuestion.word.reading}
                    </p>
                  )}
                </>
              )}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => speak(currentQuestion.word.word)}
                  className="gap-2 text-sky-500 hover:text-sky-600 hover:bg-sky-50 rounded-xl px-4"
                >
                  <Volume2 className="h-4 w-4" />
                  Nghe phát âm
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Options */}
      <div className="grid gap-3 pt-2">
        <AnimatePresence mode="wait">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correctIndex;
            const showCorrect = showResult && isCorrect;
            const showWrong = showResult && isSelected && !isCorrect;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  className={cn(
                    "w-full py-5 px-6 rounded-2xl border-2 text-left transition-all duration-200 flex items-center group",
                    !showResult && "bg-white border-muted hover:border-sky-400 hover:bg-sky-50/50 hover:shadow-md",
                    showCorrect && "bg-[#ebf8f1] border-[#22c55e] text-[#166534] shadow-md",
                    showWrong && "bg-red-50 border-red-500 text-red-700 shadow-md",
                    isSelected && !showResult && "border-sky-500 bg-sky-50 ring-2 ring-sky-100",
                    showResult && !isCorrect && !isSelected && "opacity-50 grayscale-[0.2]"
                  )}
                  onClick={() => handleAnswer(index)}
                  disabled={showResult}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center mr-4 font-bold transition-colors shadow-sm",
                    !showResult && "bg-muted text-muted-foreground group-hover:bg-sky-100 group-hover:text-sky-600",
                    showCorrect && "bg-[#22c55e] text-white",
                    showWrong && "bg-red-500 text-white",
                    isSelected && !showResult && "bg-sky-500 text-white"
                  )}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-lg font-medium flex-1">{option}</span>
                  {showCorrect && <CheckCircle2 className="h-6 w-6 text-green-600 animate-in zoom-in" />}
                  {showWrong && <XCircle className="h-6 w-6 text-red-600 animate-in zoom-in" />}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Next Button */}
      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center pt-4"
        >
          <button 
            onClick={handleNext} 
            className="flex items-center gap-2 bg-sky-900 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-sky-950 transition-all active:scale-95"
          >
            {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </motion.div>
      )}

      {!showResult && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-muted-foreground gap-2 hover:text-sky-600"
          >
            <ChevronLeft className="h-4 w-4" />
            Dừng ôn tập
          </Button>
        </div>
      )}
    </motion.div>
  );
};
