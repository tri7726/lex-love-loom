import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { EvolvedSkill, QuestQuestion, SkillJLPTLevel } from '@/hooks/useEvolvedSkills';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  X, CheckCircle2, XCircle, Sparkles, Trophy, Target, ChevronRight,
  RotateCcw, BookA, Mic, GripVertical, MessageSquareText,
  ArrowLeftRight, Sigma, Layers
} from 'lucide-react';

interface SkillQuestPlayerProps {
  skill: EvolvedSkill;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (skillId: string, score: number) => Promise<number>;
}

const PASS_THRESHOLD = 0.3;
const FULL_XP_THRESHOLD = 0.7;

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2, master: 3 };
const QUEST_TYPE_CONFIG = {
  'multiple-choice': { icon: Layers, label: 'Trắc nghiệm', color: 'text-blue-500', bg: 'bg-blue-100' },
  'particle-fill': { icon: Sigma, label: 'Trợ từ', color: 'text-purple-500', bg: 'bg-purple-100' },
  'translation': { icon: ArrowLeftRight, label: 'Dịch thuật', color: 'text-emerald-500', bg: 'bg-emerald-100' },
  'word-distinction': { icon: MessageSquareText, label: 'Phân biệt từ', color: 'text-orange-500', bg: 'bg-orange-100' },
};

const JLPT_BADGE: Record<SkillJLPTLevel, { label: string; color: string }> = {
  N5: { label: 'N5', color: 'bg-green-100 text-green-700 border-green-200' },
  N4: { label: 'N4', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  N3: { label: 'N3', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  N2: { label: 'N2', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  N1: { label: 'N1', color: 'bg-rose-100 text-rose-700 border-rose-200' },
};

/* ── Helper: render option letter ─────────────────────────── */
function optionLetter(i: number) { return String.fromCharCode(65 + i); }

/* ── Sub-component: Particle Fill ─────────────────────────── */
const ParticleFillRenderer: React.FC<{
  question: QuestQuestion;
  isAnswered: boolean;
  selectedIdx: number | null;
  correctIdx: number | null;
  onSelect: (idx: number) => void;
}> = ({ question, isAnswered, selectedIdx, correctIdx, onSelect }) => {
  const parts = question.question.split('___');
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xl md:text-2xl font-bold text-foreground leading-relaxed font-jp">
          {parts[0]}<span className="text-sakura font-black underline decoration-wavy decoration-sakura/30">___</span>{parts[1] || ''}
        </p>
      </div>
      <div className="flex justify-center gap-3 flex-wrap">
        {question.options.map((opt, idx) => {
          const isCorrect = idx === correctIdx;
          let variant = 'bg-white/60 border-border/30 hover:border-purple-300 hover:bg-purple-50';
          let icon = null;
          if (isAnswered) {
            if (isCorrect) { variant = 'bg-purple-100 border-purple-400 shadow-md'; icon = <CheckCircle2 className="h-4 w-4 text-purple-600" />; }
            else if (idx === selectedIdx) { variant = 'bg-rose-100 border-rose-400'; icon = <XCircle className="h-4 w-4 text-rose-500" />; }
            else { variant = 'bg-white/30 border-border/10 opacity-40'; }
          }
          return (
            <button key={idx} onClick={() => onSelect(idx)} disabled={isAnswered}
              className={cn(
                'relative px-6 py-4 rounded-2xl border-2 text-2xl font-bold font-jp transition-all duration-200 min-w-[60px]',
                variant
              )}
            >
              {icon && <span className="absolute -top-2 -right-2">{icon}</span>}
              {opt}
            </button>
          );
        })}
      </div>
      {isAnswered && (
        <p className="text-center text-sm text-muted-foreground italic">
          Đáp án đúng: <strong className="text-foreground not-italic font-jp">{question.correct_answer}</strong>
        </p>
      )}
    </div>
  );
};

/* ── Sub-component: Translation ───────────────────────────── */
const TranslationRenderer: React.FC<{
  question: QuestQuestion;
  isAnswered: boolean;
  selectedIdx: number | null;
  correctIdx: number | null;
  onSelect: (idx: number) => void;
}> = ({ question, isAnswered, correctIdx, onSelect }) => (
  <div className="space-y-6">
    <div className="text-center p-6 rounded-2xl bg-white/60 border border-border/20">
      <p className="text-2xl font-jp font-bold text-foreground leading-relaxed">{question.question}</p>
    </div>
    <div className="space-y-2">
      {question.options.map((opt, idx) => {
        const isCorrect = idx === correctIdx;
        let variant = 'border-border/30 bg-white/50 hover:border-emerald-300 hover:bg-emerald-50/50';
        if (isAnswered) {
          if (isCorrect) variant = 'border-emerald-400 bg-emerald-50 shadow-sm';
          else variant = 'border-border/10 bg-white/20 opacity-40';
        }
        return (
          <button key={idx} onClick={() => onSelect(idx)} disabled={isAnswered}
            className={cn('w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4', variant)}
          >
            <span className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
              isAnswered && isCorrect ? 'bg-emerald-500 text-white' : 'bg-muted/50 text-muted-foreground'
            )}>
              {isAnswered && isCorrect ? <CheckCircle2 className="h-4 w-4" /> : optionLetter(idx)}
            </span>
            <span className={cn('flex-1 text-sm', isAnswered && isCorrect && 'text-emerald-800')}>{opt}</span>
          </button>
        );
      })}
    </div>
    {isAnswered && question.nuance && (
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Phân tích sắc thái</p>
        <p className="text-amber-800 leading-relaxed">{question.nuance}</p>
      </div>
    )}
  </div>
);

/* ── Sub-component: Word Distinction ──────────────────────── */
const WordDistinctionRenderer: React.FC<{
  question: QuestQuestion;
  isAnswered: boolean;
  selectedIdx: number | null;
  correctIdx: number | null;
  onSelect: (idx: number) => void;
}> = ({ question, isAnswered, correctIdx, onSelect }) => (
  <div className="space-y-6">
    <div className="text-center">
      <p className="text-xl md:text-2xl font-bold text-foreground leading-relaxed">{question.question}</p>
    </div>
    <div className="space-y-2">
      {question.options.map((opt, idx) => {
        const isCorrect = idx === correctIdx;
        let variant = 'border-border/30 bg-white/50 hover:border-orange-300 hover:bg-orange-50/50';
        if (isAnswered) {
          if (isCorrect) variant = 'border-orange-400 bg-orange-50 shadow-sm';
          else variant = 'border-border/10 bg-white/20 opacity-40';
        }
        return (
          <button key={idx} onClick={() => onSelect(idx)} disabled={isAnswered}
            className={cn('w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4', variant)}
          >
            <span className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
              isAnswered && isCorrect ? 'bg-orange-500 text-white' : 'bg-muted/50 text-muted-foreground'
            )}>
              {isAnswered && isCorrect ? <CheckCircle2 className="h-4 w-4" /> : optionLetter(idx)}
            </span>
            <span className={cn('flex-1 text-sm font-medium', isAnswered && isCorrect && 'text-orange-800')}>{opt}</span>
          </button>
        );
      })}
    </div>
    {isAnswered && question.word_compare && question.word_compare.length > 0 && (
      <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 text-sm space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">So sánh từ</p>
        {question.word_compare.map((w, i) => (
          <div key={i} className="flex items-start gap-2 text-orange-800">
            <span className="font-bold font-jp shrink-0">{w.word}</span>
            <span className="text-orange-600">— {w.meaning}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ── Main component ───────────────────────────────────────── */
export const SkillQuestPlayer: React.FC<SkillQuestPlayerProps> = ({
  skill, isOpen, onClose, onComplete,
}) => {
  const questions = useMemo(() => {
    const qs = skill.challenge_data?.questions || [];
    // Sort by difficulty: easy → medium → hard → master
    return [...qs].sort((a, b) =>
      (DIFFICULTY_ORDER[a.difficulty] ?? 1) - (DIFFICULTY_ORDER[b.difficulty] ?? 1)
    );
  }, [skill.challenge_data?.questions]);

  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(new Array(questions.length).fill(false));
  const [questionResults, setQuestionResults] = useState<(boolean | null)[]>(new Array(questions.length).fill(null));
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [autoTransitioning, setAutoTransitioning] = useState(false);

  const currentQuestion = questions[currentQ];
  const isAnswered = answeredQuestions[currentQ];
  const correctAnswerIndex = currentQuestion
    ? (() => {
        // Exact match first
        const exact = currentQuestion.options.indexOf(currentQuestion.correct_answer);
        if (exact !== -1) return exact;
        // Fuzzy: strip leading "A. " / "A) " prefixes, trim whitespace
        const normalize = (s: string) => s.replace(/^[A-D][.、)）]\s*/, '').trim();
        const normalizedCorrect = normalize(currentQuestion.correct_answer);
        return currentQuestion.options.findIndex(o => normalize(o) === normalizedCorrect);
      })()
    : null;

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentQ(0);
      setSelectedAnswer(null);
      setAnsweredQuestions(new Array(questions.length).fill(false));
      setQuestionResults(new Array(questions.length).fill(null));
      setCorrectCount(0);
      setIsComplete(false);
      setXpEarned(0);
      setAutoTransitioning(false);
    }
  }, [isOpen, questions.length]);

  const scorePct = questions.length > 0 ? correctCount / questions.length : 0;

  // Auto-complete after last question answered
  useEffect(() => {
    if (isAnswered && currentQ === questions.length - 1 && !autoTransitioning && questions.length > 0) {
      setAutoTransitioning(true);
      const timer = setTimeout(async () => {
        setIsCompleting(true);
        const xp = await onComplete(skill.id, Math.round(scorePct * 100));
        setXpEarned(xp);
        setIsCompleting(false);
        setIsComplete(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAnswered, currentQ, questions.length, autoTransitioning, skill.id, scorePct, onComplete]);

  /* ── Actions ──────────────────────────────────────────── */
  const handleSelect = useCallback((idx: number) => {
    if (isAnswered || currentQuestion === undefined) return;
    setSelectedAnswer(idx);
    setAnsweredQuestions(prev => { const n = [...prev]; n[currentQ] = true; return n; });
    const isCorrect = correctAnswerIndex !== null && idx === correctAnswerIndex;
    setQuestionResults(prev => { const n = [...prev]; n[currentQ] = isCorrect; return n; });
    if (isCorrect) setCorrectCount(prev => prev + 1);
  }, [isAnswered, currentQ, currentQuestion, correctAnswerIndex]);

  const handleNext = useCallback(() => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setSelectedAnswer(null);
    }
  }, [currentQ, questions.length]);

  const handleReset = useCallback(() => {
    setCurrentQ(0);
    setSelectedAnswer(null);
    setAnsweredQuestions(new Array(questions.length).fill(false));
    setQuestionResults(new Array(questions.length).fill(null));
    setCorrectCount(0);
    setIsComplete(false);
    setXpEarned(0);
    setAutoTransitioning(false);
  }, [questions.length]);

  /* ── Helpers ───────────────────────────────────────────── */
  const TypeIcon = ({ quest_type }: { quest_type: string }) => {
    const cfg = QUEST_TYPE_CONFIG[quest_type as keyof typeof QUEST_TYPE_CONFIG] || QUEST_TYPE_CONFIG['multiple-choice'];
    return <cfg.icon className="h-5 w-5" />;
  };
  const isPassed = scorePct >= PASS_THRESHOLD;
  const progressPct = ((currentQ + (isComplete ? 1 : isAnswered ? 1 : 0)) / Math.max(questions.length, 1)) * 100;
  const jlptBadge = skill.jlpt_level ? JLPT_BADGE[skill.jlpt_level] : null;

  if (questions.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen p-0 rounded-none border-none bg-cream/95">
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">Không có câu hỏi cho skill này.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen p-0 overflow-hidden rounded-none border-none bg-cream/95 backdrop-blur-xl shadow-2xl">
        <div className="relative h-full flex flex-col">
          <button onClick={onClose}
            className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white hover:shadow-md transition-all"
          ><X className="h-4 w-4" /></button>

          {isComplete ? (
            /* ═══════════════ RESULTS ═══════════════════════ */
            <div className="flex-1 flex items-center justify-center p-8">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-8 max-w-lg w-full"
              >
                <div className={cn('w-28 h-28 rounded-full flex items-center justify-center',
                  scorePct >= FULL_XP_THRESHOLD ? 'bg-emerald-100' : isPassed ? 'bg-amber-100' : 'bg-rose-100'
                )}>
                  {scorePct >= FULL_XP_THRESHOLD ? <Trophy className="h-14 w-14 text-emerald-600" />
                    : <Target className="h-14 w-14 text-amber-600" />}
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black uppercase tracking-widest">
                    {scorePct >= FULL_XP_THRESHOLD ? 'Xuất sắc!' : isPassed ? 'Tạm ổn!' : 'Chưa đạt'}
                  </h2>
                  <p className="text-muted-foreground">{skill.title}</p>
                </div>
                <div className="flex items-center gap-8 text-center">
                  <div><p className="text-4xl font-black">{correctCount}/{questions.length}</p>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Đúng</p></div>
                  <div className="w-px h-12 bg-border" />
                  <div><p className="text-4xl font-black">{Math.round(scorePct * 100)}%</p>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Tỉ lệ</p></div>
                </div>

                {xpEarned > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl"
                  >
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <span className="font-black text-amber-700">+{xpEarned} XP</span>
                    {scorePct >= FULL_XP_THRESHOLD && (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">FULL</span>
                    )}
                  </motion.div>
                )}

                <div className="w-full space-y-2">
                  {questions.map((q, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/60 border border-border/20">
                      <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0',
                        questionResults[idx] === true ? 'bg-emerald-100 text-emerald-600' :
                        questionResults[idx] === false ? 'bg-rose-100 text-rose-600' : 'bg-muted/30 text-muted-foreground'
                      )}>{idx + 1}</span>
                      <span className="flex-1 text-xs truncate text-muted-foreground">{q.question}</span>
                      {questionResults[idx] === true && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                      {questionResults[idx] === false && <XCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  {!isPassed && (
                    <Button variant="outline" onClick={handleReset}
                      className="rounded-xl h-12 px-6 gap-2 border-sakura/20">
                      <RotateCcw className="h-4 w-4" /> Làm lại
                    </Button>
                  )}
                  <Button onClick={onClose}
                    className="rounded-xl h-12 px-8 bg-gradient-to-r from-rose-400 to-pink-400 text-white font-bold">
                    {isPassed ? 'Tuyệt vời!' : 'Đóng'}
                  </Button>
                </div>
              </motion.div>
            </div>
          ) : (
            /* ═══════════════ PLAYING ═══════════════════════ */
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-border/10">
                <div className="max-w-3xl mx-auto w-full space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sakura/10 flex items-center justify-center">
                        <TypeIcon quest_type={currentQuestion?.quest_type || 'multiple-choice'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="font-black text-foreground text-lg">{skill.title}</h1>
                          {jlptBadge && (
                            <Badge variant="outline" className={cn('text-[9px] font-black px-2 py-0 border', jlptBadge.color)}>
                              {jlptBadge.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{skill.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-black text-amber-700">+{skill.xp_reward} XP</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>Tiến độ</span>
                      <span>{currentQ + 1} / {questions.length}</span>
                    </div>
                    <Progress value={progressPct}
                      className="h-2 rounded-full bg-muted/30 [&>div]:bg-gradient-to-r [&>div]:from-rose-400 [&>div]:to-pink-400" />
                  </div>
                  {/* Difficulty + type chips */}
                  <div className="flex gap-2 flex-wrap">
                    {currentQuestion && (
                      <>
                        <span className={cn(
                          'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                          currentQuestion.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          currentQuestion.difficulty === 'medium' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          currentQuestion.difficulty === 'hard' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          'bg-rose-100 text-rose-700 border-rose-200'
                        )}>
                          {currentQuestion.difficulty === 'easy' ? 'Dễ' :
                           currentQuestion.difficulty === 'medium' ? 'TB' :
                           currentQuestion.difficulty === 'hard' ? 'Khó' : 'Thử thách'}
                        </span>
                        {(() => {
                          const cfg = QUEST_TYPE_CONFIG[currentQuestion.quest_type as keyof typeof QUEST_TYPE_CONFIG];
                          return cfg ? (
                            <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1', cfg.color, cfg.bg.replace('bg-', 'border-').replace('-100', '-200').replace('-500', '-200'), 'border')}>
                              <cfg.icon className="h-2.5 w-2.5" /> {cfg.label}
                            </span>
                          ) : null;
                        })()}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Question */}
              <div className="flex-1 flex items-center justify-center p-6 md:p-8 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {currentQuestion && (
                    <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                      className="max-w-2xl w-full space-y-6"
                    >
                      {/* Render based on quest_type */}
                      {currentQuestion.quest_type === 'particle-fill' ? (
                        <ParticleFillRenderer
                          question={currentQuestion}
                          isAnswered={isAnswered}
                          selectedIdx={selectedAnswer}
                          correctIdx={correctAnswerIndex}
                          onSelect={handleSelect}
                        />
                      ) : currentQuestion.quest_type === 'translation' ? (
                        <TranslationRenderer
                          question={currentQuestion}
                          isAnswered={isAnswered}
                          selectedIdx={selectedAnswer}
                          correctIdx={correctAnswerIndex}
                          onSelect={handleSelect}
                        />
                      ) : currentQuestion.quest_type === 'word-distinction' ? (
                        <WordDistinctionRenderer
                          question={currentQuestion}
                          isAnswered={isAnswered}
                          selectedIdx={selectedAnswer}
                          correctIdx={correctAnswerIndex}
                          onSelect={handleSelect}
                        />
                      ) : (
                        /* Default: multiple-choice */
                        <>
                          <div className="text-center space-y-2">
                            <p className="text-[10px] font-black text-sakura/60 uppercase tracking-widest">
                              Câu hỏi {currentQ + 1}
                            </p>
                            <p className="text-xl md:text-2xl font-bold text-foreground leading-relaxed">
                              {currentQuestion.question}
                            </p>
                          </div>
                          <div className="space-y-3">
                            {currentQuestion.options.map((opt, idx) => {
                              const isCorrect = idx === correctAnswerIndex;
                              let v = 'border-border/40 bg-white/60 hover:border-sakura/30 hover:bg-sakura/5 hover:shadow-sm';
                              if (isAnswered) {
                                if (isCorrect) v = 'border-emerald-400 bg-emerald-50 shadow-sm';
                                else if (idx === selectedAnswer) v = 'border-rose-400 bg-rose-50 shadow-sm';
                                else v = 'border-border/20 bg-white/30 opacity-50';
                              }
                              return (
                                <button key={idx} onClick={() => handleSelect(idx)} disabled={isAnswered}
                                  className={cn('w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4', v)}>
                                  <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0',
                                    isAnswered && isCorrect ? 'bg-emerald-500 text-white' :
                                    isAnswered && idx === selectedAnswer && !isCorrect ? 'bg-rose-500 text-white' :
                                    'bg-muted/50 text-muted-foreground'
                                  )}>
                                    {isAnswered && isCorrect ? <CheckCircle2 className="h-5 w-5" /> :
                                     isAnswered && idx === selectedAnswer && !isCorrect ? <XCircle className="h-5 w-5" /> :
                                     optionLetter(idx)}
                                  </span>
                                  <span className={cn('flex-1 text-sm font-medium',
                                    isAnswered && isCorrect ? 'text-emerald-800' :
                                    isAnswered && idx === selectedAnswer && !isCorrect ? 'text-rose-800' : 'text-foreground'
                                  )}>{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {/* Explanation */}
                      {isAnswered && currentQuestion.explanation && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className={cn('p-4 rounded-2xl border text-sm leading-relaxed',
                            selectedAnswer === correctAnswerIndex
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                              : 'bg-amber-50/80 border-amber-200 text-amber-800'
                          )}>
                          <div className="flex items-start gap-2">
                            {selectedAnswer === correctAnswerIndex
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              : <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />}
                            <span>{currentQuestion.explanation}</span>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom bar */}
              <div className="p-6 md:p-8 border-t border-border/10">
                <div className="max-w-3xl mx-auto w-full flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{correctCount}/{questions.length} đúng</span>
                  </div>
                  {isAnswered && currentQ < questions.length - 1 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Button onClick={handleNext}
                        className="rounded-xl h-11 px-8 bg-gradient-to-r from-rose-400 to-pink-400 text-white font-bold gap-2 shadow-md">
                        Tiếp theo <ChevronRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
