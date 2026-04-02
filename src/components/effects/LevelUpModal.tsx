import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfetti } from '@/hooks/useConfetti';

export const LevelUpModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [levelData, setLevelData] = useState<{ level: number; totalXp: number } | null>(null);
  const confetti = useConfetti();

  useEffect(() => {
    const handleLevelUp = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setLevelData(customEvent.detail);
        setIsOpen(true);
        // Fire confetti on mount
        setTimeout(() => confetti.fire('school'), 300);
      }
    };

    window.addEventListener('level-up', handleLevelUp);
    return () => window.removeEventListener('level-up', handleLevelUp);
  }, [confetti]);

  if (!isOpen || !levelData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.5, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: -50, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-yellow-50 to-white shadow-2xl border-4 border-yellow-200"
        >
          {/* Shimmer background effect */}
          <div className="absolute inset-0 -translate-x-full animate-progress-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
          
          <div className="p-8 pb-10 text-center flex flex-col items-center">
            {/* Trophy Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, delay: 0.2 }}
              className="relative w-32 h-32 flex items-center justify-center mb-6"
            >
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-40 animate-pulse" />
              <div className="relative bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-3xl p-6 shadow-xl transform rotate-12">
                <Trophy className="w-16 h-16 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-bounce" />
              <Star className="absolute bottom-4 -left-4 w-6 h-6 text-yellow-500 animate-pulse" />
            </motion.div>

            <h2 className="text-3xl font-black text-slate-800 mb-2 font-display">
              Lên Cấp!
            </h2>
            <p className="text-lg text-slate-600 font-medium mb-8">
              Chúc mừng bạn đã đạt <strong className="text-yellow-600">Level {levelData.level}</strong>!
            </p>

            <div className="w-full h-2 bg-yellow-100 rounded-full mb-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-full" />
                <div className="absolute inset-0 -translate-x-full animate-progress-shimmer bg-gradient-to-r from-transparent via-white/80 to-transparent shadow-lg" />
            </div>

            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold rounded-2xl h-14 text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
              onClick={() => setIsOpen(false)}
            >
              Tiếp tục học hành 🚀
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
