import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, CheckCircle2, XCircle, ArrowRight, HelpCircle, BookOpen, Languages, ChevronLeft, Sparkles, Trophy, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { VocabularyItem } from '@/types/vocabulary';

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
  onBack,
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
    const correctReading = currentQuestion?.reading ? normalizeText(currentQuestion.reading) : '';
    const correct = normalized === correctReading;

    setIsCorrect(correct);
    setShowResult(true);

    if (correct) setCorrectCount((prev) => prev + 1);
    if (currentQuestion) {
      onUpdateMastery(currentQuestion.id, correct);
    }
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
    const reading = currentQuestion?.reading || '';
    return reading.slice(0, Math.ceil(reading.length / 2)) + '...';
  };

  // ─── Mode Selection ───
  if (!writeMode) {
    return (
      <div className="space-y-10 py-6 max-w-3xl mx-auto">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 bg-rose-50 rounded-[2rem] border border-rose-100 shadow-sm relative">
            <Languages className="h-10 w-10 text-rose-500" />
            <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-300 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-bold text-rose-900 tracking-tight">Chế độ Viết</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">Nâng tầm kỹ năng viết Hiragana và ghi nhớ mặt chữ Kanji</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {( [
            {
              mode: 'word-to-reading' as WriteMode,
              icon: BookOpen,
              title: 'Kanji → Reading',
              desc: 'Nhìn Kanji, gõ cách đọc Hiragana tương ứng',
              example: '学校 → がっこう',
              gradient: 'from-rose-50 via-pink-50 to-white',
              border: 'border-rose-100 hover:border-rose-300',
              iconColor: 'bg-rose-100 text-rose-600',
            },
            {
              mode: 'meaning-to-reading' as WriteMode,
              icon: Languages,
              title: 'Nghĩa → Reading',
              desc: 'Gõ cách đọc từ dựa trên ý nghĩa tiếng Việt',
              example: 'Trường học → がっこう',
              gradient: 'from-amber-50 via-pink-50 to-white',
              border: 'border-amber-100 hover:border-amber-300',
              iconColor: 'bg-amber-100 text-amber-600',
            },
          ]).map(({ mode, icon: Icon, title, desc, example, gradient, border, iconColor }) => (
            <motion.div key={mode} whileHover={{ scale: 1.03, y: -4 }} whileTap={{ scale: 0.98 }}>
              <Card
                className={cn(
                  'cursor-pointer transition-all duration-300 shadow-card hover:shadow-elevated rounded-[2.5rem] h-full overflow-hidden border-2',
                  `bg-gradient-to-br ${gradient} ${border}`
                )}
                onClick={() => setWriteMode(mode)}
              >
                <CardContent className="p-8 text-center space-y-4">
                  <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-sm', iconColor)}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl text-slate-800">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 text-sm font-jp border border-white shadow-soft inline-block mx-auto text-rose-600 font-medium italic">
                    {example}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {validVocabulary.length === 0 && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-center text-sm font-medium border border-red-100 max-w-md mx-auto">
            Không có từ nào có cách đọc để luyện tập!
          </div>
        )}
        
        <div className="text-center pt-4">
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground gap-2">
            <ChevronLeft className="h-4 w-4" /> Quay lại
          </Button>
        </div>
      </div>
    );
  }

  // ─── Game Complete ───
  if (gameComplete) {
    const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-0 shadow-2xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-50 via-white to-rose-50">
          <div className="h-2 bg-gradient-to-r from-rose-400 via-pink-400 to-indigo-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-display font-bold text-center text-slate-800 flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-amber-500" />
              Hoàn thành!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <div className="text-center relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-7xl font-display font-black bg-gradient-to-br from-rose-600 to-indigo-500 bg-clip-text text-transparent inline-block"
              >
                {percentage}%
              </motion.div>
              <p className="text-slate-400 font-medium tracking-widest uppercase text-sm mt-2">Độ chính xác</p>
              <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-amber-300 animate-pulse" />
            </div>

            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-rose-100 text-center">
              <p className="text-lg text-slate-800 leading-relaxed">
                Bạn viết đúng <span className="font-bold text-rose-600">{correctCount}</span> / {questions.length} từ
              </p>
              <div className="mt-3">
                <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100">
                  Chế độ: {writeMode === 'word-to-reading' ? 'Kanji → Reading' : 'Nghĩa → Reading'}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={restartGame} 
                className="w-full gap-2 bg-gradient-to-r from-rose-500 to-indigo-500 hover:from-rose-600 hover:to-indigo-600 text-white rounded-[1.5rem] py-6 text-lg font-bold shadow-lg shadow-rose-200 transition-all active:scale-95"
              >
                <RotateCcw className="h-5 w-5 inline-block mr-2" />
                Luyện tập tiếp
              </button>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => { setWriteMode(null); restartGame(); }}
                  className="flex-1 text-slate-500 hover:bg-slate-50 rounded-2xl py-6"
                >
                  Đổi chế độ
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={onBack}
                  className="flex-1 text-slate-500 hover:bg-slate-50 rounded-2xl py-6"
                >
                  Thoát
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!currentQuestion) return null;

  // ─── Question prompt based on mode ───
  const prompt = writeMode === 'word-to-reading' ? currentQuestion.word : currentQuestion.meaning;
  const promptLabel = writeMode === 'word-to-reading' ? 'Dịch âm tiết Kanji sang Hiragana:' : 'Từ vựng có ý nghĩa này là:';
  const promptClass = writeMode === 'word-to-reading' ? 'text-5xl font-jp font-bold text-slate-900' : 'text-3xl font-bold text-slate-800 leading-tight';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="space-y-2 px-2">
        <div className="flex justify-between items-end mb-1">
          <div className="flex gap-2 items-center">
            <Badge className="bg-rose-50 text-rose-600 border-rose-100 px-3 py-1 rounded-full text-xs font-bold hover:bg-rose-100 transition-colors">
              {writeMode === 'word-to-reading' ? 'Kanji → Reading' : 'Nghĩa → Reading'}
            </Badge>
            <span className="text-sm font-medium text-slate-400">Câu {currentIndex + 1} / {questions.length}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100 shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-sm font-bold text-green-600">{correctCount}</span>
          </div>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-rose-400 to-indigo-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Task Card */}
      <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100">
        <CardContent className="py-20 text-center space-y-6">
          <div className="space-y-4">
            <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">{promptLabel}</p>
            <p className={cn(promptClass)}>{prompt}</p>

            {/* Extra Context */}
            {writeMode === 'meaning-to-reading' && (
              <div className="bg-slate-50 px-6 py-2 rounded-2xl inline-block border border-slate-100">
                <p className="text-lg text-slate-500 font-jp font-medium">{currentQuestion.word}</p>
              </div>
            )}

            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-amber-50 rounded-2xl p-4 border border-amber-100 inline-block mt-4 flex items-center gap-3 mx-auto"
                >
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <p className="text-xl text-amber-700 font-jp font-bold tracking-widest">
                    {getHint()}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Input Form */}
      <form onSubmit={handleSubmit} className="space-y-6 px-4">
        <div className="relative group">
          <Input
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Gõ Hiragana tại đây..."
            className={cn(
              "text-3xl font-jp py-12 text-center rounded-[2rem] border-2 transition-all shadow-lg",
              !showResult ? "border-slate-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-50 bg-white" : (isCorrect ? "bg-green-50 border-green-500 text-green-800" : "bg-red-50 border-red-500 text-red-800")
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
                  <p className="text-4xl font-jp font-black text-rose-300 tracking-wider transition-all">{currentQuestion.reading}</p>
                  <div className="pt-2 flex items-center justify-center gap-2 text-sm text-slate-300 italic">
                    <BookOpen className="h-4 w-4" />
                    {currentQuestion.word} — {currentQuestion.meaning}
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
                Nghe lại
              </Button>
              <button 
                onClick={handleNext} 
                className="flex-1 max-w-[280px] bg-gradient-to-r from-rose-500 to-indigo-500 text-white rounded-[1.5rem] py-5 font-bold shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </form>
      
      <div className="flex justify-center pt-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-rose-500 transition-colors">
          Dừng luyện tập
        </Button>
      </div>
    </div>
  );
};
