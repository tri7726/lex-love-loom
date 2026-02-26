import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, Lock } from 'lucide-react';

export type KanjiStatus = 'mastered' | 'learning' | 'locked';

interface KanjiCellProps {
  character: string;
  meaning: string;
  hanviet?: string;
  status: KanjiStatus;
  onClick?: () => void;
  delay?: number;
}

export const KanjiCell: React.FC<KanjiCellProps> = ({
  character,
  meaning,
  hanviet,
  status,
  onClick,
  delay = 0,
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'mastered':
        return 'bg-matcha/10 border-matcha text-matcha hover:bg-matcha/20';
      case 'learning':
        return 'bg-sakura/10 border-sakura text-sakura hover:bg-sakura/20 scale-105 shadow-md shadow-sakura/20';
      case 'locked':
        return 'bg-muted/30 border-muted-foreground/20 text-muted-foreground/50 opacity-60 cursor-not-allowed';
      default:
        return 'bg-card border-border text-foreground hover:border-primary/50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300 }}
      whileHover={status !== 'locked' ? { scale: status === 'learning' ? 1.1 : 1.05 } : {}}
      whileTap={status !== 'locked' ? { scale: 0.95 } : {}}
      className={cn(
        'relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group',
        getStatusStyles()
      )}
      onClick={status !== 'locked' ? onClick : undefined}
    >
      <span className="text-3xl md:text-4xl font-jp font-bold mb-1">{character}</span>
      {hanviet && (
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{hanviet}</span>
      )}
      
      {/* Status Icons */}
      <div className="absolute top-1 right-1">
        {status === 'mastered' && (
          <div className="bg-matcha text-white rounded-full p-0.5 shadow-sm">
            <Check className="h-2 w-2" />
          </div>
        )}
        {status === 'locked' && (
          <Lock className="h-2.5 w-2.5 text-muted-foreground/40" />
        )}
      </div>

      {/* Mini Tooltip on Hover (Optional for desktop) */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-sumi text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
        {meaning}
      </div>
    </motion.div>
  );
};
