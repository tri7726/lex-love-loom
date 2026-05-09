import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, XCircle, RotateCcw, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface GrammarError {
  position: number;
  original: string;
  corrected: string;
  type: string;
  difficulty: string;
  explanation: string;
}

interface MistakeReviewModeProps {
  originalText: string;
  errors: GrammarError[];
  onClose: () => void;
}

interface ErrorQuiz {
  index: number;
  original: string;
  corrected: string;
  type: string;
  difficulty: string;
  explanation: string;
  options: string[];
  answered: boolean;
  correct: boolean;
}

const typeLabels: Record<string, string> = {
  particle_mistake: 'Trợ từ',
  verb_conjugation: 'Chia động từ',
  word_choice: 'Từ vựng',
  politeness: 'Lịch sự',
  spelling: 'Chính tả',
  structure: 'Cấu trúc',
};

const MistakeReviewMode: React.FC<MistakeReviewModeProps> = ({ originalText, errors, onClose }) => {
  const [step, setStep] = useState(0);
  const [quizzes, setQuizzes] = useState<ErrorQuiz[]>(() =>
    errors.map((err, i) => {
      // Generate 3 distractors + the correct answer
      const distractors = [
        err.corrected + 'の',
        err.corrected.replace(/[ぁ-ん]/g, '') || err.corrected + 'を',
        err.original.length > 1 ? err.original.slice(0, -1) + 'ん' : err.original + 'は',
      ].filter(d => d !== err.corrected).slice(0, 3);

      const options = [err.corrected, ...distractors].sort(() => Math.random() - 0.5);

      return {
        index: i,
        original: err.original,
        corrected: err.corrected,
        type: err.type,
        difficulty: err.difficulty,
        explanation: err.explanation,
        options,
        answered: false,
        correct: false,
      };
    })
  );

  const totalErrors = errors.length;
  const currentQuiz = quizzes[step];
  const answeredCount = quizzes.filter(q => q.answered).length;
  const correctCount = quizzes.filter(q => q.correct).length;
  const isComplete = step >= totalErrors;

  const handleAnswer = useCallback((selected: string) => {
    if (!currentQuiz || currentQuiz.answered) return;
    const isCorrect = selected === currentQuiz.corrected;
    setQuizzes(prev => prev.map((q, i) =>
      i === step ? { ...q, answered: true, correct: isCorrect } : q
    ));
  }, [currentQuiz, step]);

  const handleNext = () => {
    if (step < totalErrors - 1) {
      setStep(s => s + 1);
    } else {
      setStep(totalErrors); // triggers complete state
    }
  };

  // Build highlighted text showing the current error location
  const renderHighlightedText = () => {
    if (!currentQuiz) return originalText;
    const err = errors[step];
    const before = originalText.slice(0, err.position);
    const after = originalText.slice(err.position + err.original.length);
    return (
      <>
        {before && <span>{before}</span>}
        <span className="bg-rose-100 text-rose-700 px-1 rounded font-bold line-through decoration-rose-400 decoration-2">{err.original}</span>
        {after && <span>{after}</span>}
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50/30 to-violet-50/30 overflow-hidden"
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Target className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-700">Tìm lỗi sai</h3>
            <p className="text-[10px] text-muted-foreground">Hãy tìm và sửa lỗi trong câu</p>
          </div>
          <button onClick={onClose} className="ml-auto text-muted-foreground/50 hover:text-foreground text-xs">✕</button>
        </div>

        {!isComplete && currentQuiz ? (
          <>
            {/* Progress */}
            <Progress value={(answeredCount / totalErrors) * 100} className="h-1.5" />

            {/* Question */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-bold text-indigo-600">Lỗi {step + 1}/{totalErrors}</span>
                <Badge className={cn(
                  'text-[8px] px-1.5 py-0 rounded-full border-none',
                  currentQuiz.type === 'particle_mistake' && 'bg-purple-100 text-purple-700',
                  currentQuiz.type === 'verb_conjugation' && 'bg-blue-100 text-blue-700',
                  currentQuiz.type === 'word_choice' && 'bg-orange-100 text-orange-700',
                  currentQuiz.type === 'politeness' && 'bg-pink-100 text-pink-700',
                  currentQuiz.type === 'spelling' && 'bg-red-100 text-red-700',
                  currentQuiz.type === 'structure' && 'bg-teal-100 text-teal-700',
                )}>
                  {typeLabels[currentQuiz.type] || currentQuiz.type}
                </Badge>
                <Badge className={cn(
                  'text-[8px] px-1.5 py-0 rounded-full border-none',
                  currentQuiz.difficulty === 'beginner' && 'bg-green-100 text-green-700',
                  currentQuiz.difficulty === 'intermediate' && 'bg-yellow-100 text-yellow-700',
                  currentQuiz.difficulty === 'advanced' && 'bg-red-100 text-red-700',
                )}>
                  {currentQuiz.difficulty === 'beginner' ? 'Cơ bản' : currentQuiz.difficulty === 'intermediate' ? 'Trung cấp' : 'Nâng cao'}
                </Badge>
              </div>

              {/* Original text with current error highlighted */}
              <div className="font-jp text-lg leading-relaxed p-4 rounded-xl bg-white/70 border border-indigo-100/50">
                {renderHighlightedText()}
              </div>

              <p className="text-xs text-foreground/60">Chọn đáp án đúng để thay thế phần được highlight:</p>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentQuiz.options.map((opt, i) => {
                  const isSelected = currentQuiz.answered && opt === currentQuiz.corrected;
                  const isWrong = currentQuiz.answered && !isSelected;
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      disabled={currentQuiz.answered}
                      className={cn(
                        'font-jp text-sm font-bold p-3 rounded-xl border-2 text-left transition-all',
                        !currentQuiz.answered && 'bg-white border-indigo-100/60 hover:border-indigo-300/60 hover:shadow-sm',
                        currentQuiz.answered && opt === currentQuiz.corrected && 'bg-emerald-50 border-emerald-400 text-emerald-700',
                        currentQuiz.answered && opt !== currentQuiz.corrected && 'bg-white border-gray-100 text-muted-foreground/50',
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground/40 font-mono mr-2">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Result feedback */}
              <AnimatePresence>
                {currentQuiz.answered && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'p-4 rounded-xl space-y-2',
                      currentQuiz.correct ? 'bg-emerald-50/80 border border-emerald-200/60' : 'bg-rose-50/80 border border-rose-200/60'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {currentQuiz.correct ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-500" />
                      )}
                      <span className={cn('text-sm font-bold', currentQuiz.correct ? 'text-emerald-700' : 'text-rose-700')}>
                        {currentQuiz.correct ? 'Chính xác!' : 'Chưa đúng'}
                      </span>
                    </div>
                    {!currentQuiz.correct && (
                      <p className="text-xs text-foreground/70">
                        Đáp án đúng: <span className="font-jp font-bold text-emerald-600">{currentQuiz.corrected}</span>
                      </p>
                    )}
                    <p className="text-xs text-foreground/60 leading-relaxed">{currentQuiz.explanation}</p>

                    <Button onClick={handleNext} size="sm" className="mt-1 rounded-full text-xs gap-1.5 bg-indigo-500 hover:bg-indigo-600">
                      {step < totalErrors - 1 ? <>Tiếp <ChevronRight className="h-3 w-3" /></> : 'Xem kết quả'}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          /* Completion screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-6 space-y-4 text-center"
          >
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center mx-auto shadow-lg">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Hoàn thành!</h3>
            <p className="text-sm text-foreground/60">
              Bạn đã tìm đúng <strong className="text-emerald-600">{correctCount}/{totalErrors}</strong> lỗi
            </p>
            <Progress value={(correctCount / totalErrors) * 100} className="h-2 max-w-xs mx-auto" />

            {/* Summary */}
            <div className="space-y-2 max-w-sm mx-auto text-left">
              {quizzes.map((q, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-white/70">
                  {q.correct ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className="font-jp text-rose-500 line-through">{q.original}</span>
                  <span className="text-muted-foreground/40">→</span>
                  <span className="font-jp text-emerald-600 font-bold">{q.corrected}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={onClose} variant="outline" size="sm" className="rounded-full">
                Đóng
              </Button>
              <Button onClick={() => { setStep(0); setQuizzes(prev => prev.map(q => ({ ...q, answered: false, correct: false }))); }}
                size="sm" className="rounded-full gap-1.5 bg-indigo-500 hover:bg-indigo-600">
                <RotateCcw className="h-3 w-3" /> Làm lại
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default MistakeReviewMode;
