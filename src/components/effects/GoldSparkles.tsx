import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GoldSparklesProps {
  active: boolean;
  particleCount?: number;
  onComplete?: () => void;
}

const COLORS = ['#FFD700', '#FFA500', '#FFE066'];

export const GoldSparkles = ({
  active,
  particleCount = 20,
  onComplete,
}: GoldSparklesProps) => {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => onComplete?.(), 2500);
    return () => clearTimeout(timer);
  }, [active, onComplete]);

  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: 4 + Math.random() * 8,
    color: COLORS[i % COLORS.length],
    delay: (i / particleCount) * 1.0,
  }));

  return (
    <AnimatePresence>
      {active && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, delay: p.delay, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                backgroundColor: p.color,
                boxShadow: `0 0 6px ${p.color}`,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};
