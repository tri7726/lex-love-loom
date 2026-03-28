import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
      let qType = subMode;
      if (subMode === 'mixed') {
        const types: ClassicSubMode[] = ['kanji-meaning', 'kanji-reading', 'reading-meaning'];
        qType = types[Math.floor(Math.random() * types.length)];
      }

      const wrongAnswers = vocabulary
        .filter((v) => v.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((v) => {
          if (qType === 'kanji-reading') return isReversed ? v.word : v.reading;
          if (qType === 'reading-meaning') return isReversed ? v.reading : v.meaning;
          return isReversed ? v.word : v.meaning;
        });

      let correctOption = '';
      if (qType === 'kanji-reading') correctOption = isReversed ? word.word : word.reading;
      else if (qType === 'reading-meaning') correctOption = isReversed ? word.reading : word.meaning;
      else correctOption = isReversed ? word.word : word.meaning;

      const options = [...wrongAnswers, correctOption].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(correctOption);

      return { word, options, correctIndex };
    });
  }, [vocabulary, isReversed, subMode]); // Removed gameKey as it's not used in the block

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, []);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = useCallback((index: number) => {
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
      if (difficulty === 'hell') {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setTimeout(() => setGameComplete(true), 1000);
      }
    }
    if (currentQuestion) {
      onUpdateMastery(currentQuestion.word.id, isCorrect);
    }
  }, [showResult, currentQuestion, streak, maxStreak, showStreak, difficulty, onUpdateMastery, speak]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      if (difficulty === 'infinite') {
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
  }, [currentIndex, questions.length, difficulty, correctCount, selectedAnswer, currentQuestion?.correctIndex, onComplete]);

  useEffect(() => {
    if (!difficulty || difficulty === 'peaceful' || gameComplete || showResult) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          handleAnswer(-1);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    if (difficulty === 'demon' || difficulty === 'hell') {
      const flashTimer = setTimeout(() => setIsFlashActive(true), 1500);
      return () => {
        clearInterval(timer);
        clearTimeout(flashTimer);
      };
    }
    return () => clearInterval(timer);
  }, [currentIndex, difficulty, gameComplete, showResult, handleAnswer]);

  useEffect(() => {
    if (difficulty && difficulty !== 'peaceful') {
      setTimeLeft(getTimerForDifficulty(difficulty));
      setIsFlashActive(false);
    }
  }, [currentIndex, difficulty]);

  useEffect(() => {
    if (showResult && (difficulty === 'demon' || difficulty === 'hell' || difficulty === 'infinite')) {
      const isCorrect = selectedAnswer === currentQuestion?.correctIndex;
      if (isCorrect) {
        const delay = difficulty === 'hell' ? 1000 : 2000;
        const autoNext = setTimeout(() => {
          handleNext();
        }, delay);
        return () => clearTimeout(autoNext);
      }
    }
  }, [showResult, difficulty, selectedAnswer, currentQuestion, handleNext]);







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
          <div className="inline-block p-4 bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50">
            <Target className="h-10 w-10 text-sakura" />
          </div>
          <h2 className="text-4xl font-display font-black text-slate-800 tracking-tight">Cổ Điển - Demon Ops</h2>
          <p className="text-slate-400 font-medium">Chọn chế độ và cấp độ thử thách</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-2">
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
                    "w-full p-5 rounded-[2rem] border transition-all text-left",
                    subMode === m.id 
                      ? "border-sakura/20 bg-white shadow-[0_15px_30px_-5px_rgba(255,183,197,0.2)] ring-1 ring-sakura/10" 
                      : "border-slate-100 bg-white/60 hover:border-sakura/10 hover:bg-white"
                  )}
                >
                  <p className={cn("font-bold transition-colors", subMode === m.id ? "text-sakura" : "text-slate-800")}>{m.label}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-2">
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
                    "p-5 rounded-[2rem] border transition-all flex flex-col items-center gap-1 text-center",
                    difficulty === d.id 
                      ? "border-sakura/20 bg-white shadow-[0_15px_30px_-5px_rgba(255,183,197,0.2)] ring-1 ring-sakura/10" 
                      : "border-slate-100 bg-white/60 hover:border-sakura/10"
                  )}
                >
                  <span className="text-2xl mb-1">{d.icon}</span>
                  <p className={cn("text-xs font-black transition-colors", difficulty === d.id ? "text-sakura" : "text-slate-800")}>{d.label}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-8">
           <Button variant="ghost" onClick={onBack} className="rounded-full gap-2 text-slate-400 hover:text-sakura transition-colors">
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
        <Card className="border-0 shadow-2xl overflow-hidden rounded-[3rem] bg-white">
          <div className="h-2 bg-gradient-to-r from-sakura to-pink-300" />
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-display font-bold text-center text-slate-800 flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-amber-500" />
              Kết quả
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-10">
            <div className="text-center relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-7xl font-display font-black text-sakura bg-clip-text inline-block"
              >
                {percentage}%
              </motion.div>
              <p className="text-slate-400 font-black tracking-widest uppercase text-[10px] mt-2">Chính xác</p>
              <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-amber-200 animate-pulse" />
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] text-center border border-slate-100">
              <p className="text-lg text-slate-700 font-medium">
                Bạn trả lời đúng <span className="font-bold text-sakura">{finalScore}</span> / {questions.length} câu
              </p>
              {maxStreak >= 3 && (
                <p className="text-sm text-amber-600 font-bold mt-1">
                  🔥 Chuỗi dài nhất: {maxStreak}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={restartGame} 
                className="w-full gap-2 bg-slate-900 text-white rounded-[1.5rem] py-6 text-lg font-bold shadow-xl hover:bg-black transition-all active:scale-95"
              >
                <RotateCcw className="h-5 w-5 inline-block mr-2" />
                Chơi lại
              </button>
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="w-full text-slate-400 hover:text-sakura rounded-2xl py-6"
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
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="space-y-3 px-2">
        <div className="flex justify-between items-end mb-1">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-white text-sakura border-sakura/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
              Câu {currentIndex + 1} {difficulty !== 'infinite' && `/ ${questions.length}`}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsReversed(!isReversed);
                restartGame();
              }}
              className="h-8 text-[9px] uppercase tracking-widest font-black text-slate-300 hover:text-sakura"
            >
              {isReversed ? 'Nghĩa → Nhật' : 'Nhật → Nghĩa'}
            </Button>
          </div>
          
          <div className="flex items-center gap-5">
            {difficulty !== 'peaceful' && (
              <div className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all shadow-sm bg-white",
                timeLeft < 1.5 ? "border-red-200 text-red-500" : "border-slate-50 text-slate-400"
              )}>
                <Timer className={cn("h-3.5 w-3.5", timeLeft < 1.5 && "animate-pulse")} />
                <span className="text-sm font-mono font-bold">{timeLeft.toFixed(1)}s</span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {showStreak && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full text-xs font-black shadow-sm border border-amber-100"
                  >
                    <Sparkles className="h-3 w-3" />
                    {streak}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-50 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-sm font-black text-slate-600">{correctCount}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-sakura to-pink-300"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] rounded-[3.5rem] bg-white overflow-hidden border border-slate-50/50">
          <CardContent className="py-20 text-center space-y-6">
            <div className={cn("space-y-6 transition-all duration-300", isFlashActive && !showResult && "blur-2xl opacity-0 scale-90")}>
              {isReversed ? (
                <p className="text-4xl font-display font-medium text-slate-800 px-8 leading-relaxed">{currentQuestion.word.meaning}</p>
              ) : (
                <>
                  <p className="text-6xl font-jp font-black text-slate-800 tracking-tight">{currentQuestion.word.word}</p>
                  {(showResult || subMode === 'reading-meaning') && currentQuestion.word.reading && (
                    <p className="text-2xl text-sakura font-jp font-medium tracking-wide">
                      {currentQuestion.word.reading}
                    </p>
                  )}
                </>
              )}
              <div className="pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => speak(currentQuestion.word.word)}
                  className="gap-2 border-sakura/20 text-sakura hover:bg-sakura/5 rounded-2xl px-6 h-11 font-bold shadow-sm"
                >
                  <Volume2 className="h-4 w-4" />
                  Nghe phát âm
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-4 pt-2">
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
                    "w-full py-6 px-8 rounded-3xl border transition-all duration-300 flex items-center group relative overflow-hidden",
                    !showResult && "bg-white/80 border-slate-100 hover:border-sakura/20 hover:bg-white hover:shadow-xl",
                    showCorrect && "bg-[#fdfcfd] border-emerald-200 text-emerald-700 shadow-md ring-1 ring-emerald-50",
                    showWrong && "bg-red-50/50 border-red-200 text-red-700 shadow-md ring-1 ring-red-50",
                    isSelected && !showResult && "border-sakura bg-white shadow-xl ring-2 ring-sakura/5",
                    showResult && !isCorrect && !isSelected && "opacity-30 blur-[1px]"
                  )}
                  onClick={() => handleAnswer(index)}
                  disabled={showResult}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center mr-6 font-black transition-all shadow-sm text-xs",
                    !showResult && "bg-slate-50 text-slate-300 group-hover:bg-sakura/10 group-hover:text-sakura",
                    showCorrect && "bg-emerald-500 text-white",
                    showWrong && "bg-red-500 text-white",
                    isSelected && !showResult && "bg-sakura text-white"
                  )}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className={cn(
                    "text-xl flex-1 text-left font-medium tracking-tight",
                    showCorrect && "font-black"
                  )}>{option}</span>
                  {showCorrect && <CheckCircle2 className="h-6 w-6 text-emerald-500 animate-in zoom-in" />}
                  {showWrong && <XCircle className="h-6 w-6 text-red-500 animate-in zoom-in" />}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center pt-6"
        >
          <button 
            onClick={handleNext} 
            className="flex items-center gap-3 bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-black transition-all active:scale-95 group"
          >
            {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      )}

      {!showResult && (
        <div className="flex justify-center pt-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-slate-300 gap-2 hover:text-sakura rounded-full font-bold px-8"
          >
            <ChevronLeft className="h-4 w-4" />
            Dừng ôn tập
          </Button>
        </div>
      )}
    </motion.div>
  );
};
