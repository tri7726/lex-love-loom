import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Timer, Trophy, Flame, RotateCcw, ChevronLeft, Sparkles,
  Star, Heart, HeartOff, Shield, Volume2, BookOpen, ArrowRight, Eye
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VocabularyItem } from '@/types/vocabulary';

type GameMode = 'kanji-meaning' | 'meaning-kanji' | 'kanji-reading' | 'audio-meaning';

interface SpeedGameProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number; score: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

interface Question {
  word: VocabularyItem;
  prompt: string;       // what to show on the card
  promptLabel: string;  // label above prompt
  options: string[];
  correctIndex: number;
}

const INITIAL_TIME = 6;
const MIN_TIME = 2;
const STREAK_PER_TIER = 3;      // every 3 correct in a row → reduce timer
const TIME_REDUCTION = 0.5;     // reduce by 0.5s per tier
const SHIELD_THRESHOLD = 5;     // combo to earn a shield
const MAX_SHIELDS = 2;
const MAX_QUESTIONS = 15;

const MODES: { id: GameMode; title: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'kanji-meaning', title: 'Kanji → Nghĩa',    desc: 'Nhìn chữ Kanji, chọn nghĩa tiếng Việt',   icon: BookOpen },
  { id: 'meaning-kanji', title: 'Nghĩa → Kanji',    desc: 'Đọc nghĩa tiếng Việt, chọn đúng Kanji',   icon: Eye },
  { id: 'kanji-reading', title: 'Kanji → Furigana', desc: 'Nhìn chữ Hán, chọn cách đọc Hiragana',    icon: Zap },
  { id: 'audio-meaning', title: '🎧 Nghe → Nghĩa',  desc: 'Nghe phát âm, chọn nghĩa tiếng Việt',     icon: Volume2 },
];

// ── Text-to-Speech helper ─────────────────────────────────────────────────
function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.85;
  speechSynthesis.speak(u);
}

function buildQuestions(vocabulary: VocabularyItem[], mode: GameMode): Question[] {
  const pool = vocabulary.filter(v => {
    if (mode === 'kanji-reading') return v.word && v.reading;
    if (mode === 'meaning-kanji' || mode === 'kanji-meaning' || mode === 'audio-meaning') return v.word && v.meaning;
    return true;
  });

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const gameWords = shuffled.slice(0, Math.min(MAX_QUESTIONS, pool.length));

  return gameWords.map((word): Question => {
    let prompt = '';
    let promptLabel = '';
    let correctAnswer = '';
    let distractorPool: string[] = [];

    switch (mode) {
      case 'kanji-meaning':
        prompt = word.word;
        promptLabel = 'Từ này có nghĩa là gì?';
        correctAnswer = word.meaning;
        distractorPool = pool.filter(v => v.id !== word.id).map(v => v.meaning);
        break;
      case 'meaning-kanji':
        prompt = word.meaning;
        promptLabel = 'Chọn từ tiếng Nhật đúng:';
        correctAnswer = word.word;
        distractorPool = pool.filter(v => v.id !== word.id).map(v => v.word);
        break;
      case 'kanji-reading':
        prompt = word.word;
        promptLabel = 'Cách đọc là gì?';
        correctAnswer = word.reading ?? '';
        distractorPool = pool.filter(v => v.id !== word.id && v.reading).map(v => v.reading as string);
        break;
      case 'audio-meaning':
        prompt = ''; // TTS plays audio
        promptLabel = 'Từ vừa nghe có nghĩa là gì?';
        correctAnswer = word.meaning;
        distractorPool = pool.filter(v => v.id !== word.id).map(v => v.meaning);
        break;
    }

    const distractors = [...new Set(distractorPool)]
      .sort(() => Math.random() - 0.5)
      .filter(d => d && d !== correctAnswer)
      .slice(0, 3);

    // Pad with placeholder if not enough distractors
    while (distractors.length < 3) distractors.push(`—`);

    const options = [...distractors, correctAnswer].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(correctAnswer);

    return { word, prompt, promptLabel, options, correctIndex };
  });
}

// ── ModeSelect Screen ─────────────────────────────────────────────────────
const ModeSelect: React.FC<{ onSelect: (m: GameMode) => void; onBack: () => void }> = ({ onSelect, onBack }) => (
  <div className="max-w-2xl mx-auto space-y-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="text-center space-y-3">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-[2rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50">
        <Zap className="h-8 w-8 text-sakura" />
      </div>
      <h2 className="text-4xl font-display font-black text-slate-800 tracking-tight">Speed Quiz</h2>
      <p className="text-slate-400 text-sm font-medium">Chọn chế độ thi đấu</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className="group relative p-7 rounded-[2.5rem] bg-white border border-slate-100 hover:border-sakura/30 transition-all hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] text-left space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-sakura/10 transition-all">
            <m.icon className="h-6 w-6 text-slate-300 group-hover:text-sakura transition-colors" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-slate-800 group-hover:text-sakura transition-colors">{m.title}</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1 leading-relaxed">{m.desc}</p>
          </div>
          <ArrowRight className="absolute right-6 bottom-6 h-5 w-5 text-slate-100 group-hover:text-sakura group-hover:translate-x-1 transition-all" />
        </button>
      ))}
    </div>

    <div className="flex justify-center">
      <Button variant="ghost" onClick={onBack} className="rounded-full gap-2 text-slate-300 hover:text-sakura">
        <ChevronLeft className="h-4 w-4" /> Quay lại thư viện
      </Button>
    </div>
  </div>
);

// ── Main SpeedGame ────────────────────────────────────────────────────────
export const SpeedGame: React.FC<SpeedGameProps> = ({ vocabulary, onComplete, onUpdateMastery, onBack }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [shields, setShields] = useState(0);
  const [shieldUsed, setShieldUsed] = useState(false); // flash animation trigger

  const shieldEarnedRef = useRef(false);

  const questions = useMemo(() => selectedMode ? buildQuestions(vocabulary, selectedMode) : [], [vocabulary, selectedMode]);
  const currentQuestion = questions[currentIndex];

  // Adaptive timer: reduce by tier based on current combo
  const currentMaxTime = useMemo(() => {
    const tier = Math.floor(combo / STREAK_PER_TIER);
    return Math.max(MIN_TIME, INITIAL_TIME - tier * TIME_REDUCTION);
  }, [combo]);

  // Play TTS for audio mode
  useEffect(() => {
    if (selectedMode === 'audio-meaning' && currentQuestion && !showFeedback && !gameComplete) {
      speak(currentQuestion.word.word);
    }
  }, [currentIndex, selectedMode, currentQuestion, showFeedback, gameComplete]);

  const handleAnswer = useCallback((index: number) => {
    if (showFeedback || !currentQuestion) return;

    setSelectedAnswer(index);
    setShowFeedback(true);

    const isCorrect = index === currentQuestion.correctIndex;

    if (isCorrect) {
      const timeBonus = Math.ceil(timeLeft * 3);
      const newCombo = combo + 1;
      const comboBonus = newCombo > 1 ? newCombo * 5 : 0;
      const modeBonus = selectedMode === 'audio-meaning' || selectedMode === 'kanji-reading' ? 5 : 0;
      const points = 10 + timeBonus + comboBonus + modeBonus;

      setScore(prev => prev + points);
      setCombo(newCombo);
      setMaxCombo(max => Math.max(max, newCombo));
      setCorrectCount(prev => prev + 1);

      // Shield reward at threshold
      if (newCombo % SHIELD_THRESHOLD === 0 && shields < MAX_SHIELDS && !shieldEarnedRef.current) {
        setShields(prev => Math.min(prev + 1, MAX_SHIELDS));
        shieldEarnedRef.current = true;
        setTimeout(() => { shieldEarnedRef.current = false; }, 100);
      }
    } else {
      if (shields > 0) {
        // Consume shield — don't lose a life
        setShields(prev => prev - 1);
        setShieldUsed(true);
        setTimeout(() => setShieldUsed(false), 800);
      } else {
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) setTimeout(() => setGameComplete(true), 700);
          return next;
        });
      }
      setCombo(0);
    }

    onUpdateMastery(currentQuestion.word.id, isCorrect);

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        setTimeLeft(currentMaxTime);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        setGameComplete(true);
        onComplete({
          correct: correctCount + (isCorrect ? 1 : 0),
          total: questions.length,
          score: score + (isCorrect ? 10 : 0),
        });
      }
    }, 700);
  }, [
    showFeedback, currentQuestion, timeLeft, combo, shields,
    selectedMode, currentIndex, questions.length, correctCount,
    score, currentMaxTime, onUpdateMastery, onComplete
  ]);

  // Countdown timer
  useEffect(() => {
    if (!selectedMode || gameComplete || showFeedback) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          handleAnswer(-1); // timeout = wrong
          return currentMaxTime;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);
    return () => clearInterval(timer);
  }, [currentIndex, showFeedback, gameComplete, selectedMode, handleAnswer, currentMaxTime]);

  // Reset on mode select
  const startGame = (mode: GameMode) => {
    setSelectedMode(mode);
    setCurrentIndex(0); setScore(0); setCombo(0); setMaxCombo(0);
    setTimeLeft(INITIAL_TIME); setSelectedAnswer(null); setShowFeedback(false);
    setGameComplete(false); setCorrectCount(0); setLives(3); setShields(0);
  };

  const restart = () => {
    setSelectedMode(null);
  };

  // ── Mode Selection ──────────────────────────────────────────────────────
  if (!selectedMode) return <ModeSelect onSelect={startGame} onBack={onBack} />;

  // ── Results ─────────────────────────────────────────────────────────────
  if (gameComplete) {
    const percentage = Math.round((correctCount / questions.length) * 100);
    const stars = percentage >= 90 ? 3 : percentage >= 65 ? 2 : 1;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
        <Card className="border-0 shadow-2xl overflow-hidden rounded-[3rem] bg-white">
          <div className="h-2 bg-gradient-to-r from-sakura to-rose-300" />
          <CardContent className="space-y-8 p-10">
            <div className="text-center relative">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-7xl font-display font-black text-sakura">
                {score.toLocaleString()}
              </motion.div>
              <p className="text-slate-400 font-black tracking-widest uppercase text-[10px] mt-2">Tổng điểm</p>
              <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-amber-200 animate-pulse" />
            </div>

            <div className="flex justify-center gap-3">
              {[...Array(3)].map((_, i) => (
                <motion.div key={i} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: i * 0.15, type: 'spring' }}>
                  <Star className={cn('h-10 w-10', i < stars ? 'text-amber-400 fill-amber-400' : 'text-slate-100')} />
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Chính xác', val: `${percentage}%` },
                { label: 'Max Combo', val: `${maxCombo}x` },
                { label: 'Đúng / Tổng', val: `${correctCount}/${questions.length}` },
                { label: 'Chế độ', val: MODES.find(m => m.id === selectedMode)?.title.split(' ')[0] ?? '' },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-2xl font-bold text-slate-800">{s.val}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={restart} className="w-full bg-slate-900 text-white rounded-[1.5rem] py-5 text-lg font-bold shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
                <RotateCcw className="h-5 w-5" /> Chơi lại
              </button>
              <Button variant="ghost" onClick={onBack} className="w-full text-slate-400 hover:text-sakura rounded-2xl">Quay lại danh sách</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!currentQuestion) return null;

  const timePercent = (timeLeft / currentMaxTime) * 100;
  const isLowTime = timeLeft <= 1.5;
  const isAudio = selectedMode === 'audio-meaning';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-5">
          {/* Score */}
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <span className="text-2xl font-black text-slate-800 tracking-tighter">{score.toLocaleString()}</span>
          </div>
          {/* Lives */}
          <div className="flex items-center gap-1">
            {[...Array(3)].map((_, i) => (
              <motion.div key={i} animate={{ scale: i < lives ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>
                {i < lives ? <Heart className="h-5 w-5 text-sakura fill-sakura" /> : <HeartOff className="h-5 w-5 text-slate-200" />}
              </motion.div>
            ))}
          </div>
          {/* Shields */}
          <AnimatePresence>
            {shields > 0 && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: shieldUsed ? [1, 1.5, 1] : 1 }} exit={{ scale: 0 }}
                className={cn('flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border', shieldUsed ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400')}
              >
                <Shield className="h-3.5 w-3.5" />×{shields}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Combo */}
          <AnimatePresence>
            {combo > 1 && (
              <motion.div initial={{ scale: 0, x: -10 }} animate={{ scale: 1, x: 0 }} exit={{ scale: 0 }}
                className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-orange-100 shadow-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-black text-xs text-orange-600 italic">{combo}x</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timer */}
        <div className={cn('flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm bg-white transition-all', isLowTime ? 'border-red-200 text-red-500' : 'border-slate-50 text-slate-400')}>
          <Timer className={cn('h-4 w-4', isLowTime && 'animate-pulse')} />
          <span className="font-mono font-bold text-base">{timeLeft.toFixed(1)}s</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full transition-colors', isLowTime ? 'bg-gradient-to-r from-red-400 to-rose-500' : 'bg-gradient-to-r from-sakura to-rose-400')}
          style={{ width: `${timePercent}%` }}
        />
      </div>

      {/* Question Card */}
      <motion.div key={currentIndex} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.04)] rounded-[3.5rem] bg-white overflow-hidden border border-slate-50">
          <div className="absolute top-6 right-8">
            <Badge variant="outline" className="text-slate-200 border-slate-50 bg-white/50 text-[9px] font-black uppercase tracking-widest">
              {currentIndex + 1} / {questions.length}
            </Badge>
          </div>
          <CardContent className="py-16 text-center space-y-4">
            <p className="text-[10px] text-slate-300 uppercase tracking-widest font-black">{currentQuestion.promptLabel}</p>
            {isAudio ? (
              <button
                onClick={() => speak(currentQuestion.word.word)}
                className="mx-auto flex flex-col items-center gap-3 group"
              >
                <div className="w-20 h-20 rounded-full bg-sakura/10 flex items-center justify-center group-hover:bg-sakura/20 transition-all shadow-inner">
                  <Volume2 className="h-9 w-9 text-sakura" />
                </div>
                <p className="text-xs text-slate-300 font-medium">Nhấn để nghe lại</p>
              </button>
            ) : (
              <p className={cn(
                'font-black text-slate-800 tracking-tight transition-all',
                currentQuestion.prompt.length > 15 ? 'text-2xl' : currentQuestion.prompt.length > 5 ? 'text-4xl' : 'text-6xl font-jp'
              )}>
                {currentQuestion.prompt}
              </p>
            )}
            {showFeedback && currentQuestion.word.reading && selectedMode !== 'kanji-reading' && (
              <p className="text-xl text-sakura font-jp font-medium tracking-wide">{currentQuestion.word.reading}</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correctIndex;
          const showCorrect = showFeedback && isCorrect;
          const showWrong = showFeedback && isSelected && !isCorrect;

          return (
            <motion.div key={index} whileHover={!showFeedback ? { y: -3 } : {}} whileTap={!showFeedback ? { scale: 0.98 } : {}}>
              <button
                className={cn(
                  'w-full py-8 h-auto rounded-[2.2rem] border transition-all duration-300 font-medium relative overflow-hidden px-5 text-center leading-relaxed',
                  !showFeedback && 'bg-white/80 border-slate-100 text-slate-700 hover:border-sakura/20 hover:bg-white hover:shadow-xl',
                  showCorrect && 'bg-emerald-50 border-emerald-200 text-emerald-700 font-black ring-1 ring-emerald-100',
                  showWrong && 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-100',
                  showFeedback && !showCorrect && !showWrong && 'opacity-30',
                  option.length > 15 ? 'text-sm' : option.length > 8 ? 'text-base font-jp' : 'text-2xl font-jp'
                )}
                onClick={() => handleAnswer(index)}
                disabled={showFeedback}
              >
                {option}
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center pt-4">
        <Button variant="ghost" onClick={() => { if (window.confirm('Thoát game?')) onBack(); }}
          className="text-slate-200 gap-2 hover:text-sakura rounded-full font-bold px-8">
          <ChevronLeft className="h-4 w-4" /> Dừng trò chơi
        </Button>
      </div>
    </div>
  );
};
