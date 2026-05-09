import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PetEggProps {
  onHatch: () => void;
  hatching: boolean;
  currentEmoji?: string;
}

export const PetEgg = ({ onHatch, hatching, currentEmoji }: PetEggProps) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [cracked, setCracked] = useState(false);

  useEffect(() => {
    if (hatching) {
      setCracked(true);
    }
  }, [hatching]);

  const handleClick = () => {
    if (!hatching && !showPrompt) setShowPrompt(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
      {/* Animated Egg */}
      <motion.div
        className="relative cursor-pointer select-none"
        animate={
          hatching
            ? { scale: [1, 1.15, 0.9, 1.25, 1], rotate: [0, -10, 10, -5, 0] }
            : cracked
              ? { scale: 1, rotate: 0 }
              : { y: [0, -14, 0] }
        }
        transition={
          hatching
            ? { duration: 0.8, ease: 'easeInOut' }
            : { repeat: cracked ? 0 : Infinity, duration: 3, ease: 'easeInOut' }
        }
        onClick={handleClick}
      >
        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-200/50 to-purple-200/50 rounded-full blur-3xl scale-[1.8]" />

        {/* Egg shells or whole egg */}
        <AnimatePresence mode="wait">
          {cracked ? (
            <motion.div
              key="cracked"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <span className="text-9xl block">{currentEmoji || '🐣'}</span>
            </motion.div>
          ) : (
            <motion.span
              key="whole"
              className="text-9xl block relative z-10"
            >
              🥚
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {hatching && (
        <motion.p
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent animate-pulse"
        >
          Trứng đang nở...
        </motion.p>
      )}

      {/* Prompt */}
      <AnimatePresence>
        {showPrompt && !hatching && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="flex flex-col items-center gap-4 bg-white rounded-2xl p-6 shadow-lg border max-w-sm mx-auto"
          >
            <Sparkles className="h-8 w-8 text-sakura" />
            <div className="text-center">
              <p className="text-lg font-bold">Bạn muốn mở trứng không?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Một người bạn đồng hành đang chờ được ra đời!
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowPrompt(false)} className="rounded-xl">
                Để sau
              </Button>
              <Button
                onClick={() => { setCracked(false); onHatch(); }}
                className="rounded-xl bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white shadow-lg"
              >
                Mở trứng ngay!
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showPrompt && !hatching && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Nhấn vào quả trứng để mở...
        </p>
      )}
    </div>
  );
};
