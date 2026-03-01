import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const SakuraParticles = () => {
  const [particles, setParticles] = useState<{ id: number; left: number; delay: number; duration: number; size: number }[]>([]);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100, // random start horizontal %
        delay: Math.random() * 5, // random delay
        duration: 8 + Math.random() * 7, // random fall duration (8-15s)
        size: 0.5 + Math.random() * 0.8 // random scale
      }));
      setParticles(newParticles);
    };
    generateParticles();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-[-5%]"
          initial={{ y: '-10vh', x: 0, opacity: 0, rotate: 0 }}
          animate={{
            y: '110vh',
            x: [0, 60, -40, 50, 0], // gentle sway
            opacity: [0, 0.8, 0.6, 0],
            rotate: [0, 90, 180, 360]
          }}
          transition={{
            y: { duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" },
            x: { duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" },
            rotate: { duration: p.duration * 0.7, delay: p.delay, repeat: Infinity, ease: "linear" }
          }}
          style={{ left: `${p.left}%`, transform: `scale(${p.size})` }}
        >
          {/* A simple petal shape using border-radius */}
          <div 
            className="w-3 h-3 bg-sakura/60 blur-[0.5px] shadow-[0_0_2px_rgba(255,183,197,0.8)]" 
            style={{ borderRadius: '50% 0 50% 50%' }} 
          />
        </motion.div>
      ))}
    </div>
  );
};
