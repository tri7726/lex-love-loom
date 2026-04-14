import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, CheckCircle2, XCircle, ArrowRight, Keyboard,
  ChevronLeft, Sparkles, Trophy, RotateCcw, Zap, Flame, Star, Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VocabularyItem } from '@/types/vocabulary';

interface TypingGameProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number; score: number; wpm: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

const MAX_QUESTIONS = 10;
const HINT_PENALTY = 5;

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP'; u.rate = 0.8;
  speechSynthesis.speak(u);
}

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s/g, '');
}

function computeWPM(chars: number, ms: number): number {
  if (ms <= 0) return 0;
  const minutes = ms / 60000;
  return Math.round((chars / 5) / minutes); // standard: 1 word = 5 chars
}

export const TypingGame: React.FC<TypingGameProps> = ({ vocabulary, onComplete, onUpdateMastery, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);   // 0=none, 1=first char, 2=half, 3=almost full (no pts)
  const [hintUsed, setHintUsed] = useState(false);  // any hint used this question
  const [gameComplete, setGameComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [totalCharsTyped, setTotalCharsTyped] = useState(0);
  const [gameStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [lastAnswerTime, setLastAnswerTime] = useState(0); // ms taken on last q

  const inputRef = useRef<HTMLInputElement>(null);

  const questions = useMemo(() => {
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(MAX_QUESTIONS, vocabulary.length));
  }, [vocabulary]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  useEffect(() => { inputRef.current?.focus(); }, [currentIndex]);
  useEffect(() => { setQuestionStartTime(Date.now()); }, [currentIndex]);

  // Hint text based on level
  const getHintText = useCallback((): string => {
    if (!currentQuestion) return '';
    const target = currentQuestion.reading ?? currentQuestion.word;
    if (hintLevel === 0) return '';
    if (hintLevel === 1) return target[0] + '＿'.repeat(target.length - 1);
    if (hintLevel === 2) {
      const half = Math.ceil(target.length / 2);
      return target.slice(0, half) + '＿'.repeat(target.length - half);
    }
    return target; // level 3 = reveal full (0 points)
  }, [currentQuestion, hintLevel]);

  const checkAnswer = useCallback(() => {
    if (!currentQuestion) return;
    const n = normalize(userInput);
    const word = normalize(currentQuestion.word);
    const reading = currentQuestion.reading ? normalize(currentQuestion.reading) : '';
    const correct = n === word || (reading !== '' && n === reading);

    const elapsed = Date.now() - questionStartTime;
    setLastAnswerTime(elapsed);
    setIsCorrect(correct);
    setShowResult(true);

    const chars = userInput.length;
    setTotalCharsTyped(prev => prev + chars);

    if (correct) {
      setCorrectCount(prev => prev + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(max => Math.max(max, newCombo));

      let pts = 10;
      if (hintUsed && hintLevel < 3) pts = Math.max(0, pts - HINT_PENALTY * hintLevel);
      if (hintLevel >= 3) pts = 0; // full reveal = 0 points
      const timeBonus = Math.max(0, Math.floor((10000 - elapsed) / 1000)); // up to +10
      const comboBonus = (newCombo - 1) * 3;
      setScore(prev => prev + pts + timeBonus + comboBonus);
    } else {
      setCombo(0);
    }

    onUpdateMastery(currentQuestion.id, correct);
  }, [currentQuestion, userInput, hintUsed, hintLevel, combo, questionStartTime, onUpdateMastery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResult && userInput.trim()) checkAnswer();
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      const totalMs = Date.now() - gameStartTime;
      const wpm = computeWPM(totalCharsTyped + userInput.length, totalMs);
      setGameComplete(true);
      onComplete({ correct: correctCount, total: questions.length, score, wpm });
    } else {
      setCurrentIndex(prev => prev + 1);
      setUserInput('');
      setShowResult(false);
      setHintLevel(0);
      setHintUsed(false);
      setIsCorrect(false);
    }
  };

  const showHint = () => {
    if (hintLevel >= 3) return;
    setHintLevel(prev => prev + 1);
    setHintUsed(true);
  };

  const restart = () => {
    setCurrentIndex(0); setUserInput(''); setShowResult(false);
    setHintLevel(0); setHintUsed(false); setCorrectCount(0);
    setGameComplete(false); setIsCorrect(false); setScore(0);
    setCombo(0); setMaxCombo(0); setTotalCharsTyped(0);
  };

  // ── Results ──────────────────────────────────────────────────────────────
  if (gameComplete) {
    const totalMs = Date.now() - gameStartTime;
    const wpm = computeWPM(totalCharsTyped, totalMs);
    const percentage = Math.round((correctCount / questions.length) * 100);
    const stars = percentage >= 90 ? 3 : percentage >= 65 ? 2 : 1;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
        <Card className="border-0 shadow-2xl overflow-hidden rounded-[2.5rem] bg-white">
          <div className="h-2 bg-gradient-to-r from-indigo-400 via-sky-400 to-blue-500" />
          <CardContent className="space-y-8 p-10">
            <div className="text-center relative">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-7xl font-display font-black bg-gradient-to-br from-indigo-600 to-sky-500 bg-clip-text text-transparent">
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
                { label: 'Chính xác', val: `${percentage}%`, icon: CheckCircle2, color: 'text-emerald-500' },
                { label: 'Tốc độ gõ', val: `${wpm} WPM`, icon: Keyboard, color: 'text-indigo-500' },
                { label: 'Combo nhất', val: `${maxCombo}x`, icon: Flame, color: 'text-orange-500' },
                { label: 'Đúng / Tổng', val: `${correctCount}/${questions.length}`, icon: Trophy, color: 'text-amber-500' },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-2xl text-center space-y-1">
                  <s.icon className={cn('h-4 w-4 mx-auto mb-1', s.color)} />
                  <p className="text-xl font-bold text-slate-800">{s.val}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={restart} className="w-full bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white rounded-[1.5rem] py-5 text-lg font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                <RotateCcw className="h-5 w-5" /> Chơi lại
              </button>
              <Button variant="ghost" onClick={onBack} className="w-full text-indigo-400 hover:bg-indigo-50 rounded-2xl">Trở về Hub</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!currentQuestion) return null;

  const hintText = getHintText();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header stats */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 px-3 py-1 rounded-full text-xs font-bold">
            {currentIndex + 1} / {questions.length}
          </Badge>
          {combo > 1 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs font-black text-orange-600 italic">{combo}x</span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-indigo-600 font-black">
            <Zap className="h-4 w-4" />
            <span className="text-sm">{score.toLocaleString()}</span>
          </div>
          {lastAnswerTime > 0 && (
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Clock className="h-3.5 w-3.5" />
              <span>{(lastAnswerTime / 1000).toFixed(1)}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-indigo-400 to-sky-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Question card */}
      <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100">
        <CardContent className="py-14 text-center space-y-4">
          <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">Gõ từ tiếng Nhật cho:</p>
          <p className="text-4xl font-bold text-slate-900 leading-tight">{currentQuestion.meaning}</p>

          {/* Hint display */}
          <AnimatePresence>
            {hintLevel > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className={cn('inline-flex items-center gap-3 rounded-2xl px-5 py-3 border mt-2',
                  hintLevel === 3 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100')}>
                <span className={cn('text-2xl font-jp font-bold tracking-[0.15em]',
                  hintLevel === 3 ? 'text-emerald-600' : 'text-amber-700')}>
                  {hintText}
                </span>
                {hintLevel < 3 && (
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                    Gợi ý {hintLevel}
                  </span>
                )}
                {hintLevel === 3 && <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Đáp án · 0đ</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Input section */}
      <form onSubmit={handleSubmit} className="space-y-5 px-2">
        <div className="relative">
          <Input
            ref={inputRef}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="Gõ Hiragana hoặc Kanji..."
            className={cn(
              'text-3xl font-jp py-11 text-center rounded-[2rem] border-2 transition-all shadow-lg',
              !showResult && 'border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 bg-white',
              showResult && isCorrect && 'bg-green-50 border-green-500 text-green-800',
              showResult && !isCorrect && 'bg-red-50 border-red-500 text-red-800'
            )}
            disabled={showResult}
            autoComplete="off"
          />
          <AnimatePresence>
            {showResult && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-5 top-1/2 -translate-y-1/2 bg-white rounded-full p-1.5 shadow-md">
                {isCorrect ? <CheckCircle2 className="h-8 w-8 text-green-500" /> : <XCircle className="h-8 w-8 text-red-500" />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!showResult ? (
          <div className="flex gap-3 justify-center">
            <Button type="button" variant="outline"
              onClick={showHint}
              disabled={hintLevel >= 3}
              className={cn('px-7 py-6 rounded-2xl font-bold transition-all gap-2',
                hintLevel === 0 ? 'border-amber-200 text-amber-600 hover:bg-amber-50' :
                hintLevel === 1 ? 'border-orange-200 text-orange-600 hover:bg-orange-50' :
                'border-red-200 text-red-600 hover:bg-red-50')}>
              💡 {hintLevel === 0 ? 'Gợi ý' : hintLevel === 1 ? 'Gợi ý thêm' : 'Xem đáp án'}
              {hintLevel > 0 && <span className="text-[10px] opacity-60">-{HINT_PENALTY * hintLevel}đ</span>}
            </Button>
            <button type="submit" disabled={!userInput.trim()}
              className="flex-1 max-w-[200px] bg-slate-900 text-white rounded-2xl py-5 font-bold shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-40">
              Kiểm tra
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Combo flash when correct streak */}
            <AnimatePresence>
              {isCorrect && combo > 1 && (
                <motion.div initial={{ opacity: 0, scale: 0.5, y: 10 }} animate={{ opacity: 1, scale: 1.1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="text-center">
                  <span className="inline-block bg-gradient-to-r from-orange-400 to-rose-500 text-white font-black text-sm px-5 py-2 rounded-full shadow-lg">
                    🔥 {combo}x Combo! +{(combo - 1) * 3} bonus
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wrong answer: show correct */}
            {!isCorrect && (
              <Card className="bg-slate-900 text-white border-0 shadow-xl rounded-[2.5rem]">
                <CardContent className="py-7 text-center space-y-2">
                  <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">Đáp án chính xác</p>
                  <p className="text-4xl font-jp font-black text-indigo-300 tracking-wider">{currentQuestion.word}</p>
                  {currentQuestion.reading && (
                    <p className="text-xl text-slate-400 font-jp">({currentQuestion.reading})</p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => speak(currentQuestion.word)}
                className="py-6 px-7 rounded-2xl border-slate-200 hover:bg-slate-50 gap-2 text-slate-600 shadow-sm">
                <Volume2 className="h-5 w-5" /> Nghe
              </Button>
              <button onClick={handleNext}
                className="flex-1 max-w-[280px] bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-[1.5rem] py-5 font-bold shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2">
                {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Từ tiếp theo'}
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </form>

      <p className="text-center text-xs text-slate-300 font-medium">Tip: Gõ bằng Hiragana hoặc Kanji đều được chấp nhận</p>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onBack} className="text-slate-300 hover:text-indigo-500 text-sm">Thoát trò chơi</Button>
      </div>
    </div>
  );
};
