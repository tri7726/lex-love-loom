import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, CheckCircle2, XCircle, ArrowRight, RotateCcw, ChevronLeft, Sparkles, Star, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { VocabularyItem } from '@/types/vocabulary';

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

  // Generate questions
  const questions = useMemo(() => {
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    const gameWords = shuffled.slice(0, Math.min(10, vocabulary.length));

    return gameWords.map((word): Question => {
      // Get 3 random wrong answers
      const wrongAnswers = vocabulary
        .filter((v) => v.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((v) => v.meaning);

      // Create options array and shuffle
      const options = [...wrongAnswers, word.meaning].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(word.meaning);

      return { word, options, correctIndex };
    });
  }, [vocabulary]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

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
    }
    if (currentQuestion) {
      onUpdateMastery(currentQuestion.word.id, isCorrect);
    }
  };

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
    }
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setCorrectCount(0);
    setGameComplete(false);
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2 px-2">
        <div className="flex justify-between items-end mb-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-100 px-3 py-1 rounded-full text-xs font-bold">
              Câu {currentIndex + 1} / {questions.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-sm font-bold text-green-600">{correctCount} đúng</span>
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
            <div className="space-y-4">
              <p className="text-5xl font-jp font-bold text-sky-900">{currentQuestion.word.word}</p>
              {currentQuestion.word.reading && (
                <p className="text-xl text-sky-400 font-jp font-medium">
                  {currentQuestion.word.reading}
                </p>
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
    </div>
  );
};
