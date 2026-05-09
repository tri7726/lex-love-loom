import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type BiomeType = 'forest' | 'sakura' | 'ocean' | 'volcano' | 'space';

interface PetEnvironmentProps {
  biome: BiomeType;
  timeOfDay?: 'day' | 'night';
  className?: string;
  children?: React.ReactNode;
}

export const PetEnvironment: React.FC<PetEnvironmentProps> = ({
  biome,
  timeOfDay = 'day',
  className,
  children
}) => {
  const biomeConfigs: Record<BiomeType, any> = {
    forest: {
      gradient: timeOfDay === 'day' 
        ? 'from-emerald-100 via-green-50 to-teal-100' 
        : 'from-slate-900 via-emerald-950 to-slate-900',
      overlay: 'bg-emerald-900/5',
      particles: ['🌿', '🍃', '✨'],
      particleCount: 12
    },
    sakura: {
      gradient: timeOfDay === 'day' 
        ? 'from-pink-100 via-rose-50 to-pink-50' 
        : 'from-purple-950 via-pink-950 to-slate-900',
      overlay: 'bg-pink-900/5',
      particles: ['🌸', '✨', '💖'],
      particleCount: 20
    },
    ocean: {
      gradient: timeOfDay === 'day' 
        ? 'from-cyan-100 via-blue-50 to-indigo-100' 
        : 'from-blue-950 via-indigo-950 to-slate-950',
      overlay: 'bg-blue-900/10',
      particles: ['🫧', '✨', '🐟'],
      particleCount: 15
    },
    volcano: {
      gradient: timeOfDay === 'day' 
        ? 'from-orange-100 via-red-50 to-orange-50' 
        : 'from-red-950 via-orange-950 to-slate-950',
      overlay: 'bg-red-900/10',
      particles: ['🔥', '✨', '☄️'],
      particleCount: 10
    },
    space: {
      gradient: 'from-slate-950 via-purple-950 to-black',
      overlay: 'bg-white/5',
      particles: ['⭐', '✨', '🌠'],
      particleCount: 30
    }
  };

  const config = biomeConfigs[biome] || biomeConfigs.forest;

  return (
    <div className={cn("relative w-full h-full overflow-hidden transition-colors duration-1000", className)}>
      {/* Base Gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-1000", config.gradient)} />
      
      {/* Animated Overlay */}
      <div className={cn("absolute inset-0 pointer-events-none mix-blend-multiply opacity-30", config.overlay)} />

      {/* Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(config.particleCount)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%", 
              opacity: 0,
              scale: 0.5
            }}
            animate={{ 
              y: [null, (Math.random() * 100 - 50) + "%"],
              x: [null, (Math.random() * 100 - 50) + "%"],
              opacity: [0, 0.5, 0],
              scale: [0.5, 1, 0.5],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 5 + Math.random() * 10,
              delay: Math.random() * 5,
              ease: "easeInOut"
            }}
            className="absolute text-lg filter blur-[1px]"
          >
            {config.particles[Math.floor(Math.random() * config.particles.length)]}
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
