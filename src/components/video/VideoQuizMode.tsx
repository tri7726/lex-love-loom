import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, 
  Shuffle, 
  ChevronRight,
  CheckCircle,
  XCircle,
  Keyboard,
  SkipForward,
  RotateCcw,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTTS } from '@/hooks/useTTS';

interface VocabularyItem {
  word: string;
  reading: string;
  meaning: string;
}

const renderTextWithFurigana = (text: string, vocabulary: VocabularyItem[] | unknown[], show: boolean) => {
  if (!show || !vocabulary || vocabulary.length === 0) return text;
  
  const vocab = [...(vocabulary as VocabularyItem[])].sort((a, b) => (b.word?.length || 0) - (a.word?.length || 0));
  let parts: Array<{ text: string, furigana?: string }> = [{ text }];
  
  vocab.forEach(v => {
    const newParts: typeof parts = [];
    parts.forEach(part => {
      if (part.furigana) {
        newParts.push(part);
        return;
      }
      const subParts = part.text.split(v.word);
      subParts.forEach((subPart, i) => {
        if (subPart) newParts.push({ text: subPart });
        if (i < subParts.length - 1) {
          newParts.push({ text: v.word, furigana: v.reading });
        }
      });
    });
    parts = newParts;
  });

  return parts.map((part, i) => (
    <span key={i} className="inline-block">
      {(part.furigana) ? (
        <ruby>
          {part.text}
          <rt className="text-[10px] opacity-70">{part.furigana}</rt>
        </ruby>
      ) : part.text}
    </span>
  ));
};

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  question_type?: string;
  difficulty?: string;
}

interface VideoQuizModeProps {
  questions: Question[];
  onComplete: (score: number, total: number) => void;
  onGenerateQuiz?: () => void;
  showFurigana?: boolean;
  showTranslation?: boolean;
  allVocabulary?: Array<{ word: string; reading: string; meaning: string }>;
}

export const VideoQuizMode: React.FC<VideoQuizModeProps> = ({
  questions,
  onComplete,
  onGenerateQuiz,
  showFurigana = false,
  showTranslation = true,
  allVocabulary = [],
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const { speak, isSupported } = useTTS({ lang: 'ja-JP' });

  // Timer
  useEffect(() => {
    if (isComplete || shuffledQuestions.length === 0) return;
    const timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isComplete, shuffledQuestions.length]);

  // Shuffle questions on mount
  useEffect(() => {
    const sorted = [...questions].sort((a, b) => {
      const typeOrder: Record<string, number> = { 'vocabulary': 1, 'grammar': 2, 'comprehension': 3 };
      const orderA = typeOrder[a.question_type || 'comprehension'] || 4;
      const orderB = typeOrder[b.question_type || 'comprehension'] || 4;
      
      if (orderA !== orderB) return orderA - orderB;
      return Math.random() - 0.5;
    });
    setShuffledQuestions(sorted);
  }, [questions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (!hasAnswered) {
        if (e.key >= '1' && e.key <= '4') {
          const idx = parseInt(e.key) - 1;
          if (idx < (currentQuestion?.options?.length || 0)) {
            handleAnswer(idx);
          }
        }
      } else {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hasAnswered, currentIndex, shuffledQuestions]);

  const currentQuestion = shuffledQuestions[currentIndex];
  const progress = shuffledQuestions.length > 0 ? ((currentIndex + 1) / shuffledQuestions.length) * 100 : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (index: number) => {
    if (hasAnswered) return;
    
    setSelectedAnswer(index);
    setHasAnswered(true);
    
    if (index === currentQuestion.correct_answer) {
      setCorrectCount(prev => prev + 1);
      setStreak(prev => {
        const newStreak = prev + 1;
        setBestStreak(best => Math.max(best, newStreak));
        return newStreak;
      });
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < shuffledQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
    } else {
      setIsComplete(true);
      onComplete(correctCount + (selectedAnswer === currentQuestion.correct_answer ? 1 : 0), shuffledQuestions.length);
    }
  };

  const handleReshuffle = () => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setCorrectCount(0);
    setIsComplete(false);
    setElapsedTime(0);
    setStreak(0);
    setBestStreak(0);
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">
          Chưa có câu hỏi nào cho video này.
        </p>
        {onGenerateQuiz && (
          <Button onClick={onGenerateQuiz} className="gap-2">
            <Shuffle className="h-4 w-4" />
            Tạo bài tập với AI
          </Button>
        )}
      </div>
    );
  }

  if (isComplete) {
    const finalScore = correctCount + (selectedAnswer === currentQuestion?.correct_answer ? 1 : 0);
    const percentage = Math.round((finalScore / shuffledQuestions.length) * 100);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 space-y-6"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-matcha to-matcha/60">
          <CheckCircle className="h-12 w-12 text-white" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-2">Hoàn thành!</h2>
          <p className="text-muted-foreground">
            Bạn đã trả lời đúng {finalScore}/{shuffledQuestions.length} câu
          </p>
        </div>
        
        <div className="text-5xl font-bold text-matcha">
          {percentage}%
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Timer className="h-4 w-4" />
            {formatTime(elapsedTime)}
          </div>
          <div>
            🔥 Streak tốt nhất: {bestStreak}
          </div>
        </div>
        
        <Button onClick={handleReshuffle} className="gap-2">
          <Shuffle className="h-4 w-4" />
          Làm lại
        </Button>
      </motion.div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-bold">Trắc nghiệm</h2>
          <span className="text-sm text-muted-foreground">
            (Câu {currentIndex + 1}/{shuffledQuestions.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <Badge className="bg-gold/15 text-gold border-none text-xs animate-pulse">
              🔥 {streak}
            </Badge>
          )}
          {currentQuestion.question_type && (
            <Badge className="bg-primary/10 text-primary border-none text-[10px] px-2 h-5">
              {currentQuestion.question_type.toUpperCase()}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] gap-1">
            <Timer className="h-3 w-3" />
            {formatTime(elapsedTime)}
          </Badge>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
          <span>Tiến độ</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5 bg-muted rounded-full" />
      </div>

      {/* Question */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {isSupported && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 flex-shrink-0 mt-1"
              onClick={() => speak(currentQuestion.question_text)}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          )}
          <div className="font-jp text-lg leading-relaxed flex flex-wrap gap-1">
            {renderTextWithFurigana(currentQuestion.question_text, allVocabulary, showFurigana)}
          </div>
        </div>

        {/* Options */}
        <div className="grid gap-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correct_answer;
            const showResult = hasAnswered;
            
            return (
              <motion.button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={hasAnswered}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 group",
                  showResult && isCorrect
                    ? "border-matcha bg-matcha/5"
                    : showResult && isSelected && !isCorrect
                      ? "border-destructive/50 bg-destructive/5"
                      : isSelected
                        ? "border-matcha bg-matcha/5"
                        : "border-muted-foreground/10 bg-muted/20 hover:border-matcha/30 hover:bg-muted/40"
                )}
                whileHover={!hasAnswered ? { x: 4 } : {}}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                  showResult && isCorrect
                    ? "bg-matcha text-white"
                    : showResult && isSelected && !isCorrect
                      ? "bg-destructive text-white"
                      : isSelected
                        ? "bg-matcha text-white"
                        : "bg-background text-muted-foreground group-hover:text-matcha group-hover:bg-matcha/10"
                )}>
                  {showResult && isCorrect ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : showResult && isSelected && !isCorrect ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>
                <div className="font-jp text-base flex-1">
                  {renderTextWithFurigana(option, allVocabulary, showFurigana)}
                </div>
                {!hasAnswered && (
                  <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    {index + 1}
                  </kbd>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {hasAnswered && currentQuestion.explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-muted rounded-lg"
            >
              <p className="text-sm text-muted-foreground">
                {showTranslation ? `💡 ${currentQuestion.explanation}` : '💡 (Giải thích đã bị ẩn)'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Keyboard className="h-4 w-4" />
          <span className="text-xs">1-4: chọn đáp án • Space: tiếp</span>
        </div>
        
        <Button
          size="lg"
          onClick={handleNext}
          disabled={!hasAnswered}
          className="gap-2 bg-matcha hover:bg-matcha/90"
        >
          {currentIndex === shuffledQuestions.length - 1 ? 'Hoàn thành' : 'Tiếp'}
          {currentIndex < shuffledQuestions.length - 1 && <SkipForward className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
