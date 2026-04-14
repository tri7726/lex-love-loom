/**
 * FillBlankGame — Hidden Character Challenge
 * Hiển thị từ với 1-2 ký tự bị ẩn bởi ＿
 * Người dùng chọn ký tự đúng từ 4 lựa chọn.
 * Nếu có example_sentence, cũng hiển thị câu mẫu để cung cấp context.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PencilLine, Trophy, RotateCcw, ChevronLeft, Sparkles,
  Star, Flame, Volume2, BookOpen, ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VocabularyItem } from '@/types/vocabulary';

export interface FillBlankGameProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number; score: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

interface BlankQuestion {
  word: VocabularyItem;
  target: string;        // the word or reading to display
  maskedIndices: number[]; // which char positions are hidden
  options: string[];     // 4 choices for the first masked char
  correctOption: string; // correct char for maskedIndices[0]
  revealedWith: string;  // full word after first blank filled
}

const MAX_QUESTIONS = 15;

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP'; u.rate = 0.85;
  speechSynthesis.speak(u);
}

// Get unique chars from the full vocabulary pool for distractors
function getDistractorChars(allWords: VocabularyItem[], exclude: string, count: number): string[] {
  const chars = new Set<string>();
  for (const v of allWords) {
    const target = v.reading ?? v.word;
    for (const ch of target) {
      if (ch !== exclude && ch.match(/[\u3040-\u30FF\u4E00-\u9FAF]/)) {
        chars.add(ch);
      }
    }
    if (chars.size > 80) break;
  }
  return [...chars].sort(() => Math.random() - 0.5).slice(0, count);
}

function buildQuestion(word: VocabularyItem, allWords: VocabularyItem[]): BlankQuestion | null {
  const target = word.reading ?? word.word;
  if (!target || target.length < 2) return null;

  // Choose which position(s) to mask
  const maskedCount = target.length >= 4 ? 2 : 1;
  const positions = [...Array(target.length).keys()].sort(() => Math.random() - 0.5).slice(0, maskedCount);
  const maskedIndices = positions.sort((a, b) => a - b);

  const correctChar = target[maskedIndices[0]];
  const distractors = getDistractorChars(allWords, correctChar, 3).slice(0, 3);
  if (distractors.length < 3) return null; // not enough distractors

  const options = [...distractors, correctChar].sort(() => Math.random() - 0.5);

  return {
    word,
    target,
    maskedIndices,
    options,
    correctOption: correctChar,
    revealedWith: correctChar,
  };
}

function renderMasked(target: string, maskedIndices: number[], revealedChar?: string): React.ReactNode[] {
  return target.split('').map((ch, i) => {
    if (maskedIndices[0] === i) {
      // First blank: will be filled by user's choice
      return (
        <span key={i} className="relative inline-block">
          <span className="text-sakura font-black">{revealedChar ?? '＿'}</span>
        </span>
      );
    }
    if (maskedIndices.includes(i) && i !== maskedIndices[0]) {
      // Additional blanks: shown as ？ (context)
      return <span key={i} className="text-slate-300">？</span>;
    }
    return <span key={i}>{ch}</span>;
  });
}

// ── Main Component ────────────────────────────────────────────────────────
export const FillBlankGame: React.FC<FillBlankGameProps> = ({
  vocabulary, onComplete, onUpdateMastery, onBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  const questions = useMemo((): BlankQuestion[] => {
    const pool = vocabulary.filter(v => (v.reading ?? v.word).length >= 2);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, MAX_QUESTIONS);
    return shuffled.flatMap(w => {
      const q = buildQuestion(w, pool);
      return q ? [q] : [];
    }).slice(0, MAX_QUESTIONS);
  }, [vocabulary]);

  const currentQ = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Auto-play audio on each new question
  useEffect(() => {
    if (currentQ) speak(currentQ.word.word);
  }, [currentIndex, currentQ]);

  const handleSelect = useCallback((option: string) => {
    if (showResult) return;
    setSelected(option);
    setShowResult(true);

    const correct = option === currentQ.correctOption;
    if (correct) {
      setCorrectCount(prev => prev + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(max => Math.max(max, newCombo));
      const pts = 10 + (newCombo > 1 ? newCombo * 4 : 0);
      setScore(prev => prev + pts);
    } else {
      setCombo(0);
    }
    onUpdateMastery(currentQ.word.id, correct);
  }, [showResult, currentQ, combo, onUpdateMastery]);

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setGameComplete(true);
      onComplete({ correct: correctCount, total: questions.length, score });
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const restart = () => {
    setCurrentIndex(0); setSelected(null); setShowResult(false);
    setCorrectCount(0); setScore(0); setCombo(0); setMaxCombo(0); setGameComplete(false);
  };

  // ── Results ──────────────────────────────────────────────────────────────
  if (gameComplete) {
    const pct = Math.round((correctCount / questions.length) * 100);
    const stars = pct >= 90 ? 3 : pct >= 65 ? 2 : 1;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
        <Card className="border-0 shadow-2xl overflow-hidden rounded-[3rem] bg-white">
          <div className="h-2 bg-gradient-to-r from-violet-400 to-fuchsia-400" />
          <CardContent className="space-y-8 p-10">
            <div className="text-center relative">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-7xl font-display font-black text-violet-500">
                {score.toLocaleString()}
              </motion.div>
              <p className="text-slate-400 font-black tracking-widest uppercase text-[10px] mt-2">Tổng điểm</p>
              <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-fuchsia-200 animate-pulse" />
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
                { label: 'Chính xác', val: `${pct}%` },
                { label: 'Max Combo', val: `${maxCombo}x` },
                { label: 'Đúng', val: `${correctCount}/${questions.length}` },
                { label: 'Điểm', val: score.toLocaleString() },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-2xl font-bold text-slate-800">{s.val}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={restart} className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-[1.5rem] py-5 text-lg font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                <RotateCcw className="h-5 w-5" /> Chơi lại
              </button>
              <Button variant="ghost" onClick={onBack} className="w-full text-violet-400 hover:bg-violet-50 rounded-2xl">Quay lại</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!currentQ) return null;

  const isCorrect = selected === currentQ.correctOption;
  const displayTarget = renderMasked(
    currentQ.target,
    currentQ.maskedIndices,
    showResult ? (isCorrect ? selected ?? undefined : currentQ.correctOption) : undefined
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-violet-50">
            <PencilLine className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Điền ký tự</p>
            <p className="text-sm font-bold text-slate-700">Câu {currentIndex + 1}/{questions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {combo > 1 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs font-black text-orange-600 italic">{combo}x</span>
            </motion.div>
          )}
          <Badge className="bg-violet-500 text-white font-black px-4">{score.toLocaleString()} đ</Badge>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Question card */}
      <motion.div key={currentIndex} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.04)] rounded-[3.5rem] bg-white overflow-hidden border border-slate-50">
          <CardContent className="py-14 text-center space-y-5">
            <p className="text-[10px] text-slate-300 uppercase tracking-widest font-black">
              {currentQ.word.meaning}
            </p>

            {/* Word with blank */}
            <div className="text-5xl font-jp font-black text-slate-800 tracking-wider flex items-center justify-center gap-0.5">
              {displayTarget}
            </div>

            {/* Reading hint if target is kanji word */}
            {currentQ.word.reading && currentQ.target === currentQ.word.word && (
              <p className="text-slate-300 text-base font-jp">
                {renderMasked(currentQ.word.reading, [])}
              </p>
            )}

            {/* Example sentence if available */}
            {currentQ.word.example_sentence && (
              <div className="bg-slate-50 rounded-2xl px-5 py-3 text-left mx-4">
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-jp text-slate-600 leading-relaxed">{currentQ.word.example_sentence}</p>
                    {currentQ.word.example_translation && (
                      <p className="text-xs text-slate-400 mt-1 italic">{currentQ.word.example_translation}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Audio button */}
            <button onClick={() => speak(currentQ.word.word)} className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-violet-500 transition-colors font-medium">
              <Volume2 className="h-4 w-4" /> Nghe lại
            </button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Multiple choice options */}
      {!showResult ? (
        <div className="grid grid-cols-2 gap-4">
          {currentQ.options.map((option, idx) => (
            <motion.div key={idx} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
              <button
                onClick={() => handleSelect(option)}
                className="w-full py-8 rounded-[2.5rem] border bg-white border-slate-100 hover:border-violet-200 hover:bg-violet-50/30 hover:shadow-xl transition-all text-4xl font-jp font-bold text-slate-700 hover:text-violet-600"
              >
                {option}
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Feedback banner */}
            <div className={cn('rounded-[2rem] p-6 text-center border', isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100')}>
              <p className="text-2xl mb-1">{isCorrect ? '🎉 Chính xác!' : '❌ Sai rồi!'}</p>
              {!isCorrect && (
                <p className="text-slate-600 font-medium">
                  Đáp án đúng: <span className="text-3xl font-jp font-black text-emerald-600">{currentQ.correctOption}</span>
                </p>
              )}
              <p className="text-sm text-slate-500 mt-2 font-jp">{currentQ.target}</p>
            </div>

            <button onClick={handleNext}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-[1.5rem] py-5 font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              {currentIndex + 1 >= questions.length ? <><Trophy className="h-5 w-5" />Xem kết quả</> : <>Tiếp theo<ArrowRight className="h-5 w-5" /></>}
            </button>
          </motion.div>
        </AnimatePresence>
      )}

      <div className="flex justify-center pt-2">
        <Button variant="ghost" onClick={() => { if (window.confirm('Thoát game?')) onBack(); }}
          className="text-slate-200 hover:text-violet-500 text-sm">
          <ChevronLeft className="h-4 w-4 mr-1" /> Thoát
        </Button>
      </div>
    </div>
  );
};
