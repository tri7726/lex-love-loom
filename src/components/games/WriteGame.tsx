import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, CheckCircle, XCircle, ArrowRight, HelpCircle, BookOpen, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface VocabularyItem {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  mastery_level: number | null;
}

interface WriteGameProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

type WriteMode = 'word-to-reading' | 'meaning-to-reading';

export const WriteGame: React.FC<WriteGameProps> = ({
  vocabulary,
  onComplete,
  onUpdateMastery,
}) => {
  const [writeMode, setWriteMode] = useState<WriteMode | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only use words that have reading (needed for answer checking)
  const validVocabulary = useMemo(() =>
    vocabulary.filter((w) => w.reading && w.reading.trim() !== ''),
    [vocabulary]
  );

  const questions = useMemo(() => {
    const shuffled = [...validVocabulary].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(10, shuffled.length));
  }, [validVocabulary]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    if (writeMode) inputRef.current?.focus();
  }, [currentIndex, writeMode]);

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
    return text.trim().toLowerCase().replace(/\s/g, '');
  };

  const checkAnswer = () => {
    const normalized = normalizeText(userInput);
    const correctReading = currentQuestion.reading ? normalizeText(currentQuestion.reading) : '';
    const correct = normalized === correctReading;

    setIsCorrect(correct);
    setShowResult(true);

    if (correct) setCorrectCount((prev) => prev + 1);
    onUpdateMastery(currentQuestion.id, correct);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResult && userInput.trim()) checkAnswer();
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setGameComplete(true);
      onComplete({ correct: correctCount + (isCorrect ? 0 : 0), total: questions.length });
    } else {
      setCurrentIndex((i) => i + 1);
      setUserInput('');
      setShowResult(false);
      setIsCorrect(false);
      setShowHint(false);
    }
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setUserInput('');
    setShowResult(false);
    setIsCorrect(false);
    setCorrectCount(0);
    setShowHint(false);
    setGameComplete(false);
  };

  const getHint = () => {
    const reading = currentQuestion.reading || '';
    return reading.slice(0, Math.ceil(reading.length / 2)) + '...';
  };

  // ─── Mode Selection ───
  if (!writeMode) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">✍️ Chế độ Viết</h2>
          <p className="text-muted-foreground">Chọn kiểu luyện tập</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
          {([
            {
              mode: 'word-to-reading' as WriteMode,
              icon: BookOpen,
              title: 'Kanji → Reading',
              desc: 'Nhìn Kanji, gõ cách đọc Hiragana',
              example: '学校 → がっこう',
              gradient: 'from-rose-50 to-pink-50',
              border: 'border-rose-200 hover:border-rose-400',
              iconColor: 'text-rose-500',
            },
            {
              mode: 'meaning-to-reading' as WriteMode,
              icon: Languages,
              title: 'Nghĩa → Reading',
              desc: 'Nhìn nghĩa tiếng Việt, gõ cách đọc',
              example: 'Trường học → がっこう',
              gradient: 'from-pink-50 to-rose-50',
              border: 'border-pink-200 hover:border-pink-400',
              iconColor: 'text-pink-500',
            },
          ]).map(({ mode, icon: Icon, title, desc, example, gradient, border, iconColor }) => (
            <motion.div key={mode} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Card
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-lg',
                  `bg-gradient-to-br ${gradient} ${border} border-2`
                )}
                onClick={() => setWriteMode(mode)}
              >
                <CardContent className="p-6 text-center space-y-3">
                  <div className={cn('w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center mx-auto shadow-sm', iconColor)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                  <div className="bg-white/60 rounded-lg px-3 py-2 text-sm font-jp">
                    {example}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {validVocabulary.length === 0 && (
          <p className="text-center text-sm text-red-400">Không có từ nào có reading để luyện tập!</p>
        )}
      </div>
    );
  }

  // ─── Game Complete ───
  if (gameComplete) {
    const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl">✍️ Kết quả</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-6xl font-bold text-primary">{percentage}%</div>
          <p className="text-lg">
            Bạn viết đúng <span className="font-bold text-green-600">{correctCount}</span> / {questions.length} từ
          </p>
          <div className="text-sm text-muted-foreground">
            Chế độ: {writeMode === 'word-to-reading' ? 'Kanji → Reading' : 'Nghĩa → Reading'}
          </div>
          <div className="flex gap-4 justify-center">
            {percentage >= 80 ? (
              <p className="text-green-600">🌟 Tuyệt vời!</p>
            ) : percentage >= 60 ? (
              <p className="text-yellow-600">👍 Khá tốt!</p>
            ) : (
              <p className="text-orange-600">💪 Cần luyện thêm!</p>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { restartGame(); setWriteMode(null); }}>
              Đổi chế độ
            </Button>
            <Button onClick={restartGame}>Chơi lại</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) return null;

  // ─── Question prompt based on mode ───
  const prompt = writeMode === 'word-to-reading' ? currentQuestion.word : currentQuestion.meaning;
  const promptLabel = writeMode === 'word-to-reading' ? 'Gõ cách đọc (Hiragana) cho:' : 'Gõ cách đọc (Hiragana) của từ nghĩa là:';
  const promptClass = writeMode === 'word-to-reading' ? 'text-3xl font-jp' : 'text-2xl';

  return (
    <div className="space-y-6">
      {/* Mode indicator + Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-xs font-medium">
              {writeMode === 'word-to-reading' ? 'Kanji → Reading' : 'Nghĩa → Reading'}
            </span>
            Câu {currentIndex + 1} / {questions.length}
          </span>
          <span className="text-green-600">✓ {correctCount}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="text-center">
        <CardContent className="py-8">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">{promptLabel}</p>
            <p className={cn('font-semibold', promptClass)}>{prompt}</p>

            {/* For meaning mode, also show the word as extra context */}
            {writeMode === 'meaning-to-reading' && (
              <p className="text-sm text-muted-foreground font-jp">({currentQuestion.word})</p>
            )}

            {showHint && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-lg text-muted-foreground font-jp"
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
            placeholder="Gõ cách đọc Hiragana..."
            className="text-xl font-jp py-6 text-center"
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
                  <p className="text-2xl font-jp">{currentQuestion.reading}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentQuestion.word} — {currentQuestion.meaning}
                  </p>
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
        Gõ bằng Hiragana
      </p>
    </div>
  );
};

// export default WriteGame;
