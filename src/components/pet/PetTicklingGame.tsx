import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Heart, Zap, Loader2, Trophy, Play } from 'lucide-react';

interface PetTicklingGameProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petEmoji: string;
  petName: string;
  onComplete: (score: number) => void;
}

const GAME_DURATION = 10;
const TARGET_SCORE = 20;

export const PetTicklingGame = ({ open, onOpenChange, petEmoji, petName, onComplete }: PetTicklingGameProps) => {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [combo, setCombo] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCombo(0);
    setLastTap(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCombo(0);
    setLastTap(Date.now());

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing') {
      setPhase('done');
      onComplete(score);
    }
  }, [timeLeft, phase, score, onComplete]);

  useEffect(() => {
    if (!open) reset();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, reset]);

  const handleTap = () => {
    if (phase !== 'playing') return;
    const now = Date.now();
    const isQuick = now - lastTap < 500;
    setScore((s) => s + 1);
    setCombo(isQuick ? combo + 1 : 1);
    setLastTap(now);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const progress = (score / TARGET_SCORE) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-sakura" /> Cù léc {petName}
          </DialogTitle>
          <DialogDescription>
            Chạm vào thú cưng thật nhanh để cưng nựng!
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <motion.span
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-7xl cursor-pointer"
              >
                {petEmoji}
              </motion.span>
              <p className="text-sm text-muted-foreground text-center">
                Bạn có 10 giây! Chạm vào {petName} thật nhiều lần nhé!
              </p>
              <Button onClick={startGame} className="rounded-xl gap-2">
                <Play className="h-4 w-4" /> Bắt đầu!
              </Button>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              {/* Timer + Score */}
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold">
                  {timeLeft}s
                </span>
                <span className="text-xs font-bold text-sakura">
                  {score} lần
                </span>
              </div>
              <Progress
                value={(timeLeft / GAME_DURATION) * 100}
                className="h-1.5"
                indicatorClassName={timeLeft <= 3 ? '!bg-red-500' : '!bg-sakura'}
              />

              {/* Pet to tap */}
              <motion.button
                key={`tap-${score}`}
                whileTap={{ scale: 0.7, rotate: -10 }}
                onClick={handleTap}
                className="mt-2 relative"
              >
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="text-8xl inline-block cursor-pointer select-none"
                >
                  {petEmoji}
                </motion.span>
              </motion.button>

              {/* Combo indicator */}
              <AnimatePresence>
                {combo >= 3 && (
                  <motion.div
                    key={`combo-${combo}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-bold text-amber-500"
                  >
                    Combo x{combo}! 🔥
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress to reward */}
              <div className="w-full space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Mục tiêu: {TARGET_SCORE} lần</span>
                  <span>{Math.min(score, TARGET_SCORE)}/{TARGET_SCORE}</span>
                </div>
                <Progress value={Math.min(progress, 100)} className="h-1.5" />
              </div>
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <Trophy className="h-12 w-12 text-yellow-500" />
              <p className="text-lg font-bold">
                {score >= TARGET_SCORE ? 'Tuyệt vời!' : 'Cố gắng hơn nữa nhé!'}
              </p>
              <p className="text-sm text-muted-foreground">
                Bạn đã chạm {score} lần!
              </p>
              <div className="flex gap-2">
                <Button onClick={startGame} variant="outline" className="rounded-xl">
                  Chơi lại
                </Button>
                <Button onClick={() => onOpenChange(false)} className="rounded-xl">
                  Xong
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
