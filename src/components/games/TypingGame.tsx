import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, CheckCircle, XCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface VocabularyItem {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  mastery_level: number | null;
}

interface TypingGameProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

const TypingGame: React.FC<TypingGameProps> = ({
  vocabulary,
  onComplete,
  onUpdateMastery,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate questions
  const questions = useMemo(() => {
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(10, vocabulary.length));
  }, [vocabulary]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const normalizeText = (text: string): string => {
    // Normalize for comparison: remove spaces, convert to lowercase
    return text.trim().toLowerCase().replace(/\s/g, '');
  };

  const checkAnswer = () => {
    const normalized = normalizeText(userInput);
    const correctWord = normalizeText(currentQuestion.word);
    const correctReading = currentQuestion.reading ? normalizeText(currentQuestion.reading) : '';

    // Accept either the word or reading as correct
    const correct = normalized === correctWord || normalized === correctReading;

    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
    }
    onUpdateMastery(currentQuestion.id, correct);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResult && userInput.trim()) {
      checkAnswer();
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setGameComplete(true);
      onComplete({
        correct: correctCount,
        total: questions.length,
      });
    } else {
      setCurrentIndex((prev) => prev + 1);
      setUserInput('');
      setShowResult(false);
      setShowHint(false);
    }
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setUserInput('');
    setShowResult(false);
    setShowHint(false);
    setCorrectCount(0);
    setGameComplete(false);
  };

  const getHint = () => {
    const word = currentQuestion.reading || currentQuestion.word;
    // Show first character
    return word.charAt(0) + '...';
  };

  if (gameComplete) {
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl">⌨️ Kết quả Gõ Từ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-6xl font-bold text-primary">
            {percentage}%
          </div>
          <p className="text-lg">
            Bạn gõ đúng <span className="font-bold text-green-600">{correctCount}</span> / {questions.length} từ
          </p>

          <div className="flex gap-4 justify-center">
            {percentage >= 80 ? (
              <p className="text-green-600">🌟 Tuyệt vời!</p>
            ) : percentage >= 60 ? (
              <p className="text-yellow-600">👍 Khá tốt!</p>
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

      {/* Question Card */}
      <Card className="text-center">
        <CardContent className="py-8">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">Gõ từ tiếng Nhật cho:</p>
            <p className="text-3xl font-semibold mb-2">{currentQuestion.meaning}</p>
            
            {showHint && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl text-muted-foreground font-jp"
              >
                Gợi ý: {getHint()}
              </motion.p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Input
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Gõ câu trả lời bằng Hiragana hoặc Kanji..."
            className="text-2xl font-jp py-6 text-center"
            disabled={showResult}
            autoComplete="off"
          />
          {showResult && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isCorrect ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
          )}
        </div>

        {!showResult ? (
          <div className="flex gap-3 justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowHint(true)}
              disabled={showHint}
              className="gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              Gợi ý
            </Button>
            <Button type="submit" disabled={!userInput.trim()}>
              Kiểm tra
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Show correct answer if wrong */}
            {!isCorrect && (
              <Card className="bg-muted/50">
                <CardContent className="py-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Đáp án đúng:</p>
                  <p className="text-3xl font-jp mb-2">{currentQuestion.word}</p>
                  {currentQuestion.reading && (
                    <p className="text-xl text-muted-foreground font-jp">
                      ({currentQuestion.reading})
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => speak(currentQuestion.word)}
                className="gap-2"
              >
                <Volume2 className="h-4 w-4" />
                Nghe
              </Button>
              <Button onClick={handleNext} className="gap-2">
                {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Tiếp theo'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        💡 Tip: Gõ bằng Hiragana hoặc Kanji đều được chấp nhận
      </p>
    </div>
  );
};

export default TypingGame;
