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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTTS } from '@/hooks/useTTS';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

interface VideoQuizModeProps {
  questions: Question[];
  onComplete: (score: number, total: number) => void;
}

const VideoQuizMode: React.FC<VideoQuizModeProps> = ({
  questions,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const { speak, isSupported } = useTTS({ lang: 'ja-JP' });

  // Shuffle questions on mount
  useEffect(() => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
  }, [questions]);

  const currentQuestion = shuffledQuestions[currentIndex];
  const progress = ((currentIndex + 1) / shuffledQuestions.length) * 100;

  const handleAnswer = (index: number) => {
    if (hasAnswered) return;
    
    setSelectedAnswer(index);
    setHasAnswered(true);
    
    if (index === currentQuestion.correct_answer) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < shuffledQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
    } else {
      // Quiz complete
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
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Chưa có câu hỏi nào cho video này.
        </p>
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
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Quiz Master</span>
          <Button variant="ghost" size="sm" onClick={handleReshuffle} className="gap-1">
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={progress} className="h-2 bg-matcha/20" />
          <p className="text-sm text-muted-foreground">
            Câu hỏi {currentIndex + 1} của {shuffledQuestions.length}
          </p>
        </div>
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
          <p className="font-jp text-lg leading-relaxed">
            {currentQuestion.question_text}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correct_answer;
            const showResult = hasAnswered;
            
            return (
              <motion.button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={hasAnswered}
                className={`
                  w-full text-left p-4 rounded-lg border-2 transition-all
                  flex items-center gap-3
                  ${showResult && isCorrect
                    ? 'border-matcha bg-matcha/10'
                    : showResult && isSelected && !isCorrect
                      ? 'border-destructive bg-destructive/10'
                      : isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <span className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${showResult && isCorrect
                    ? 'bg-matcha text-white'
                    : showResult && isSelected && !isCorrect
                      ? 'bg-destructive text-white'
                      : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {showResult && isCorrect ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : showResult && isSelected && !isCorrect ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="font-jp flex-1">{option}</span>
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
                💡 {currentQuestion.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Keyboard className="h-4 w-4" />
          <span>Phím tắt</span>
          <Badge variant="outline" className="text-xs">F1</Badge>
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

// Badge component inline for this file
const Badge = ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variant === 'outline' ? 'border' : 'bg-primary/10'} ${className}`}>
    {children}
  </span>
);

export default VideoQuizMode;
