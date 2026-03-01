import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Timer, Trophy, Flame, RotateCcw, ChevronLeft, Sparkles, Star } from 'lucide-react';
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
  }, [currentIndex, showFeedback, gameComplete]);

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
    }

    if (currentQuestion) {
      onUpdateMastery(currentQuestion.word.id, isCorrect);
    }

    // Move to next question after brief delay
    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        setGameComplete(true);
        onComplete({
          correct: correctCount + (isCorrect ? 1 : 0),
          total: questions.length,
        });
      } else {
        setCurrentIndex((prev) => prev + 1);
        setTimeLeft(QUESTION_TIME);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }
    }, 600);
  }, [currentIndex, currentQuestion, combo, timeLeft, showFeedback, questions.length, correctCount, onComplete, onUpdateMastery]);

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
  };

  if (gameComplete) {
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-0 shadow-2xl overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 via-white to-pink-50">
          <div className="h-2 bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500" />
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
                className="text-7xl font-display font-black bg-gradient-to-br from-rose-600 to-pink-500 bg-clip-text text-transparent inline-block"
              >
                {score}
              </motion.div>
              <p className="text-rose-400 font-medium tracking-widest uppercase text-sm mt-2">Tổng điểm</p>
              <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-amber-300 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-rose-100 text-center">
                <Star className="h-5 w-5 mx-auto text-amber-400 mb-1" />
                <p className="text-2xl font-bold text-rose-700">{percentage}%</p>
                <p className="text-[10px] text-rose-400 uppercase font-bold">Chính xác</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-rose-100 text-center">
                <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                <p className="text-2xl font-bold text-rose-700">{maxCombo}</p>
                <p className="text-[10px] text-rose-400 uppercase font-bold">Max Combo</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={restartGame} 
                className="w-full gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-2xl py-6 text-lg font-bold shadow-lg shadow-rose-200 transition-all active:scale-95"
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

  const timePercent = (timeLeft / QUESTION_TIME) * 100;
  const isLowTime = timeLeft <= 1.5;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Stats */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-xl shadow-sm border border-amber-100">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-xl font-bold text-rose-800">{score}</span>
          </div>
          <AnimatePresence>
            {combo > 1 && (
              <motion.div
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 shadow-sm"
              >
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-bold text-orange-600">{combo}x Combo</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all shadow-sm",
            isLowTime ? "bg-red-50 border-red-200 text-red-500" : "bg-rose-50 border-rose-100 text-rose-600"
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
        <div className="h-3 w-full bg-rose-50 rounded-full overflow-hidden border border-rose-100 p-0.5 shadow-inner">
          <motion.div 
            className={cn(
              "h-full rounded-full transition-colors",
              isLowTime ? "bg-gradient-to-r from-red-400 to-rose-500" : "bg-gradient-to-r from-rose-400 to-pink-500"
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
        <Card className="border-0 shadow-xl rounded-[2.5rem] bg-gradient-to-br from-rose-50 to-white overflow-hidden border border-rose-100/50">
          <div className="absolute top-0 right-0 p-4">
            <Badge variant="outline" className="text-rose-400 border-rose-200 bg-white/50 backdrop-blur-sm">
              Câu {currentIndex + 1} / {questions.length}
            </Badge>
          </div>
          <CardContent className="py-16 text-center space-y-4">
            <p className="text-6xl font-jp font-bold text-rose-900 mb-2">{currentQuestion.word.word}</p>
            {currentQuestion.word.reading && (
              <p className="text-2xl text-rose-400 font-jp font-medium tracking-wide">
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
              whileHover={!showFeedback ? { scale: 1.02, y: -2 } : {}}
              whileTap={!showFeedback ? { scale: 0.98 } : {}}
            >
              <button
                className={cn(
                  "w-full py-8 h-auto text-lg rounded-2xl border-2 transition-all duration-200 font-medium",
                  !showFeedback && "bg-white border-rose-100 text-rose-900 hover:border-rose-400 hover:bg-rose-50/50 hover:shadow-lg shadow-sm backdrop-blur-sm",
                  showCorrect && "bg-[#ebf8f1] border-[#22c55e] text-[#166534] shadow-lg shadow-green-100",
                  showWrong && "bg-red-50 border-red-500 text-red-700 shadow-lg shadow-red-100",
                  showFeedback && !showCorrect && !showWrong && "opacity-50 grayscale-[0.2]"
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
          className="text-muted-foreground gap-2 hover:text-rose-500 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Dừng trò chơi
        </Button>
      </div>
    </div>
  );
};
