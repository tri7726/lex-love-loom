import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, ChevronRight, RotateCcw, Sparkles, Loader2,
  GraduationCap, TrendingUp, ArrowUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/* ──────── Types ──────── */
interface Question {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  furigana: string;
}

interface LevelResult {
  level: string;
  score: number;
  total: number;
  passed: boolean;
}

interface LevelAssessmentProps {
  className?: string;
}

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const PASS_THRESHOLD = 4; // out of 5
const FAIL_THRESHOLD = 2;

/* ──────── Level config ──────── */
const LEVEL_CONFIG: Record<string, { label: string; gradient: string; iconBg: string }> = {
  N5: { label: 'Sơ cấp 1', gradient: 'from-green-400 to-emerald-500', iconBg: 'bg-green-500' },
  N4: { label: 'Sơ cấp 2', gradient: 'from-blue-400 to-indigo-500', iconBg: 'bg-blue-500' },
  N3: { label: 'Trung cấp', gradient: 'from-yellow-400 to-orange-500', iconBg: 'bg-yellow-500' },
  N2: { label: 'Trung cao cấp', gradient: 'from-orange-400 to-red-500', iconBg: 'bg-orange-500' },
  N1: { label: 'Cao cấp', gradient: 'from-red-400 to-purple-600', iconBg: 'bg-red-500' },
};

const LevelAssessment: React.FC<LevelAssessmentProps> = ({ className }) => {
  const { toast } = useToast();

  /* State machine: 'start' | 'quiz' | 'level-result' | 'complete' */
  const [phase, setPhase] = useState<'start' | 'quiz' | 'level-result' | 'complete'>('start');

  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [levelResults, setLevelResults] = useState<LevelResult[]>([]);
  const [lastScore, setLastScore] = useState(0);
  const [lastTotal, setLastTotal] = useState(0);
  const [lastPassed, setLastPassed] = useState(false);

  const currentLevel = JLPT_LEVELS[currentLevelIdx];

  const generateAssessment = useCallback(async (level: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-grammar-quiz', {
        body: { mode: 'assessment', currentLevel: level },
      });
      if (error) throw error;
      const qs: Question[] = (data?.questions || []).map((q: any) => ({
        question: q.question || '',
        options: q.options || [],
        correct_answer: q.correct_answer ?? 0,
        explanation: q.explanation || '',
        furigana: q.furigana || '',
      }));
      if (qs.length === 0) throw new Error('No questions returned');
      setQuestions(qs);
      setCurrentQ(0);
      setAnswers([]);
      setPhase('quiz');
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể tạo đề đánh giá. Thử lại sau.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleAnswer = (optionIndex: number) => {
    if (answers.length > currentQ) return;
    setAnswers(prev => {
      const next = [...prev];
      next[currentQ] = optionIndex;
      return next;
    });
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(s => s + 1);
    } else {
      // Quiz done for this level
      const score = questions.filter((q, i) => answers[i] === q.correct_answer).length;
      const total = questions.length;
      const passed = score >= PASS_THRESHOLD;
      setLastScore(score);
      setLastTotal(total);
      setLastPassed(passed);
      setPhase('level-result');
    }
  };

  const handleLevelContinue = (proceed: boolean) => {
    if (proceed) {
      // Move to next level
      const nextIdx = currentLevelIdx + 1;
      if (nextIdx >= JLPT_LEVELS.length) {
        // All levels done
        setPhase('complete');
        return;
      }
      setLevelResults(prev => [...prev, { level: currentLevel, score: lastScore, total: lastTotal, passed: lastPassed }]);
      setCurrentLevelIdx(nextIdx);
      generateAssessment(JLPT_LEVELS[nextIdx]);
    } else {
      // Retry same level
      generateAssessment(currentLevel);
    }
  };

  const handleStart = () => {
    setLevelResults([]);
    setCurrentLevelIdx(0);
    generateAssessment('N5');
  };

  const handleRestart = () => {
    setPhase('start');
    setLevelResults([]);
    setCurrentLevelIdx(0);
    setQuestions([]);
    setAnswers([]);
  };

  /* ── Start Screen ── */
  if (phase === 'start') {
    return (
      <div className={cn('space-y-4', className)}>
        <Card className="border border-indigo-100/60 rounded-2xl bg-gradient-to-br from-indigo-50/30 to-violet-50/30">
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center mx-auto shadow-lg">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Đánh giá trình độ JLPT</h3>
            <p className="text-sm text-foreground/60 max-w-md mx-auto">
              Bài kiểm tra sẽ bắt đầu từ N5 và tăng dần lên N1. Mỗi cấp độ có 5 câu hỏi.
              Đúng {PASS_THRESHOLD}/5 để lên cấp độ tiếp theo.
            </p>
            <div className="flex items-center justify-center gap-3 py-2">
              {JLPT_LEVELS.map((lv, i) => (
                <div key={lv} className="flex items-center gap-1">
                  <span className={cn(
                    'text-[10px] font-black px-2 py-1 rounded-full',
                    lv === 'N5' && 'bg-green-100 text-green-600',
                    lv === 'N4' && 'bg-blue-100 text-blue-600',
                    lv === 'N3' && 'bg-yellow-100 text-yellow-600',
                    lv === 'N2' && 'bg-orange-100 text-orange-600',
                    lv === 'N1' && 'bg-red-100 text-red-600',
                  )}>{lv}</span>
                  {i < JLPT_LEVELS.length - 1 && <ArrowUp className="h-3 w-3 text-muted-foreground/40" />}
                </div>
              ))}
            </div>
            <Button onClick={handleStart} className="rounded-full px-8 gap-2 bg-indigo-500 hover:bg-indigo-600">
              <Sparkles className="h-4 w-4" /> Bắt đầu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-16', className)}>
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto" />
          <p className="text-sm text-muted-foreground">Đang tạo câu hỏi trình độ {currentLevel}...</p>
        </div>
      </div>
    );
  }

  /* ── Quiz ── */
  if (phase === 'quiz') {
    const q = questions[currentQ];
    if (!q) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('space-y-4', className)}
      >
        <Card className="border border-indigo-100/60 rounded-2xl bg-white/60">
          <CardContent className="p-5 space-y-4">
            {/* Level header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('h-6 w-6 rounded-lg flex items-center justify-center', LEVEL_CONFIG[currentLevel]?.iconBg || 'bg-gray-500')}>
                  <span className="text-[8px] font-black text-white">{currentLevel}</span>
                </div>
                <span className="text-xs font-bold text-foreground/70">
                  {LEVEL_CONFIG[currentLevel]?.label || currentLevel}
                </span>
                <Badge className="bg-indigo-100 text-indigo-700 text-[9px] px-2 py-0.5 rounded-full border-none">
                  Câu {currentQ + 1}/{questions.length}
                </Badge>
              </div>
              <Progress value={(answers.length / questions.length) * 100} className="h-1.5 w-20" />
            </div>

            {/* Question */}
            <div className="p-4 rounded-xl bg-white/80 border border-indigo-100/50">
              <p className="font-jp text-lg font-bold text-foreground leading-relaxed">
                {q.question.replace(/_{2,}/g, '_____')}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const isSelected = answers[currentQ] === i;
                const isCorrect = answers[currentQ] !== undefined && i === q.correct_answer;
                const isWrong = isSelected && i !== q.correct_answer;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answers[currentQ] !== undefined}
                    className={cn(
                      'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left font-jp text-sm font-bold transition-all',
                      answers[currentQ] === undefined && 'bg-white border-indigo-100/60 hover:border-indigo-300/60 hover:shadow-sm',
                      isCorrect && 'bg-emerald-50 border-emerald-400 text-emerald-700',
                      isWrong && 'bg-rose-50 border-rose-300 text-rose-700',
                      isSelected && !isWrong && !isCorrect && 'bg-indigo-50 border-indigo-300',
                    )}
                  >
                    <span className={cn(
                      'text-[10px] font-mono shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
                      isCorrect && 'bg-emerald-400 text-white',
                      isWrong && 'bg-rose-400 text-white',
                      answers[currentQ] === undefined && 'bg-muted text-muted-foreground',
                    )}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                    <span className="ml-auto shrink-0">
                      {isCorrect && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                      {isWrong && <XCircle className="h-4 w-4 text-rose-500" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {answers[currentQ] !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'p-4 rounded-xl space-y-2',
                    answers[currentQ] === q.correct_answer
                      ? 'bg-emerald-50/80 border border-emerald-200/60'
                      : 'bg-rose-50/80 border border-rose-200/60'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {answers[currentQ] === q.correct_answer ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-500" />
                    )}
                    <span className={cn('text-sm font-bold', answers[currentQ] === q.correct_answer ? 'text-emerald-700' : 'text-rose-700')}>
                      {answers[currentQ] === q.correct_answer ? 'Chính xác!' : 'Chưa đúng'}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/60 leading-relaxed">{q.explanation}</p>
                  <Button
                    onClick={handleNext}
                    size="sm"
                    className="mt-1 rounded-full text-xs gap-1.5 bg-indigo-500 hover:bg-indigo-600"
                  >
                    {currentQ < questions.length - 1 ? (
                      <>Tiếp <ChevronRight className="h-3 w-3" /></>
                    ) : (
                      'Xem kết quả'
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Dots progress */}
        {answers.length > 0 && answers.length < questions.length && (
          <div className="flex justify-center gap-1">
            {questions.map((_, i) => (
              <span key={i} className={cn(
                'h-1.5 rounded-full transition-all',
                i === currentQ ? 'w-5 bg-indigo-500' : 'w-1.5',
                answers[i] !== undefined
                  ? answers[i] === questions[i].correct_answer ? 'bg-emerald-400' : 'bg-rose-400'
                  : 'bg-gray-200'
              )} />
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  /* ── Level Result ── */
  if (phase === 'level-result') {
    const isBorderline = lastScore > FAIL_THRESHOLD && lastScore < PASS_THRESHOLD;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('space-y-4', className)}
      >
        <Card className={cn(
          'border rounded-2xl',
          lastPassed ? 'border-emerald-200' : isBorderline ? 'border-amber-200' : 'border-rose-200'
        )}>
          <CardContent className="p-6 text-center space-y-4">
            <div className={cn(
              'h-14 w-14 rounded-full flex items-center justify-center mx-auto shadow-lg',
              lastPassed ? 'bg-gradient-to-br from-emerald-400 to-green-500' : isBorderline ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-rose-400 to-red-500'
            )}>
              {lastPassed ? <CheckCircle className="h-6 w-6 text-white" /> : <XCircle className="h-6 w-6 text-white" />}
            </div>
            <h3 className="text-lg font-bold">
              {lastPassed ? `Đạt trình độ ${currentLevel}!` : isBorderline ? 'Gần đạt!' : `Chưa đạt trình độ ${currentLevel}`}
            </h3>
            <p className="text-sm text-foreground/60">
              Điểm: <strong>{lastScore}/{lastTotal}</strong>
              {lastPassed ? ' — Bạn đã sẵn sàng lên cấp độ cao hơn!' : isBorderline ? ' — Hãy ôn thêm một chút nữa.' : ' — Cần ôn tập lại kiến thức cơ bản.'}
            </p>
            <Progress value={(lastScore / lastTotal) * 100} className="h-2 max-w-xs mx-auto" />

            <div className="flex gap-2 justify-center pt-2">
              {lastPassed ? (
                <Button onClick={() => handleLevelContinue(true)} className="rounded-full gap-2 bg-emerald-500 hover:bg-emerald-600">
                  <ArrowUp className="h-4 w-4" /> Lên cấp {currentLevelIdx + 2 <= JLPT_LEVELS.length ? JLPT_LEVELS[currentLevelIdx + 1] : ''}
                </Button>
              ) : (
                <>
                  {isBorderline && (
                    <Button onClick={() => handleLevelContinue(true)} variant="outline" className="rounded-full">
                      Vẫn thử cấp tiếp theo
                    </Button>
                  )}
                  <Button onClick={() => handleLevelContinue(false)} className="rounded-full gap-2 bg-indigo-500 hover:bg-indigo-600">
                    <RotateCcw className="h-4 w-4" /> Làm lại {currentLevel}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  /* ── Complete ── */
  if (phase === 'complete') {
    const allResults = [...levelResults, { level: currentLevel, score: lastScore, total: lastTotal, passed: lastPassed }];
    const highestPassed = allResults.filter(r => r.passed).length;
    const currentLevelName = JLPT_LEVELS[Math.min(highestPassed, JLPT_LEVELS.length - 1)];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('space-y-4', className)}
      >
        <Card className="border border-indigo-100/60 rounded-2xl bg-gradient-to-br from-indigo-50/30 to-violet-50/30">
          <CardContent className="p-6 text-center space-y-5">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center mx-auto shadow-lg">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Hoàn thành đánh giá!</h3>
              <p className="text-sm text-foreground/60 mt-1">
                Trình độ hiện tại của bạn tương đương <strong className={cn(
                  'text-lg',
                  currentLevelName === 'N5' && 'text-green-600',
                  currentLevelName === 'N4' && 'text-blue-600',
                  currentLevelName === 'N3' && 'text-yellow-600',
                  currentLevelName === 'N2' && 'text-orange-600',
                  currentLevelName === 'N1' && 'text-red-600',
                )}>{currentLevelName}</strong>
              </p>
            </div>

            {/* Level results bar */}
            <div className="max-w-sm mx-auto space-y-3">
              {allResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Badge className={cn(
                    'text-[9px] font-black px-2 py-0.5 rounded-full border-none w-8 justify-center',
                    r.level === 'N5' && 'bg-green-100 text-green-600',
                    r.level === 'N4' && 'bg-blue-100 text-blue-600',
                    r.level === 'N3' && 'bg-yellow-100 text-yellow-600',
                    r.level === 'N2' && 'bg-orange-100 text-orange-600',
                    r.level === 'N1' && 'bg-red-100 text-red-600',
                  )}>{r.level}</Badge>
                  <Progress value={(r.score / r.total) * 100} className={cn(
                    'h-2 flex-1',
                    r.passed ? 'text-emerald-500' : 'text-rose-400'
                  )} />
                  <span className={cn(
                    'text-[10px] font-bold w-8 text-right',
                    r.passed ? 'text-emerald-600' : 'text-rose-500'
                  )}>
                    {r.score}/{r.total}
                  </span>
                  {r.passed && <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />}
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={handleRestart} variant="outline" size="sm" className="rounded-full">
                <RotateCcw className="h-3.5 w-3.5" /> Làm lại
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return null;
};

export default LevelAssessment;
