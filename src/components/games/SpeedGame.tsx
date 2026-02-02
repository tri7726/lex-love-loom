import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Timer, Trophy, Flame, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface VocabularyItem {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  mastery_level: number | null;
}

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

const SpeedGame: React.FC<SpeedGameProps> = ({
  vocabulary,
  onComplete,
  onUpdateMastery,
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
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Timer
  useEffect(() => {
    if (gameComplete || showFeedback) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - wrong answer
          handleAnswer(-1);
          return QUESTION_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, showFeedback, gameComplete]);

  const handleAnswer = useCallback((index: number) => {
    if (showFeedback) return;

    setSelectedAnswer(index);
    setShowFeedback(true);

    const isCorrect = index === currentQuestion.correctIndex;
    
    if (isCorrect) {
      const timeBonus = Math.ceil(timeLeft / 2);
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

    onUpdateMastery(currentQuestion.word.id, isCorrect);

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
  }, [currentIndex, currentQuestion, combo, timeLeft, showFeedback, questions.length]);

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
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            Kết quả Speed Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-6xl font-bold text-primary">
            {score}
          </div>
          <p className="text-lg text-muted-foreground">điểm</p>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Trophy className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
              <p className="text-xl font-bold">{percentage}%</p>
              <p className="text-xs text-muted-foreground">Chính xác</p>
            </div>
            <div className="text-center">
              <Flame className="h-6 w-6 mx-auto text-orange-500 mb-1" />
              <p className="text-xl font-bold">{maxCombo}</p>
              <p className="text-xs text-muted-foreground">Max Combo</p>
            </div>
            <div className="text-center">
              <Zap className="h-6 w-6 mx-auto text-blue-500 mb-1" />
              <p className="text-xl font-bold">{correctCount}/{questions.length}</p>
              <p className="text-xs text-muted-foreground">Đúng</p>
            </div>
          </div>

          <Button onClick={restartGame} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Chơi lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) return null;

  const timePercent = (timeLeft / QUESTION_TIME) * 100;
  const isLowTime = timeLeft <= 2;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="font-bold">{score}</span>
          </div>
          {combo > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 text-orange-500"
            >
              <Flame className="h-4 w-4" />
              <span className="font-bold">{combo}x</span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Timer className={`h-4 w-4 ${isLowTime ? 'text-red-500' : ''}`} />
          <span className={`font-mono font-bold ${isLowTime ? 'text-red-500 animate-pulse' : ''}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Timer Bar */}
      <Progress 
        value={timePercent} 
        className={`h-2 transition-all ${isLowTime ? '[&>div]:bg-red-500' : ''}`} 
      />

      {/* Question */}
      <Card className="text-center">
        <CardContent className="py-6">
          <p className="text-3xl font-jp">{currentQuestion.word.word}</p>
          {currentQuestion.word.reading && (
            <p className="text-lg text-muted-foreground font-jp mt-1">
              {currentQuestion.word.reading}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correctIndex;
          const showCorrect = showFeedback && isCorrect;
          const showWrong = showFeedback && isSelected && !isCorrect;

          return (
            <motion.div
              key={index}
              whileHover={!showFeedback ? { scale: 1.02 } : {}}
              whileTap={!showFeedback ? { scale: 0.98 } : {}}
            >
              <Button
                variant="outline"
                className={`w-full py-4 h-auto text-sm ${
                  showCorrect
                    ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30'
                    : showWrong
                    ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30'
                    : ''
                }`}
                onClick={() => handleAnswer(index)}
                disabled={showFeedback}
              >
                {option}
              </Button>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Câu {currentIndex + 1} / {questions.length}
      </p>
    </div>
  );
};

export default SpeedGame;
