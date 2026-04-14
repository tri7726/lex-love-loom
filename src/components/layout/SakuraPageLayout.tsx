import React from 'react';
import { motion } from 'framer-motion';
import FallingPetals from '@/components/chat/SenseiChatHub/FallingPetals';

interface SakuraPageLayoutProps {
  children: React.ReactNode;
  className?: string;
  showPetals?: boolean;
}

export const SakuraPageLayout: React.FC<SakuraPageLayoutProps> = ({ 
  children, 
  className = "", 
  showPetals = true 
}) => {
  return (
    <div className={`relative min-h-[calc(100vh-4rem)] bg-cream dark:bg-sumi/5 overflow-hidden ${className}`}>
      {showPetals && <FallingPetals />}
      
      {/* Decorative background layers */}
      <div className="absolute inset-0 pointer-events-none opacity-100">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-sakura-light rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 opacity-60" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-sakura-soft rounded-full blur-[160px] translate-x-1/3 translate-y-1/3 opacity-40" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-sakura-light/40 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ 
          type: "spring", 
          stiffness: 100, 
          damping: 20,
          duration: 0.5 
        }}
        className="relative z-10 w-full container max-w-7xl mx-auto px-4 md:px-8 pb-32"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SakuraPageLayout;
