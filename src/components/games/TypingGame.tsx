import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, CheckCircle2, XCircle, ArrowRight, HelpCircle, Keyboard, ChevronLeft, Sparkles, Trophy, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VocabularyItem } from '@/types/vocabulary';

interface TypingGameProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

export const TypingGame: React.FC<TypingGameProps> = ({
  vocabulary,
  onComplete,
  onUpdateMastery,
  onBack,
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
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

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
    return text.trim().toLowerCase().replace(/\s/g, '');
  };

  const checkAnswer = () => {
    const normalized = normalizeText(userInput);
    const correctWord = normalizeText(currentQuestion.word);
    const correctReading = currentQuestion.reading ? normalizeText(currentQuestion.reading) : '';

    // Accept either the word or reading as correct
    const correct = normalized === correctWord || (correctReading !== '' && normalized === correctReading);

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
      onComplete({
        correct: correctCount + (isCorrect ? 0 : 0),
        total: questions.length,
      });
    } else {
      setCurrentIndex((prev) => prev + 1);
      setUserInput('');
      setShowResult(false);
      setShowHint(false);
      setIsCorrect(false);
    }
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setUserInput('');
    setShowResult(false);
    setShowHint(false);
    setCorrectCount(0);
    setGameComplete(false);
    setIsCorrect(false);
  };

  const getHint = () => {
    const word = currentQuestion.reading || currentQuestion.word;
    return word.charAt(0) + '...';
  };

  if (gameComplete) {
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-0 shadow-2xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-50 via-white to-sky-50">
          <div className="h-2 bg-gradient-to-r from-indigo-400 via-sky-400 to-blue-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-display font-bold text-center text-indigo-900 flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-amber-500" />
              Hoàn thành!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <div className="text-center relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-7xl font-display font-black bg-gradient-to-br from-indigo-600 to-sky-500 bg-clip-text text-transparent inline-block"
              >
                {percentage}%
              </motion.div>
              <p className="text-slate-400 font-medium tracking-widest uppercase text-sm mt-2">Độ chính xác</p>
              <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-amber-300 animate-pulse" />
            </div>

            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-indigo-100 text-center">
              <p className="text-lg text-slate-800 leading-relaxed">
                Bạn gõ đúng <span className="font-bold text-indigo-600">{correctCount}</span> / {questions.length} từ
              </p>
              <div className="mt-3">
                {percentage >= 80 ? (
                  <p className="text-green-600 font-bold">🌟 Đỉnh cao gõ phím!</p>
                ) : percentage >= 60 ? (
                  <p className="text-indigo-600 font-bold">👍 Rất tốt!</p>
                ) : (
                  <p className="text-orange-600 font-bold">💪 Tiếp tục luyện tập nhé!</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={restartGame} 
                className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white rounded-[1.5rem] py-6 text-lg font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                <RotateCcw className="h-5 w-5 inline-block mr-2" />
                Chơi lại
              </button>
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="w-full text-indigo-500 hover:bg-indigo-50 rounded-2xl py-6"
              >
                Trở về Hub
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Progress */}
      <div className="space-y-2 px-2">
        <div className="flex justify-between items-end mb-1">
          <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 px-3 py-1 rounded-full text-xs font-bold">
            Câu {currentIndex + 1} / {questions.length}
          </Badge>
          <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-bold text-green-600">{correctCount}</span>
          </div>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-indigo-400 to-sky-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Task Card */}
      <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100">
        <CardContent className="py-16 text-center space-y-4">
          <div className="space-y-2">
            <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">Gõ từ tiếng Nhật cho:</p>
            <p className="text-4xl font-bold text-slate-900 leading-tight">{currentQuestion.meaning}</p>
          </div>
          
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50 rounded-2xl p-4 border border-amber-100 inline-block mt-4 flex items-center gap-3 mx-auto"
              >
                <HelpCircle className="h-5 w-5 text-amber-500" />
                <p className="text-xl text-amber-700 font-jp font-bold tracking-widest">
                  {getHint()}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Input Section */}
      <form onSubmit={handleSubmit} className="space-y-6 px-4">
        <div className="relative group">
          <Input
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Gõ Hiragana hoặc Kanji..."
            className={cn(
              "text-3xl font-jp py-12 text-center rounded-[2rem] border-2 transition-all shadow-lg",
              !showResult ? "border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 bg-white shadow-soft" : (isCorrect ? "bg-green-50 border-green-500 text-green-800" : "bg-red-50 border-red-500 text-red-800 shadow-none")
            )}
            disabled={showResult}
            autoComplete="off"
          />
          <AnimatePresence>
            {showResult && (
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md"
              >
                {isCorrect ? (
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-500" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!showResult ? (
          <div className="flex gap-4 justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowHint(true)}
              disabled={showHint}
              className="px-8 py-7 rounded-2xl border-amber-200 text-amber-600 hover:bg-amber-50 gap-3 font-bold transition-all"
            >
              <HelpCircle className="h-5 w-5" />
              Gợi ý
            </Button>
            <button 
              type="submit" 
              disabled={!userInput.trim()}
              className="flex-1 max-w-[200px] bg-slate-900 text-white rounded-2xl py-5 font-bold shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
            >
              Kiểm tra
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Context feedback when wrong */}
            {!isCorrect && (
              <Card className="bg-slate-900 text-white border-0 shadow-xl rounded-[2.5rem]">
                <CardContent className="py-8 text-center space-y-3">
                  <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">Đáp án chính xác</p>
                  <div className="space-y-2">
                    <p className="text-4xl font-jp font-black text-indigo-300 tracking-wider transition-all">{currentQuestion.word}</p>
                    {currentQuestion.reading && (
                      <p className="text-xl text-slate-300 font-jp">({currentQuestion.reading})</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => speak(currentQuestion.word)}
                className="py-7 px-8 rounded-2xl border-slate-200 hover:bg-slate-50 gap-3 text-slate-600 shadow-sm"
              >
                <Volume2 className="h-5 w-5" />
                Nghe
              </Button>
              <button 
                onClick={handleNext} 
                className="flex-1 max-w-[280px] bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-[1.5rem] py-5 font-bold shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Từ tiếp theo'}
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </form>
      
      <p className="text-center text-xs text-slate-400 font-medium tracking-tight">
        Tip: Gõ bằng Hiragana hoặc Kanji đều được chấp nhận
      </p>

      <div className="flex justify-center pt-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-indigo-600 transition-colors">
          Thoát trò chơi
        </Button>
      </div>
    </div>
  );
};
