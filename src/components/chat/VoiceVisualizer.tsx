import React from 'react';
import { motion } from 'framer-motion';

interface VoiceVisualizerProps {
  isActive: boolean;
  color?: string;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ 
  isActive, 
  color = "#f43f5e" 
}) => {
  return (
    <div className="flex items-end justify-center gap-1 h-12">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ height: 4 }}
          animate={{ 
            height: isActive ? [4, Math.random() * 30 + 10, 4] : 4,
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 0.5 + Math.random() * 0.5,
            ease: "easeInOut"
          }}
          style={{ backgroundColor: color }}
          className="w-1.5 rounded-full opacity-60"
        />
      ))}
    </div>
  );
};
