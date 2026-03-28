import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Timer, Trophy, Flame, RotateCcw, ChevronLeft, Sparkles, Star, Heart, HeartOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VocabularyItem } from '@/types/vocabulary';


interface SpeedGameProps {
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

const QUESTION_TIME = 5; // seconds per question
const COMBO_MULTIPLIER = 0.5; // extra points per combo

export const SpeedGame: React.FC<SpeedGameProps> = ({
  vocabulary,
  onComplete,
  onUpdateMastery,
  onBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState(3);

  // Generate questions
  const questions = useMemo(() => {
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    const gameWords = shuffled.slice(0, Math.min(15, vocabulary.length));

    return gameWords.map((word): Question => {
      const wrongAnswers = vocabulary
        .filter((v) => v.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((v) => v.meaning);

      const options = [...wrongAnswers, word.meaning].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(word.meaning);

      return { word, options, correctIndex };
    });
  }, [vocabulary]);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = useCallback((index: number) => {
    if (showFeedback) return;

    setSelectedAnswer(index);
    setShowFeedback(true);

    const isCorrect = index === currentQuestion?.correctIndex;
    
    if (isCorrect) {
      const timeBonus = Math.ceil(timeLeft * 2);
      const comboBonus = Math.floor(combo * COMBO_MULTIPLIER);
      const points = 10 + timeBonus + comboBonus;
      
      setScore((prev) => prev + points);
      setCombo((prev) => {
        const newCombo = prev + 1;
        setMaxCombo((max) => Math.max(max, newCombo));
        return newCombo;
      });
      setCorrectCount((prev) => prev + 1);
    } else {
      setCombo(0);
      setLives((prev) => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setTimeout(() => setGameComplete(true), 600);
        }
        return newLives;
      });
    }

    if (currentQuestion) {
      onUpdateMastery(currentQuestion.word.id, isCorrect);
    }

    setTimeout(() => {
      if (lives > 0 && currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        const nextTime = Math.max(2.5, QUESTION_TIME - (currentIndex * 0.2));
        setTimeLeft(nextTime);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else if (lives > 0 || currentIndex + 1 >= questions.length) {
        setGameComplete(true);
        onComplete({
          correct: correctCount + (isCorrect ? 1 : 0),
          total: questions.length,
        });
      }
    }, 600);
  }, [currentIndex, currentQuestion, combo, timeLeft, showFeedback, questions.length, correctCount, lives, onComplete, onUpdateMastery]);

  // Timer
  useEffect(() => {
    if (gameComplete || showFeedback) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          handleAnswer(-1);
          return QUESTION_TIME;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentIndex, showFeedback, gameComplete, handleAnswer]);

  const restartGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(QUESTION_TIME);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setGameComplete(false);
    setCorrectCount(0);
    setLives(3);
  };

  if (gameComplete) {
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-0 shadow-2xl overflow-hidden rounded-[3rem] bg-white">
          <div className="h-2 bg-gradient-to-r from-sakura to-rose-300" />
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
                className="text-7xl font-display font-black text-sakura inline-block"
              >
                {score}
              </motion.div>
              <p className="text-slate-400 font-black tracking-widest uppercase text-[10px] mt-2">Tổng điểm</p>
              <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-amber-200 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <Star className="h-5 w-5 mx-auto text-amber-400 mb-1" />
                <p className="text-2xl font-bold text-slate-800">{percentage}%</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Chính xác</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                <p className="text-2xl font-bold text-slate-800">{maxCombo}</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Max Combo</p>
              </div>
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

  const timePercent = (timeLeft / QUESTION_TIME) * 100;
  const isLowTime = timeLeft <= 1.5;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header Stats */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <span className="text-2xl font-black text-slate-800 tracking-tighter">{score}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 1 }}
                animate={{ scale: i < lives ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                {i < lives ? (
                  <Heart className="h-5 w-5 text-sakura fill-sakura" />
                ) : (
                  <HeartOff className="h-5 w-5 text-slate-200" />
                )}
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {combo > 1 && (
              <motion.div
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-orange-100 shadow-sm"
              >
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-black text-xs text-orange-600 italic">{combo}x</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-sm bg-white",
            isLowTime ? "border-red-200 text-red-500" : "border-slate-50 text-slate-400"
          )}>
            <Timer className={cn("h-4 w-4", isLowTime && "animate-pulse")} />
            <span className="font-mono font-bold text-lg">
              {timeLeft.toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="px-2">
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className={cn(
              "h-full rounded-full transition-colors",
              isLowTime ? "bg-gradient-to-r from-red-400 to-rose-500" : "bg-gradient-to-r from-sakura to-rose-400"
            )}
            style={{ width: `${timePercent}%` }}
            initial={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <Card className="border-0 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.03)] rounded-[3.5rem] bg-white overflow-hidden border border-slate-50/50">
          <div className="absolute top-6 right-8">
            <Badge variant="outline" className="text-slate-200 border-slate-50 bg-white/50 backdrop-blur-sm text-[9px] font-black uppercase tracking-widest">
              Bài {currentIndex + 1} / {questions.length}
            </Badge>
          </div>
          <CardContent className="py-20 text-center space-y-4">
            <p className="text-6xl font-jp font-black text-slate-800 tracking-tight mb-2">{currentQuestion.word.word}</p>
            {showFeedback && currentQuestion.word.reading && (
              <p className="text-2xl text-sakura font-jp font-medium tracking-wide">
                {currentQuestion.word.reading}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4 pt-4">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correctIndex;
          const showCorrect = showFeedback && isCorrect;
          const showWrong = showFeedback && isSelected && !isCorrect;

          return (
            <motion.div
              key={index}
              whileHover={!showFeedback ? { y: -4 } : {}}
              whileTap={!showFeedback ? { scale: 0.98 } : {}}
            >
              <button
                className={cn(
                  "w-full py-10 h-auto text-xl rounded-[2.2rem] border transition-all duration-300 font-medium relative overflow-hidden px-6 text-center leading-relaxed",
                  !showFeedback && "bg-white/80 border-slate-100 text-slate-700 hover:border-sakura/20 hover:bg-white hover:shadow-xl",
                  showCorrect && "bg-[#fdfcfd] border-emerald-200 text-emerald-700 shadow-md ring-1 ring-emerald-50 font-black",
                  showWrong && "bg-red-50/50 border-red-200 text-red-700 shadow-md ring-1 ring-red-50",
                  showFeedback && !showCorrect && !showWrong && "opacity-30 blur-[0.5px]"
                )}
                onClick={() => handleAnswer(index)}
                disabled={showFeedback}
              >
                {option}
              </button>
            </motion.div>
          );
        })}
      </div>
      
      <div className="flex justify-center pt-8">
        <Button 
          variant="ghost" 
          onClick={() => {
            if (window.confirm('Bạn có muốn thoát game không?')) onBack();
          }}
          className="text-slate-200 gap-2 hover:text-sakura transition-colors rounded-full font-bold px-8"
        >
          <ChevronLeft className="h-4 w-4" />
          Dừng trò chơi
        </Button>
      </div>
    </div>
  );
};
