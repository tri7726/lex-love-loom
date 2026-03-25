import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface WaveVisualizerProps {
  isActive: boolean;
  color?: string;
  barCount?: number;
}

export const WaveVisualizer = ({ isActive, color = '#f43f5e', barCount = 12 }: WaveVisualizerProps) => {
  return (
    <div className="flex items-center justify-center gap-[3px] h-10">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
          animate={isActive ? {
            height: ['4px', `${12 + Math.random() * 24}px`, '4px'],
            opacity: [0.4, 1, 0.4],
          } : { height: '4px', opacity: 0.3 }}
          transition={isActive ? {
            duration: 0.5 + Math.random() * 0.4,
            repeat: Infinity,
            delay: i * 0.05,
            ease: 'easeInOut',
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
};
