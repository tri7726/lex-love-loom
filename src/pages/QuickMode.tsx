import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Timer, CheckCircle2, XCircle, ArrowRight,
  Trophy, Brain, BookOpen, Volume2, ChevronLeft, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useXP } from '@/hooks/useXP';
import { useNavigate } from 'react-router-dom';
import { MINNA_N5_VOCAB } from '@/data/minna-n5';

const TOTAL_QUESTIONS = 5;
const TIME_PER_QUESTION = 12; // seconds
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

type QuestionType = 'vocab-meaning' | 'vocab-reading' | 'kanji-reading';

interface QuickQuestion {
  type: QuestionType;
  prompt: string;
  promptFurigana?: string;
  promptLabel: string;
  options: string[];
  correctIndex: number;
  word: string;
}

// Build a pool of questions from multiple sources
function buildQuestionPool(flashcards: any[], size = TOTAL_QUESTIONS): QuickQuestion[] {
  const vocabPool = MINNA_N5_VOCAB.flat().filter(v => v.word && v.meaning);
  const allSources = [...(flashcards || []), ...vocabPool];

  if (allSources.length < 4) return [];

  const shuffled = [...allSources].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, size);

  const types: QuestionType[] = ['vocab-meaning', 'vocab-reading', 'vocab-meaning', 'vocab-reading', 'vocab-meaning'];

  return selected.map((item, i): QuickQuestion => {
    const type = types[i % types.length];
    const distractors = allSources
      .filter((v) => v.word !== item.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    if (type === 'vocab-reading') {
      const correct = item.reading || item.furigana || '';
      const wrongs = distractors.map((d) => d.reading || d.furigana || d.word);
      const options = [...wrongs, correct].sort(() => Math.random() - 0.5);
      return {
        type,
        prompt: item.word,
        promptLabel: 'Cách đọc của từ này là?',
        options,
        correctIndex: options.indexOf(correct),
        word: item.word,
      };
    } else {
      const correct = item.meaning;
      const wrongs = distractors.map((d) => d.meaning);
      const options = [...wrongs, correct].sort(() => Math.random() - 0.5);
      return {
        type,
        prompt: item.word,
        promptFurigana: item.reading || item.furigana,
        promptLabel: 'Từ này có nghĩa là?',
        options,
        correctIndex: options.indexOf(correct),
        word: item.word,
      };
    }
  });
}

export const QuickMode: React.FC = () => {
  const { user } = useAuth();
  const { awardXP } = useXP();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'loading' | 'ready' | 'playing' | 'done'>('loading');
  const [questions, setQuestions] = useState<QuickQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [streak, setStreak] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);

  // Load flashcards due for review
  useEffect(() => {
    const load = async () => {
      let flashcards: any[] = [];
      if (user) {
        const { data } = await (supabase as any)
          .from('flashcards')
          .select('word, reading, meaning')
          .eq('user_id', user.id)
          .lte('next_review_date', new Date().toISOString())
          .limit(10);
        flashcards = data || [];
      }
      const qs = buildQuestionPool(flashcards, TOTAL_QUESTIONS);
      setQuestions(qs);
      setPhase('ready');
    };
    load();
  }, [user]);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP'; u.rate = 0.8;
      speechSynthesis.speak(u);
    }
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || answered) return;
    if (timeLeft <= 0) {
      handleAnswer(-1); // timeout
      return;
    }
    const t = setTimeout(() => setTimeLeft(p => p - 0.1), 100);
    return () => clearTimeout(t);
  }, [phase, answered, timeLeft]);

  const handleAnswer = useCallback((idx: number) => {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);

    const q = questions[currentIdx];
    const isCorrect = idx === q?.correctIndex;
    if (isCorrect) {
      setCorrectCount(p => p + 1);
      setStreak(p => p + 1);
      speak(q.word);
    } else {
      setStreak(0);
    }
    setResults(p => [...p, isCorrect]);
  }, [answered, questions, currentIdx, speak]);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= TOTAL_QUESTIONS) {
      // Done
      const total = correctCount + (selectedIdx === questions[currentIdx]?.correctIndex ? 1 : 0);
      // Award XP
      const xp = total * 10;
      if (user) awardXP('quiz', xp);
      setPhase('done');
    } else {
      setCurrentIdx(p => p + 1);
      setSelectedIdx(null);
      setAnswered(false);
      setTimeLeft(TIME_PER_QUESTION);
    }
  }, [currentIdx, correctCount, selectedIdx, questions, user, awardXP]);

  const restart = () => {
    setCurrentIdx(0);
    setSelectedIdx(null);
    setAnswered(false);
    setCorrectCount(0);
    setStreak(0);
    setResults([]);
    setTimeLeft(TIME_PER_QUESTION);
    const qs = buildQuestionPool([], TOTAL_QUESTIONS);
    setQuestions(qs);
    setPhase('playing');
  };

  // ── Loading ──
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50/30 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Zap className="h-8 w-8 text-sakura" />
        </motion.div>
      </div>
    );
  }

  // ── Ready screen ──
  if (phase === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50/30 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center space-y-8"
        >
          {/* Icon */}
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-sakura to-pink-400 flex items-center justify-center mx-auto shadow-2xl shadow-sakura/30">
              <Zap className="h-12 w-12 text-white" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-2 -right-2 bg-amber-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full"
            >
              {TOTAL_QUESTIONS} câu
            </motion.div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-800">Quick 5</h1>
            <p className="text-slate-500 font-medium">
              {TOTAL_QUESTIONS} câu hỏi · ~3 phút · Xen kẽ từ vựng + Kanji
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: <Timer className="h-4 w-4" />, label: `${TIME_PER_QUESTION}s / câu`, color: 'text-indigo-500' },
              { icon: <Brain className="h-4 w-4" />, label: 'Thông minh', color: 'text-sakura' },
              { icon: <Trophy className="h-4 w-4" />, label: 'Nhận XP', color: 'text-amber-500' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                <div className={cn('mx-auto mb-1', item.color)}>{item.icon}</div>
                <p className="text-[10px] font-bold text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setPhase('playing')}
              className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-sakura to-pink-400 text-white font-black text-lg shadow-xl shadow-sakura/30 hover:shadow-sakura/50 transition-all active:scale-95"
            >
              Bắt đầu ngay! ⚡
            </button>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="w-full text-slate-400 hover:text-sakura gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Quay lại
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Done screen ──
  if (phase === 'done') {
    const finalCorrect = results.filter(Boolean).length;
    const pct = Math.round((finalCorrect / TOTAL_QUESTIONS) * 100);
    const xpEarned = finalCorrect * 10;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50/30 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full space-y-6"
        >
          {/* Score card */}
          <div className="bg-white rounded-[2.5rem] p-8 text-center shadow-xl border border-slate-50 space-y-4">
            <Trophy className="h-10 w-10 text-amber-400 mx-auto" />
            <div>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-6xl font-black text-sakura"
              >
                {pct}%
              </motion.p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Chính xác</p>
            </div>

            <div className="flex justify-center gap-2">
              {results.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  {r
                    ? <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    : <XCircle className="h-6 w-6 text-red-400" />
                  }
                </motion.div>
              ))}
            </div>

            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
              <p className="text-sm font-black text-amber-600">+{xpEarned} XP 🎉</p>
              <p className="text-[10px] text-amber-500">{finalCorrect}/{TOTAL_QUESTIONS} câu đúng</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={restart}
              className="w-full py-4 rounded-[2rem] bg-gradient-to-r from-sakura to-pink-400 text-white font-black shadow-lg active:scale-95 transition-all"
            >
              Chơi lại ⚡
            </button>
            <Button variant="ghost" onClick={() => navigate('/')} className="w-full text-slate-400 gap-2">
              <ChevronLeft className="h-4 w-4" /> Về Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Playing ──
  const q = questions[currentIdx];
  if (!q) return null;
  const progress = ((currentIdx) / TOTAL_QUESTIONS) * 100;
  const timerPct = (timeLeft / TIME_PER_QUESTION) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50/20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-400 gap-1 hover:text-sakura">
            <ChevronLeft className="h-4 w-4" /> Thoát
          </Button>

          <div className="flex items-center gap-3">
            {streak >= 2 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-amber-500 text-xs font-black"
              >
                <Flame className="h-4 w-4" /> {streak}
              </motion.div>
            )}
            <Badge variant="outline" className="text-sakura border-sakura/20 font-black text-xs">
              {currentIdx + 1} / {TOTAL_QUESTIONS}
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-sakura to-pink-300"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {/* Timer bar */}
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full transition-colors',
                timerPct > 50 ? 'bg-emerald-400' : timerPct > 25 ? 'bg-amber-400' : 'bg-red-400'
              )}
              animate={{ width: `${timerPct}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-white rounded-[2.5rem] p-8 text-center shadow-xl border border-slate-50 space-y-4"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <BookOpen className="h-3 w-3 text-sakura/60" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{q.promptLabel}</span>
            </div>

            <div className="space-y-1">
              <p className="text-5xl font-jp font-black text-slate-800 tracking-tight">{q.prompt}</p>
              {q.promptFurigana && (
                <p className="text-lg font-jp text-sakura/70">{q.promptFurigana}</p>
              )}
            </div>

            <button
              onClick={() => speak(q.word)}
              className="mx-auto flex items-center gap-1.5 text-[10px] font-black text-sakura/60 hover:text-sakura uppercase tracking-widest"
            >
              <Volume2 className="h-3 w-3" /> Nghe
            </button>
          </motion.div>
        </AnimatePresence>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isSelected = selectedIdx === i;
            const isCorrect = i === q.correctIndex;
            let bg = 'bg-white border-slate-100 hover:border-sakura/30 hover:bg-sakura/5';
            let labelBg = 'bg-slate-50 text-slate-400';

            if (answered) {
              if (isCorrect) { bg = 'bg-emerald-50 border-emerald-300 text-emerald-800'; labelBg = 'bg-emerald-500 text-white'; }
              else if (isSelected) { bg = 'bg-red-50 border-red-300 text-red-700'; labelBg = 'bg-red-500 text-white'; }
              else { bg = 'bg-white border-slate-100 opacity-40'; }
            }

            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                disabled={answered}
                onClick={() => handleAnswer(i)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left',
                  bg
                )}
              >
                <span className={cn(
                  'w-7 h-7 rounded-xl text-[10px] font-black flex items-center justify-center flex-shrink-0',
                  labelBg
                )}>
                  {OPTION_LABELS[i]}
                </span>
                <span className="text-sm font-semibold text-slate-700 flex-1 leading-snug">{opt}</span>
                {answered && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                {answered && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
              </motion.button>
            );
          })}
        </div>

        {/* Next button */}
        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <button
                onClick={handleNext}
                className="w-full py-4 rounded-[2rem] bg-slate-900 text-white font-black flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95 shadow-xl"
              >
                {currentIdx + 1 >= TOTAL_QUESTIONS ? 'Xem kết quả' : 'Câu tiếp theo'}
                <ArrowRight className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default QuickMode;
