import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

interface XPGainEntry {
  id: number;
  amount: number;
  label?: string;
}

let toastId = 0;
const listeners: Array<(entry: XPGainEntry) => void> = [];

/** Call this anywhere in the app to trigger an XP gain animation */
export function showXPGain(amount: number, label?: string) {
  const entry: XPGainEntry = { id: ++toastId, amount, label };
  listeners.forEach(fn => fn(entry));
}

/**
 * Drop this component once inside your layout (AppLayout or App).
 * It listens to showXPGain events and renders fly-up toasts.
 */
export const XPGainToast: React.FC = () => {
  const [queue, setQueue] = useState<XPGainEntry[]>([]);

  useEffect(() => {
    const handler = (entry: XPGainEntry) => {
      setQueue(prev => [...prev, entry]);
      setTimeout(() => {
        setQueue(prev => prev.filter(e => e.id !== entry.id));
      }, 2200);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <div className="fixed bottom-24 right-4 z-[999] flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {queue.map(entry => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 0, scale: 0.7 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-sm font-black px-4 py-2 rounded-full shadow-2xl shadow-amber-300/40"
          >
            <Zap className="h-4 w-4 drop-shadow" />
            <span>+{entry.amount} XP</span>
            {entry.label && (
              <span className="opacity-80 text-[10px] font-bold uppercase tracking-wider">
                {entry.label}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
