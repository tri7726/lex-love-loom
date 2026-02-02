import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, CheckCircle, XCircle, ArrowRight, RotateCcw } from 'lucide-react';
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

const ListeningGame: React.FC<ListeningGameProps> = ({
  vocabulary,
  onComplete,
  onUpdateMastery,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

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

  useEffect(() => {
    // Auto-play on new question
    if (currentQuestion && !hasPlayed) {
      setTimeout(() => speak(currentQuestion.word.word), 500);
      setHasPlayed(true);
    }
  }, [currentIndex]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.7;
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
    const finalScore = correctCount + (selectedAnswer === currentQuestion?.correctIndex ? 1 : 0);
    const percentage = Math.round((finalScore / questions.length) * 100);

    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl">🎧 Kết quả</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-6xl font-bold text-primary">
            {percentage}%
          </div>
          <p className="text-lg">
            Bạn nghe đúng <span className="font-bold text-green-600">{finalScore}</span> / {questions.length} từ
          </p>

          <div className="flex gap-4 justify-center">
            {percentage >= 80 ? (
              <p className="text-green-600">🌟 Tai rất nhạy!</p>
            ) : percentage >= 60 ? (
              <p className="text-yellow-600">👍 Nghe tốt!</p>
            ) : (
              <p className="text-orange-600">💪 Cần luyện thêm!</p>
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

      {/* Listen Button */}
      <Card className="text-center">
        <CardContent className="py-8">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">Nghe và chọn đáp án đúng</p>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => speak(currentQuestion.word.word)}
              className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto shadow-lg"
            >
              <Volume2 className="h-10 w-10" />
            </motion.button>

            <p className="text-sm text-muted-foreground">
              Nhấn để nghe lại
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
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
                <Card
                  className={`cursor-pointer min-h-[100px] flex items-center justify-center transition-all ${
                    showCorrect
                      ? 'bg-green-100 border-green-500 dark:bg-green-900/30'
                      : showWrong
                      ? 'bg-red-100 border-red-500 dark:bg-red-900/30'
                      : isSelected
                      ? 'border-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleAnswer(index)}
                >
                  <CardContent className="p-4 text-center">
                    <p className="font-jp text-xl mb-1">{option.word}</p>
                    <p className="text-sm text-muted-foreground">{option.meaning}</p>
                    {showResult && (
                      <div className="mt-2">
                        {showCorrect && <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />}
                        {showWrong && <XCircle className="h-5 w-5 text-red-600 mx-auto" />}
                      </div>
                    )}
                  </CardContent>
                </Card>
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

export default ListeningGame;
