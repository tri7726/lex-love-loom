/**
 * FillBlankGame — Fill-in-the-blank vocabulary game
 * Shows word meaning/reading, user types the Japanese word
 * Fuzzy match ≥70% = correct
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowLeft, Keyboard, Trophy, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VocabularyItem } from '@/types/vocabulary';

interface FillBlankGameProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number; score?: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

// ── Fuzzy similarity (Levenshtein) ────────────────────────────────────────────
function similarity(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  const m = s1.length, n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = s1[i - 1] === s2[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

const CORRECT_THRESHOLD = 0.7;
const REVEAL_DELAY = 1500; // ms before next question

export const FillBlankGame: React.FC<FillBlankGameProps> = ({
  vocabulary, onComplete, onUpdateMastery, onBack,
}) => {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use ref for correct count so advance() always sees latest value
  const correctRef = useRef(0);

  const total = vocabulary.length;
  const word = vocabulary[idx];

  useEffect(() => {
    inputRef.current?.focus();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [idx]);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = 0.85;
      speechSynthesis.speak(u);
    }
  }, []);

  const advance = useCallback(() => {
    const next = idx + 1;
    if (next >= total) {
      setFinished(true);
      // Use ref value — always up-to-date even after async state updates
      onComplete({ correct: correctRef.current, total, score: Math.round((correctRef.current / total) * 100) });
    } else {
      setIdx(next);
      setInput('');
      setResult(null);
    }
  }, [idx, total, onComplete]);

  const submit = useCallback(() => {
    if (!word || result) return;
    const accepted = [word.word, word.reading].filter(Boolean) as string[];
    const isCorrect = accepted.some(a => similarity(input, a) >= CORRECT_THRESHOLD);
    setResult(isCorrect ? 'correct' : 'wrong');
    onUpdateMastery(word.id, isCorrect);
    if (isCorrect) {
      correctRef.current += 1;   // update ref immediately (sync)
      setCorrect(correctRef.current); // update display state
      speak(word.word);
    }
    timerRef.current = setTimeout(advance, REVEAL_DELAY);
  }, [word, result, input, onUpdateMastery, advance, speak]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };

  const skip = () => {
    if (result) return;
    setResult('wrong');
    onUpdateMastery(word?.id ?? '', false);
    timerRef.current = setTimeout(advance, REVEAL_DELAY);
  };

  if (finished) {
    const pct = Math.round((correctRef.current / total) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center py-8">
        <div className="text-6xl">{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div>
        <h2 className="text-2xl font-black">{pct >= 80 ? 'Xuất sắc!' : pct >= 50 ? 'Khá tốt!' : 'Cố lên nào!'}</h2>
        <p className="text-muted-foreground">
          Đúng <span className="font-black text-emerald-500">{correctRef.current}</span> / {total} câu
          <span className="ml-2 text-xs">({pct}%)</span>
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
          <Button onClick={() => { correctRef.current = 0; setIdx(0); setInput(''); setResult(null); setCorrect(0); setFinished(false); }} className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
            <RotateCcw className="h-4 w-4" /> Chơi lại
          </Button>
        </div>
      </motion.div>
    );
  }

  if (!word) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Thoát
        </Button>
        <div className="flex items-center gap-2">
          <Badge className="bg-indigo-100 text-indigo-700 border-0 font-black text-xs">
            <Keyboard className="h-3 w-3 mr-1" /> Điền vào chỗ trống
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">{idx + 1}/{total}</span>
        </div>
      </div>

      {/* Progress */}
      <Progress value={(idx / total) * 100} className="h-2" />

      {/* Score indicator */}
      <div className="flex items-center gap-1.5">
        <Trophy className="h-3.5 w-3.5 text-gold" />
        <span className="text-xs font-black text-muted-foreground">{correct} đúng</span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          <div className={cn(
            'p-6 rounded-3xl border-2 transition-all space-y-4',
            result === 'correct' ? 'border-emerald-400 bg-emerald-50' :
            result === 'wrong'   ? 'border-rose-400 bg-rose-50' :
            'border-border/40 bg-card'
          )}>
            {/* Clue */}
            <div className="space-y-4 text-center py-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest italic">Hãy điền từ thích hợp vào chỗ trống</p>
                <div className="text-xl font-bold text-foreground font-jp leading-relaxed">
                  {(() => {
                    const sentence = word.example_sentence || word.example;
                    if (sentence) {
                      // Try to find the word and replace with ____
                      // We use a simple regex or string replace. 
                      // Note: this might not be perfect for Japanese but it's a good start.
                      const regex = new RegExp(word.word, 'g');
                      if (regex.test(sentence)) {
                        return sentence.split(regex).map((part, i, arr) => (
                          <React.Fragment key={i}>
                            {part}
                            {i < arr.length - 1 && <span className="mx-1 px-4 border-b-2 border-indigo-400 text-indigo-500 font-black">____</span>}
                          </React.Fragment>
                        ));
                      }
                    }
                    // Fallback clue
                    return (
                      <div className="flex flex-col gap-2">
                        <span className="text-muted-foreground text-sm uppercase tracking-widest font-sans">Nghĩa: {word.meaning}</span>
                        <div className="flex items-center justify-center gap-2">
                          <span className="px-4 border-b-2 border-indigo-400 text-indigo-500 font-black">____</span>
                          <span className="text-sm font-medium">có nghĩa là gì?</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {word.reading && !result && (
                <div className="flex items-center justify-center gap-2 opacity-50">
                  <p className="text-xs text-muted-foreground font-jp italic">Gợi ý: {word.reading}</p>
                </div>
              )}
            </div>

            {/* Answer reveal */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-center pt-2 border-t border-border/30"
                >
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-1">Đáp án</p>
                  <p className="text-3xl font-black font-jp text-foreground">{word.word}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input */}
          {!result && (
            <div className="relative">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Gõ từ tiếng Nhật..."
                className="w-full px-5 py-4 text-center text-xl font-jp rounded-2xl border-2 border-border/40 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none bg-white transition-all font-bold"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          )}

          {/* Result indicator */}
          {result && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm',
                result === 'correct' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              )}
            >
              {result === 'correct'
                ? <><CheckCircle2 className="h-5 w-5" /> Chính xác! 🎉</>
                : <><XCircle className="h-5 w-5" /> Sai rồi — xem đáp án bên trên</>
              }
            </motion.div>
          )}

          {/* Action buttons */}
          {!result && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={skip}
                className="flex-1 text-muted-foreground border-border/40"
              >
                Bỏ qua
              </Button>
              <Button
                onClick={submit}
                disabled={!input.trim()}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black gap-2"
              >
                Kiểm tra
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
