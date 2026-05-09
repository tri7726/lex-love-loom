import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, Shuffle, ChevronRight, CheckCircle, XCircle, RotateCcw,
  Sparkles, Target, BookOpen, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTTS } from '@/hooks/useTTS';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/* ──────── Types ──────── */
interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  furigana: string;
}

interface GrammarQuizDrillsProps {
  className?: string;
}

const GRAMMAR_POINTS = [
  { value: '〜は', label: '〜は (topic)', jlpt: 'N5' },
  { value: '〜が', label: '〜が (subject)', jlpt: 'N5' },
  { value: '〜を', label: '〜を (object)', jlpt: 'N5' },
  { value: '〜に', label: '〜に (time/direction)', jlpt: 'N5' },
  { value: '〜で', label: '〜で (location/means)', jlpt: 'N5' },
  { value: '〜て形', label: '〜て form', jlpt: 'N5' },
  { value: '〜た形', label: '〜た form (past)', jlpt: 'N5' },
  { value: '〜ない形', label: '〜ない form (negative)', jlpt: 'N5' },
  { value: '〜たい', label: '〜たい (want)', jlpt: 'N5' },
  { value: '〜くれる/あげる/もらう', label: '〜あげる/くれる/もらう', jlpt: 'N5' },
  { value: '〜てもいい', label: '〜てもいい', jlpt: 'N5' },
  { value: '〜てはいけない', label: '〜てはいけない', jlpt: 'N5' },
  { value: '〜ほうがいい', label: '〜ほうがいい', jlpt: 'N5' },
  { value: '〜かもしれない', label: '〜かもしれない', jlpt: 'N4' },
  { value: '〜なければならない', label: '〜なければならない', jlpt: 'N4' },
  { value: '〜そうだ', label: '〜そうだ (hearsay)', jlpt: 'N4' },
  { value: '〜ようだ', label: '〜ようだ (seems like)', jlpt: 'N4' },
  { value: '〜たら', label: '〜たら (if)', jlpt: 'N4' },
  { value: '〜ば', label: '〜ば (conditional)', jlpt: 'N4' },
  { value: '受身形', label: '受身形 (passive)', jlpt: 'N4' },
  { value: '使役形', label: '使役形 (causative)', jlpt: 'N3' },
  { value: '〜てしまう', label: '〜てしまう', jlpt: 'N4' },
  { value: '〜ていく/〜てくる', label: '〜ていく / 〜てくる', jlpt: 'N4' },
  { value: '〜ため（に）', label: '〜ため（に）', jlpt: 'N3' },
  { value: '〜ように', label: '〜ように (in order to)', jlpt: 'N3' },
  { value: '〜ばかり', label: '〜ばかり', jlpt: 'N3' },
  { value: '〜はず', label: '〜はず', jlpt: 'N3' },
  { value: '〜らしい', label: '〜らしい (typical of)', jlpt: 'N3' },
  { value: '敬語', label: '敬語 (honorific)', jlpt: 'N3' },
];

const GrammarQuizDrills: React.FC<GrammarQuizDrillsProps> = ({ className }) => {
  const { speak } = useTTS();
  const { toast } = useToast();
  const [selectedPoint, setSelectedPoint] = useState<string>('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const generateQuiz = useCallback(async () => {
    if (!selectedPoint) {
      toast({ title: 'Chọn ngữ pháp', description: 'Hãy chọn một cấu trúc ngữ pháp để luyện tập.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const point = GRAMMAR_POINTS.find(p => p.value === selectedPoint);
      const { data, error } = await supabase.functions.invoke('generate-grammar-quiz', {
        body: {
          grammar_point: selectedPoint,
          level: point?.jlpt || 'N5',
          explanation: `Practice questions for ${selectedPoint}`,
        },
      });
      if (error) throw error;
      if (data?.questions && data.questions.length > 0) {
        const mapped: QuizQuestion[] = data.questions.map((q: any) => ({
          question: q.question || '',
          options: q.options || [],
          correct_answer: q.correct_answer ?? 0,
          explanation: q.explanation || '',
          furigana: q.furigana || '',
        }));
        setQuestions(mapped);
        setCurrentIndex(0);
        setAnswers([]);
        setStarted(true);
      } else {
        toast({ title: 'Lỗi', description: 'Không thể tạo câu hỏi. Thử lại sau.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Lỗi', description: 'Sensei đang bận tạo đề, thử lại sau.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedPoint, toast]);

  const handleAnswer = (optionIndex: number) => {
    if (answers.length > currentIndex) return;
    setAnswers(prev => {
      const next = [...prev];
      next[currentIndex] = optionIndex;
      return next;
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(s => s + 1);
    }
  };

  const handleRestart = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setStarted(false);
    setSelectedPoint('');
  };

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = answers.length;
  const correctCount = questions.filter((q, i) => answers[i] === q.correct_answer).length;
  const isComplete = totalQuestions > 0 && answers.length === totalQuestions;

  /* ── Grammar point selector ── */
  if (!started) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card className="border border-indigo-100/60 rounded-2xl bg-white/60">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-violet-500 flex items-center justify-center">
                <Target className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-violet-700">Luyện ngữ pháp</h3>
                <p className="text-[10px] text-muted-foreground">Chọn cấu trúc và làm bài tập</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {GRAMMAR_POINTS.map((gp) => (
                <button
                  key={gp.value}
                  onClick={() => setSelectedPoint(gp.value)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border transition-all font-medium',
                    selectedPoint === gp.value
                      ? 'bg-violet-100 text-violet-700 border-violet-200 shadow-sm'
                      : 'bg-white border-border/40 text-foreground/70 hover:border-violet-200'
                  )}
                >
                  {gp.label}
                  <span className={cn(
                    'ml-1.5 text-[8px] font-black px-1 py-0.5 rounded-full',
                    gp.jlpt === 'N5' && 'bg-green-100 text-green-600',
                    gp.jlpt === 'N4' && 'bg-blue-100 text-blue-600',
                    gp.jlpt === 'N3' && 'bg-yellow-100 text-yellow-600',
                  )}>{gp.jlpt}</span>
                </button>
              ))}
            </div>

            <Button
              onClick={generateQuiz}
              disabled={!selectedPoint || loading}
              className="rounded-full text-xs gap-1.5 bg-violet-500 hover:bg-violet-600 w-full"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loading ? 'Đang tạo đề...' : 'Tạo đề luyện tập'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Quiz view ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-4', className)}
    >
      {!isComplete && currentQ && (
        <Card className="border border-violet-100/60 rounded-2xl bg-white/60">
          <CardContent className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-violet-100 text-violet-700 text-[9px] px-2 py-0.5 rounded-full border-none">
                  Câu {currentIndex + 1}/{totalQuestions}
                </Badge>
                <Badge className="bg-indigo-100 text-indigo-700 text-[9px] px-2 py-0.5 rounded-full border-none">
                  {GRAMMAR_POINTS.find(p => p.value === selectedPoint)?.jlpt || ''}
                </Badge>
              </div>
              <Progress value={(answeredCount / totalQuestions) * 100} className="h-1.5 w-24" />
            </div>

            {/* Question */}
            <div className="p-4 rounded-xl bg-white/80 border border-violet-100/50">
              {currentQ.furigana ? (
                <p className="font-jp text-lg font-bold text-foreground leading-relaxed">
                  {currentQ.question.replace(/_{2,}/g, '_____')}
                </p>
              ) : (
                <p className="font-jp text-lg font-bold text-foreground leading-relaxed">
                  {currentQ.question.replace(/_{2,}/g, '_____')}
                </p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              {currentQ.options.map((opt, i) => {
                const isSelected = answers[currentIndex] === i;
                const isCorrect = answers[currentIndex] !== undefined && i === currentQ.correct_answer;
                const isWrong = isSelected && i !== currentQ.correct_answer;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answers[currentIndex] !== undefined}
                    className={cn(
                      'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left font-jp text-sm font-bold transition-all',
                      answers[currentIndex] === undefined && 'bg-white border-violet-100/60 hover:border-violet-300/60 hover:shadow-sm',
                      isCorrect && 'bg-emerald-50 border-emerald-400 text-emerald-700',
                      isWrong && 'bg-rose-50 border-rose-300 text-rose-700',
                      isSelected && !isWrong && !isCorrect && 'bg-violet-50 border-violet-300',
                    )}
                  >
                    <span className={cn(
                      'text-[10px] font-mono shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
                      isCorrect && 'bg-emerald-400 text-white',
                      isWrong && 'bg-rose-400 text-white',
                      answers[currentIndex] === undefined && 'bg-muted text-muted-foreground',
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
              {answers[currentIndex] !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'p-4 rounded-xl space-y-2',
                    answers[currentIndex] === currentQ.correct_answer
                      ? 'bg-emerald-50/80 border border-emerald-200/60'
                      : 'bg-rose-50/80 border border-rose-200/60'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {answers[currentIndex] === currentQ.correct_answer ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-500" />
                    )}
                    <span className={cn('text-sm font-bold', answers[currentIndex] === currentQ.correct_answer ? 'text-emerald-700' : 'text-rose-700')}>
                      {answers[currentIndex] === currentQ.correct_answer ? 'Chính xác!' : 'Chưa đúng'}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/60 leading-relaxed">{currentQ.explanation}</p>
                  {currentQ.furigana && (
                    <p className="text-xs text-indigo-500/70 italic">{currentQ.furigana}</p>
                  )}
                  <Button
                    onClick={handleNext}
                    size="sm"
                    className="mt-1 rounded-full text-xs gap-1.5 bg-violet-500 hover:bg-violet-600"
                    disabled={currentIndex >= totalQuestions - 1}
                  >
                    Tiếp <ChevronRight className="h-3 w-3" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* ── Completion ── */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <Card className="border border-violet-100/60 rounded-2xl bg-gradient-to-br from-violet-50/30 to-indigo-50/30">
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center mx-auto shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold">Hoàn thành!</h3>
              <p className="text-sm text-foreground/60">
                Đúng <strong className={cn(correctCount === totalQuestions ? 'text-emerald-500' : 'text-violet-500')}>{correctCount}</strong>/{totalQuestions} câu
              </p>
              <Progress value={(correctCount / totalQuestions) * 100} className="h-2 max-w-xs mx-auto" />

              <div className="space-y-2 max-w-sm mx-auto text-left">
                {questions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-white/70">
                    {answers[i] === q.correct_answer ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    )}
                    <span className="truncate flex-1">{q.question.replace(/_{2,}/g, '___')}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-center pt-2">
                <Button onClick={handleRestart} variant="outline" size="sm" className="rounded-full">
                  Chọn cấu trúc khác
                </Button>
                <Button
                  onClick={() => generateQuiz()}
                  size="sm"
                  className="rounded-full gap-1.5 bg-violet-500 hover:bg-violet-600"
                >
                  <RotateCcw className="h-3 w-3" /> Làm lại
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Progress indicator during quiz */}
      {!isComplete && totalQuestions > 0 && answeredCount > 0 && answeredCount < totalQuestions && (
        <div className="flex justify-center gap-1">
          {questions.map((q, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === currentIndex ? 'w-6 bg-violet-500' : 'w-2',
                answers[i] !== undefined
                  ? answers[i] === q.correct_answer ? 'bg-emerald-400' : 'bg-rose-400'
                  : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default GrammarQuizDrills;
