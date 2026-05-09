import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Info,
  Sparkles,
  ChevronRight,
  Brain,
  PenLine,
  ListChecks,
  Clock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useGrammarMastery } from '@/hooks/useGrammarMastery';

type QuizMode = 'mcq' | 'fill-blank';

interface Question {
  question: string;
  options?: string[];
  correct_answer: number | string;
  explanation: string;
  furigana?: string;
}

interface GrammarPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  grammarPoint: {
    title: string;
    level: string;
    explanation: string;
  };
  userId?: string | null;
}

/** Get next review interval text from streak */
const getIntervalText = (streak: number): string => {
  if (streak <= 0) return 'hôm nay';
  if (streak === 1) return '1 ngày nữa';
  if (streak === 2) return '3 ngày nữa';
  if (streak <= 5) return '7 ngày nữa';
  return '14 ngày nữa';
};

const practiceModes: { value: QuizMode; label: string; icon: React.ReactNode }[] = [
  { value: 'mcq', label: 'Trắc nghiệm', icon: <ListChecks className="h-4 w-4" /> },
  { value: 'fill-blank', label: 'Điền từ', icon: <PenLine className="h-4 w-4" /> },
];

export const GrammarPracticeModal: React.FC<GrammarPracticeModalProps> = ({
  isOpen,
  onClose,
  grammarPoint,
  userId,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | string | null>(null);
  const [fillInput, setFillInput] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [quizMode, setQuizMode] = useState<QuizMode>('mcq');
  const [lastStreak, setLastStreak] = useState(0);
  const { toast } = useToast();
  const { updateMastery, getMastery } = useGrammarMastery({ userId });

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setCorrectCount(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setFillInput('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-grammar-quiz', {
        body: {
          grammar_point: grammarPoint.title,
          level: grammarPoint.level,
          explanation: grammarPoint.explanation,
          mode: quizMode,
        }
      });

      if (error) throw error;
      setQuestions(data.questions);
    } catch (error) {
      console.error('Fetch quiz error:', error);
      toast({
        title: "Lỗi tải bài tập",
        description: "Không thể tạo bài tập vào lúc này. Vui lòng thử lại sau.",
        variant: "destructive"
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [grammarPoint, quizMode, toast, onClose]);

  useEffect(() => {
    if (isOpen) {
      fetchQuestions();
    }
  }, [isOpen, fetchQuestions]);

  const handleAnswer = (index: number) => {
    if (hasAnswered) return;
    setSelectedAnswer(index);
    setHasAnswered(true);
    if (index === questions[currentIndex].correct_answer) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const handleFillSubmit = () => {
    if (hasAnswered || !fillInput.trim()) return;
    setHasAnswered(true);
    const isCorrect = fillInput.trim().toLowerCase() === String(questions[currentIndex].correct_answer).toLowerCase();
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }
    setSelectedAnswer(fillInput);
  };

  /** Log a mistake to RAG knowledge base */
  const logMistake = useCallback(async (content: string) => {
    if (!userId) return;
    try {
      await supabase.functions.invoke('sensei-rag', {
        body: {
          action: 'index',
          user_id: userId,
          content: `Practice sai: "${grammarPoint.title}" - ${content}`,
          source_type: 'mistake',
          metadata: { grammar: true, practice_mode: quizMode, level: grammarPoint.level }
        }
      });
    } catch (e) {
      console.warn('Failed to log mistake:', e);
    }
  }, [userId, grammarPoint.title, grammarPoint.level, quizMode]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setFillInput('');
    } else {
      const finalScore = Math.round((correctCount / questions.length) * 100);
      updateMastery(grammarPoint.title, finalScore);

      // Log mistakes if score is low
      if (finalScore < 60) {
        logMistake(`Score ${finalScore}% (${correctCount}/${questions.length} đúng)`);
      }

      // Get streak info for display
      const masteryData = getMastery(grammarPoint.title);
      setLastStreak(masteryData.streak);

      setIsFinished(true);
    }
  };

  const handleModeSwitch = (mode: QuizMode) => {
    if (isLoading) return;
    setQuizMode(mode);
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const isFillMode = quizMode === 'fill-blank';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-elevated rounded-3xl">
        <DialogHeader className="p-6 bg-gradient-to-r from-sakura/10 to-primary/5 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sakura/20 flex items-center justify-center text-sakura">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Luyện tập AI</DialogTitle>
              <DialogDescription className="font-medium text-sakura flex items-center gap-1">
                Cấu trúc: {grammarPoint.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 border-4 border-sakura/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-sakura border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-muted-foreground animate-pulse font-medium">AI đang soạn câu hỏi cho bạn...</p>
            </div>
          ) : isFinished ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-6"
            >
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-sakura/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative h-24 w-24 rounded-full bg-white border-4 border-sakura flex items-center justify-center text-4xl shadow-lg">
                   🌸
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">Hoàn thành bài tập!</h3>
                <p className="text-muted-foreground">Bạn đã trả lời đúng {correctCount}/{questions.length} câu</p>
              </div>
              <div className="text-5xl font-black text-sakura">
                {Math.round((correctCount / questions.length) * 100)}%
              </div>

              {/* Next review info */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-2xl border">
                <Clock className="h-4 w-4 text-sakura" />
                <span>Lần ôn tập tiếp theo: <strong className="text-foreground">{getIntervalText(lastStreak)}</strong></span>
              </div>

              <div className="flex gap-3 justify-center pt-4">
                <Button variant="outline" onClick={fetchQuestions} className="gap-2 rounded-xl">
                  <RotateCcw className="h-4 w-4" /> Làm lại
                </Button>
                <Button onClick={onClose} className="bg-sakura hover:bg-sakura/90 gap-2 px-8 rounded-xl shadow-lg shadow-sakura/20">
                  Đóng
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Mode toggle + Progress */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
                  {practiceModes.map(m => (
                    <button
                      key={m.value}
                      onClick={() => handleModeSwitch(m.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        quizMode === m.value
                          ? "bg-sakura text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {currentIndex + 1} / {questions.length}
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />

              {/* Question */}
              <div className="space-y-4">
                <div className="p-6 bg-muted/30 rounded-2xl border-2 border-dashed border-primary/20">
                    <p className="font-jp text-2xl text-center leading-relaxed">
                        {currentQuestion.question}
                    </p>
                    {currentQuestion.furigana && (
                        <p className="text-xs text-muted-foreground text-center mt-2 opacity-70">
                            {currentQuestion.furigana}
                        </p>
                    )}
                </div>

                {/* Options: MCQ or Fill-blank */}
                {isFillMode ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={fillInput}
                        onChange={(e) => setFillInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleFillSubmit()}
                        placeholder="Nhập câu trả lời..."
                        disabled={hasAnswered}
                        className="font-jp text-lg h-14 rounded-xl"
                        autoFocus
                      />
                      <Button
                        onClick={handleFillSubmit}
                        disabled={hasAnswered || !fillInput.trim()}
                        className="h-14 px-6 rounded-xl bg-sakura hover:bg-sakura/90"
                      >
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                    {hasAnswered && (
                      <div className={cn(
                        "p-4 rounded-xl border-2 flex items-center gap-3",
                        selectedAnswer === questions[currentIndex].correct_answer
                          ? "bg-green-50 border-green-500 text-green-700"
                          : "bg-red-50 border-red-500 text-red-700"
                      )}>
                        {selectedAnswer === questions[currentIndex].correct_answer ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 shrink-0" />
                        )}
                        <div>
                          <p className="font-bold">
                            {selectedAnswer === questions[currentIndex].correct_answer ? 'Đúng rồi!' : 'Sai rồi!'}
                          </p>
                          {selectedAnswer !== questions[currentIndex].correct_answer && (
                            <p className="text-sm font-jp">
                              Đáp án: <strong>{String(questions[currentIndex].correct_answer)}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {currentQuestion.options?.map((option, index) => {
                      const isSelected = selectedAnswer === index;
                      const isCorrect = index === questions[currentIndex].correct_answer;

                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswer(index)}
                          disabled={hasAnswered}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group",
                            hasAnswered && isCorrect
                              ? "bg-green-50 border-green-500 text-green-700"
                              : hasAnswered && isSelected && !isCorrect
                                ? "bg-red-50 border-red-500 text-red-700"
                                : isSelected
                                  ? "border-sakura bg-sakura/5"
                                  : "border-muted hover:border-sakura/30 hover:bg-sakura/[0.02]"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0",
                            hasAnswered && isCorrect
                              ? "bg-green-500 text-white"
                              : hasAnswered && isSelected && !isCorrect
                                ? "bg-red-500 text-white"
                                : isSelected
                                  ? "bg-sakura text-white"
                                  : "bg-muted text-muted-foreground group-hover:bg-sakura/10 group-hover:text-sakura"
                          )}>
                            {hasAnswered && isCorrect ? (
                               <CheckCircle2 className="h-4 w-4" />
                            ) : hasAnswered && isSelected && !isCorrect ? (
                               <XCircle className="h-4 w-4" />
                            ) : (
                              String.fromCharCode(65 + index)
                            )}
                          </div>
                          <span className="font-jp text-lg flex-1">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {hasAnswered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Sparkles className="h-4 w-4" />
                      Giải thích AI
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {currentQuestion.explanation}
                    </p>
                    <Button
                      onClick={handleNext}
                      className="w-full mt-2 bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 font-bold"
                    >
                      {currentIndex === questions.length - 1 ? 'Xem kết quả' : 'Tiếp theo'}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
