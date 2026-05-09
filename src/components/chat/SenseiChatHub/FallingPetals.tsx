import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const Petal = ({ index }: { index: number }) => {
  const settings = useMemo(() => ({
    left: `${Math.random() * 100}%`,
    duration: 15 + Math.random() * 20,
    delay: Math.random() * 20,
    size: 6 + Math.random() * 8, // Larger petals for better visibility
    xRange: 40 + Math.random() * 100,
    swayDuration: 4 + Math.random() * 4,
    rotation: Math.random() * 360,
  }), []);

  return (
    <motion.div
      className="absolute pointer-events-none z-0"
      initial={{ top: "-10%", left: settings.left, opacity: 0, rotate: settings.rotation }}
      animate={{ 
        top: "110%",
        opacity: [0, 0.6, 0.6, 0],
      }}
      transition={{
        duration: settings.duration,
        repeat: Infinity,
        delay: settings.delay,
        ease: "linear",
      }}
    >
      <motion.div
        animate={{ 
          x: [-settings.xRange, settings.xRange],
          rotate: [settings.rotation, settings.rotation + 45, settings.rotation - 45, settings.rotation],
        }}
        transition={{
          duration: settings.swayDuration,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        className="relative"
      >
        <svg
          width={settings.size}
          height={settings.size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-sakura-light/60 drop-shadow-sm"
          style={{ filter: 'blur(0.5px)' }}
        >
          <path
            d="M12 21.5C12 21.5 4 17.5 4 10.5C4 3.5 12 2.5 12 2.5C12 2.5 20 3.5 20 10.5C20 17.5 12 21.5 12 21.5Z"
            fill="currentColor"
          />
        </svg>
      </motion.div>
    </motion.div>
  );
};

const FallingPetals: React.FC = () => {
  const petals = useMemo(() => [...Array(20)], []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 pointer-events-none">
      <div className="absolute inset-0">
        {petals.map((_, i) => (
          <Petal key={i} index={i} />
        ))}
      </div>
    </div>
  );
};

export default FallingPetals;

