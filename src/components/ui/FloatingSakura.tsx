import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PETALS = Array.from({ length: 6 });

export const FloatingSakura: React.FC<{ isHovering: boolean }> = ({ isHovering }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {isHovering && PETALS.map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              scale: 0, 
              x: Math.random() * 200 - 100, 
              y: 60,
              rotate: 0 
            }}
            animate={{ 
              opacity: [0, 1, 0], 
              scale: [0.5, 1, 0.8],
              x: Math.random() * 300 - 150,
              y: -100,
              rotate: Math.random() * 360 + 180
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.5 + Math.random() * 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeOut"
            }}
            className="absolute left-1/2 bottom-0 text-rose-300/40 select-none text-lg will-change-transform"
          >
            🌸
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
