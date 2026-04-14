/**
 * KanaRain — Arcade Falling Words Game
 * Các từ tiếng Nhật rơi từ trên xuống.
 * Người dùng gõ nghĩa tiếng Việt để phá chúng trước khi chạm đáy.
 * Tốc độ tăng mỗi 20 giây. 3 mạng.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Heart, HeartOff, Trophy, RotateCcw, ChevronLeft,
  Sparkles, Star, Flame
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VocabularyItem } from '@/types/vocabulary';

export interface KanaRainProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number; score: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

interface FallingWord {
  id: string;
  word: VocabularyItem;
  x: number;       // % from left
  y: number;       // % from top (0–100)
  speed: number;   // % per tick
  destroyed: boolean;
  missed: boolean;
}

const TICK_MS = 50;
const BASE_SPEED = 0.25;        // % per tick initially
const SPEED_INCREMENT = 0.08;   // extra speed per level
const LEVEL_EVERY_S = 20;       // seconds between speed levels
const SPAWN_INTERVAL_MS = 2500; // ms between spawns
const MAX_WORDS_ON_SCREEN = 5;
const MAX_LIVES = 3;
const GAME_DURATION_S = 90;     // 90s max game length

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ── Pre-game Splash Screen ────────────────────────────────────────────────
const Splash: React.FC<{ onStart: () => void; onBack: () => void }> = ({ onStart, onBack }) => (
  <div className="max-w-md mx-auto space-y-10 py-8 text-center animate-in fade-in duration-500">
    <div className="space-y-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50">
        <span className="text-4xl">🌧️</span>
      </div>
      <h2 className="text-4xl font-display font-black text-slate-800 tracking-tight">Kana Rain</h2>
      <p className="text-slate-400 text-sm font-medium leading-relaxed">
        Từ Nhật rơi từ trên xuống — gõ <strong>nghĩa tiếng Việt</strong> để phá chúng!<br/>
        Đừng để chúng chạm đất.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-3 text-left">
      {[
        { icon: '💨', text: 'Tốc độ tăng mỗi 20 giây' },
        { icon: '❤️', text: '3 mạng — mỗi lần miss = mất 1 mạng' },
        { icon: '🔥', text: 'Combo liên tiếp nhân đôi điểm' },
        { icon: '⏱️', text: 'Giới hạn 90 giây' },
      ].map((tip, i) => (
        <div key={i} className="flex items-center gap-4 bg-white border border-slate-50 rounded-2xl px-5 py-3 shadow-sm">
          <span className="text-xl">{tip.icon}</span>
          <p className="text-sm text-slate-600 font-medium">{tip.text}</p>
        </div>
      ))}
    </div>

    <div className="flex flex-col gap-3">
      <button onClick={onStart} className="w-full bg-slate-900 text-white rounded-[1.5rem] py-5 text-lg font-bold shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
        <Zap className="h-5 w-5 text-yellow-400" /> Bắt đầu!
      </button>
      <Button variant="ghost" onClick={onBack} className="text-slate-300 hover:text-slate-600">
        <ChevronLeft className="h-4 w-4 mr-1" /> Quay lại
      </Button>
    </div>
  </div>
);

// ── Main Game ─────────────────────────────────────────────────────────────
export const KanaRain: React.FC<KanaRainProps> = ({ vocabulary, onComplete, onUpdateMastery, onBack }) => {
  const [phase, setPhase] = useState<'splash' | 'playing' | 'results'>('splash');
  const [words, setWords] = useState<FallingWord[]>([]);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_S);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalSpawned, setTotalSpawned] = useState(0);
  const [flashWord, setFlashWord] = useState<string | null>(null); // id of destroyed word

  const inputRef = useRef<HTMLInputElement>(null);
  const wordPool = useMemo(() => [...vocabulary].sort(() => Math.random() - 0.5), [vocabulary]);
  const poolIndexRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const gameActiveRef = useRef(false);

  // Sync lives to ref for use inside setInterval callbacks
  useEffect(() => { livesRef.current = lives; }, [lives]);

  const endGame = useCallback((final: { score: number; correct: number; total: number }) => {
    gameActiveRef.current = false;
    setPhase('results');
    onComplete(final);
  }, [onComplete]);

  // ── Spawn new falling words ───────────────────────────────────────────────
  const spawnWord = useCallback(() => {
    if (!gameActiveRef.current) return;
    setWords(prev => {
      const active = prev.filter(w => !w.destroyed && !w.missed);
      if (active.length >= MAX_WORDS_ON_SCREEN || wordPool.length === 0) return prev;

      const idx = poolIndexRef.current % wordPool.length;
      poolIndexRef.current += 1;
      const vocab = wordPool[idx];

      const id = `${Date.now()}-${Math.random()}`;
      const speed = BASE_SPEED + (level - 1) * SPEED_INCREMENT;
      const x = 5 + Math.random() * 60; // 5–65% so text doesn't clip right edge

      const newWord: FallingWord = { id, word: vocab, x, y: 0, speed, destroyed: false, missed: false };
      setTotalSpawned(n => n + 1);
      return [...prev.filter(w => !w.destroyed || Date.now() - parseInt(w.id.split('-')[0]) < 1000), newWord];
    });
  }, [level, wordPool]);

  // ── Physics tick ──────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (!gameActiveRef.current) return;

    setWords(prev => {
      let missedCount = 0;
      const next = prev.map(w => {
        if (w.destroyed || w.missed) return w;
        const newY = w.y + w.speed;
        if (newY >= 92) {
          missedCount++;
          return { ...w, missed: true };
        }
        return { ...w, y: newY };
      });

      if (missedCount > 0) {
        setCombo(0);
        setLives(l => {
          const nl = l - missedCount;
          if (nl <= 0) {
            setTimeout(() => {
              setScore(s => { setCorrectCount(c => { endGame({ score: s, correct: c, total: poolIndexRef.current }); return c; }); return s; });
            }, 300);
            return 0;
          }
          return nl;
        });
        // Update mastery for missed words
        next.filter(w => w.missed && !prev.find(p => p.id === w.id)?.missed)
          .forEach(w => onUpdateMastery(w.word.id, false));
      }

      return next.filter(w => !w.missed || Date.now() - parseInt(w.id.split('-')[0]) < 1500);
    });
  }, [endGame, onUpdateMastery]);

  // ── Countdown timer & level up ────────────────────────────────────────────
  const timerTick = useCallback(() => {
    if (!gameActiveRef.current) return;
    setTimeLeft(prev => {
      const next = prev - 1;
      if (next <= 0) {
        setScore(s => { setCorrectCount(c => { endGame({ score: s, correct: c, total: poolIndexRef.current }); return c; }); return s; });
        return 0;
      }
      // Level up every N seconds
      const elapsed = GAME_DURATION_S - next;
      setLevel(Math.floor(elapsed / LEVEL_EVERY_S) + 1);
      return next;
    });
  }, [endGame]);

  // ── Start all intervals ───────────────────────────────────────────────────
  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    poolIndexRef.current = 0;
    setPhase('playing');
    setWords([]); setInput(''); setScore(0); setCombo(0); setMaxCombo(0);
    setLives(MAX_LIVES); setLevel(1); setTimeLeft(GAME_DURATION_S);
    setCorrectCount(0); setTotalSpawned(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;

    const tickId   = setInterval(tick, TICK_MS);
    const spawnId  = setInterval(spawnWord, SPAWN_INTERVAL_MS);
    const timerId  = setInterval(timerTick, 1000);

    // Spawn first word immediately
    setTimeout(spawnWord, 400);

    return () => { clearInterval(tickId); clearInterval(spawnId); clearInterval(timerId); };
  }, [phase, tick, spawnWord, timerTick]);

  // ── Input handler: check if user typed a correct meaning ─────────────────
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    const typed = normalize(val);
    if (!typed) return;

    setWords(prev => {
      // Find first active word whose meaning matches
      const match = prev.find(w =>
        !w.destroyed && !w.missed &&
        normalize(w.word.meaning).split(/[,;/、]/).map(s => s.trim()).some(m => typed === m)
      );
      if (!match) return prev;

      // Correct! Destroy it.
      setCorrectCount(c => c + 1);
      setCombo(c => {
        const nc = c + 1;
        setMaxCombo(max => Math.max(max, nc));
        const pts = 10 + (nc > 1 ? nc * 5 : 0);
        setScore(s => s + pts);
        return nc;
      });
      setFlashWord(match.id);
      setTimeout(() => setFlashWord(null), 500);
      onUpdateMastery(match.word.id, true);
      setInput('');

      return prev.map(w => w.id === match.id ? { ...w, destroyed: true } : w);
    });
  };

  // ── Results screen ────────────────────────────────────────────────────────
  if (phase === 'results') {
    const pct = totalSpawned > 0 ? Math.round((correctCount / totalSpawned) * 100) : 0;
    const stars = pct >= 80 ? 3 : pct >= 50 ? 2 : 1;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
        <Card className="border-0 shadow-2xl overflow-hidden rounded-[3rem] bg-white">
          <div className="h-2 bg-gradient-to-r from-cyan-400 to-blue-500" />
          <CardContent className="space-y-8 p-10">
            <div className="text-center relative">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-7xl font-display font-black text-cyan-500">
                {score.toLocaleString()}
              </motion.div>
              <p className="text-slate-400 font-black tracking-widest uppercase text-[10px] mt-2">Tổng điểm</p>
              <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-cyan-200 animate-pulse" />
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
                { label: 'Phá thành công', val: correctCount },
                { label: 'Max Combo', val: `${maxCombo}x` },
                { label: 'Chính xác', val: `${pct}%` },
                { label: 'Cấp độ đạt', val: `Lv.${level}` },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-2xl font-bold text-slate-800">{s.val}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => setPhase('splash')} className="w-full bg-slate-900 text-white rounded-[1.5rem] py-5 text-lg font-bold shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
                <RotateCcw className="h-5 w-5" /> Chơi lại
              </button>
              <Button variant="ghost" onClick={onBack} className="w-full text-slate-400 hover:text-cyan-500 rounded-2xl">Quay về</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (phase === 'splash') return <Splash onStart={startGame} onBack={onBack} />;

  // ── Playing ───────────────────────────────────────────────────────────────
  const activeWords = words.filter(w => !w.destroyed && !w.missed);
  const timePercent = (timeLeft / GAME_DURATION_S) * 100;
  const isLowTime = timeLeft <= 15;

  return (
    <div className="max-w-3xl mx-auto space-y-4 select-none">
      {/* HUD */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          {/* Lives */}
          <div className="flex items-center gap-1">
            {[...Array(MAX_LIVES)].map((_, i) => (
              <motion.div key={i} animate={{ scale: i < lives ? 1 : 0.8 }}>
                {i < lives ? <Heart className="h-5 w-5 text-sakura fill-sakura" /> : <HeartOff className="h-5 w-5 text-slate-200" />}
              </motion.div>
            ))}
          </div>
          {/* Combo */}
          <AnimatePresence>
            {combo > 1 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-black text-orange-600 italic">{combo}x COMBO</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">LV.{level}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="text-lg font-black text-slate-800 tracking-tighter">{score.toLocaleString()}</span>
          </div>
          {/* Timer */}
          <div className={cn('font-mono font-bold text-sm px-3 py-1 rounded-full border', isLowTime ? 'text-red-500 border-red-100 bg-red-50' : 'text-slate-400 border-slate-100')}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div className={cn('h-full rounded-full transition-colors', isLowTime ? 'bg-red-400' : 'bg-gradient-to-r from-cyan-400 to-blue-400')}
          style={{ width: `${timePercent}%` }} />
      </div>

      {/* Rain field */}
      <div
        className="relative w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 rounded-[2.5rem] overflow-hidden border border-slate-700 shadow-2xl"
        style={{ height: '380px' }}
      >
        {/* Grid lines for depth */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 38px, #fff 38px, #fff 39px)' }} />

        {/* Danger zone at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-red-900/30 to-transparent pointer-events-none" />
        <div className="absolute bottom-1 left-0 right-0 border-t border-red-500/20 pointer-events-none" />

        {/* Falling words */}
        <AnimatePresence>
          {activeWords.map(fw => (
            <motion.div
              key={fw.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 2, y: -20 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'absolute pointer-events-none px-4 py-2 rounded-2xl border font-jp font-bold text-center',
                flashWord === fw.id
                  ? 'bg-cyan-400 text-white border-cyan-300 scale-110'
                  : 'bg-white/10 backdrop-blur-sm text-white border-white/10'
              )}
              style={{ left: `${fw.x}%`, top: `${fw.y}%`, transition: `top ${TICK_MS}ms linear` }}
            >
              <p className="text-lg leading-tight">{fw.word.word}</p>
              {fw.word.reading && fw.word.reading !== fw.word.word && (
                <p className="text-[10px] text-white/50 mt-0.5">{fw.word.reading}</p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {activeWords.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/20 font-black text-sm uppercase tracking-widest">Đang chuẩn bị...</p>
          </div>
        )}
      </div>

      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInput}
          placeholder="Gõ nghĩa tiếng Việt để phá từ..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full text-xl py-6 px-8 text-center rounded-[2rem] border-2 border-slate-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50 bg-white shadow-lg outline-none transition-all font-medium placeholder:text-slate-300"
        />
        <Zap className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-200" />
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => { if (window.confirm('Thoát game?')) { gameActiveRef.current = false; onBack(); } }}
          className="text-slate-300 hover:text-red-400 text-sm gap-1">
          <ChevronLeft className="h-4 w-4" /> Thoát
        </Button>
      </div>
    </div>
  );
};
