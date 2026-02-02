import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
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

const MultipleChoiceGame: React.FC<MultipleChoiceGameProps> = ({
  vocabulary,
  onComplete,
  onUpdateMastery,
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

    const isCorrect = index === currentQuestion.correctIndex;
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }
    onUpdateMastery(currentQuestion.word.id, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setGameComplete(true);
      onComplete({
        correct: correctCount + (selectedAnswer === currentQuestion.correctIndex ? 1 : 0),
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
    const finalScore = correctCount + (selectedAnswer === currentQuestion?.correctIndex ? 1 : 0);
    const percentage = Math.round((finalScore / questions.length) * 100);

    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl">🎉 Kết quả</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-6xl font-bold text-primary">
            {percentage}%
          </div>
          <p className="text-lg">
            Bạn trả lời đúng <span className="font-bold text-green-600">{finalScore}</span> / {questions.length} câu
          </p>

          <div className="flex gap-4 justify-center">
            {percentage >= 80 ? (
              <p className="text-green-600">🌟 Xuất sắc!</p>
            ) : percentage >= 60 ? (
              <p className="text-yellow-600">👍 Tốt lắm!</p>
            ) : (
              <p className="text-orange-600">💪 Cố gắng thêm nhé!</p>
            )}
          </div>

          <Button onClick={restartGame}>Chơi lại</Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Câu {currentIndex + 1} / {questions.length}</span>
          <span className="text-green-600">✓ {correctCount}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="text-center">
        <CardContent className="py-8">
          <div className="space-y-4">
            <p className="text-4xl font-jp">{currentQuestion.word.word}</p>
            {currentQuestion.word.reading && (
              <p className="text-lg text-muted-foreground font-jp">
                {currentQuestion.word.reading}
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => speak(currentQuestion.word.word)}
              className="gap-2"
            >
              <Volume2 className="h-4 w-4" />
              Nghe
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="grid gap-3">
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
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant="outline"
                  className={`w-full py-6 text-left justify-start text-base ${
                    showCorrect
                      ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30'
                      : showWrong
                      ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30'
                      : isSelected
                      ? 'border-primary'
                      : ''
                  }`}
                  onClick={() => handleAnswer(index)}
                  disabled={showResult}
                >
                  <span className="mr-3 text-muted-foreground">{String.fromCharCode(65 + index)}.</span>
                  {option}
                  {showCorrect && <CheckCircle className="ml-auto h-5 w-5 text-green-600" />}
                  {showWrong && <XCircle className="ml-auto h-5 w-5 text-red-600" />}
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Next Button */}
      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <Button onClick={handleNext} className="gap-2">
            {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Tiếp theo'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default MultipleChoiceGame;
