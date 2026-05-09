import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SakuraBurstProps {
  active: boolean;
  origin?: { x: number; y: number };
  petalCount?: number;
  onComplete?: () => void;
}

const PETAL_COLORS = ['#FFB7C5', '#FF8FAB', '#FFC0CB', '#FFD1DC', '#FF69B4'];

export const SakuraBurst = ({
  active,
  origin,
  petalCount = 12,
  onComplete,
}: SakuraBurstProps) => {
  const cx = origin?.x ?? window.innerWidth / 2;
  const cy = origin?.y ?? window.innerHeight / 2;

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => onComplete?.(), 2000);
    return () => clearTimeout(timer);
  }, [active, onComplete]);

  const petals = Array.from({ length: petalCount }, (_, i) => {
    const angle = (360 / petalCount) * i + Math.random() * 30 - 15;
    const distance = 80 + Math.random() * 120;
    const rad = (angle * Math.PI) / 180;
    return {
      id: i,
      tx: Math.cos(rad) * distance,
      ty: Math.sin(rad) * distance,
      rotate: Math.random() * 720 - 360,
      color: PETAL_COLORS[i % PETAL_COLORS.length],
      size: 8 + Math.random() * 8,
    };
  });

  return (
    <AnimatePresence>
      {active && (
        <div
          style={{
            position: 'fixed',
            left: cx,
            top: cy,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {petals.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
              animate={{ x: p.tx, y: p.ty, opacity: 0, scale: 0.3, rotate: p.rotate }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: '50% 0 50% 0',
                backgroundColor: p.color,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};
