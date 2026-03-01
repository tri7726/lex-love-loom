import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export type MasteryLevel = 'new' | 'learning' | 'mastered';

interface GrammarMasteryBadgeProps {
  level: MasteryLevel;
  progress: number; // 0 to 100
  className?: string;
}

export const GrammarMasteryBadge: React.FC<GrammarMasteryBadgeProps> = ({ 
  level, 
  progress,
  className 
}) => {
  const configs = {
    new: {
      label: 'Mới',
      icon: <Sparkles className="h-3 w-3" />,
      color: 'text-blue-500 bg-blue-50 border-blue-100',
      fill: 'bg-blue-500'
    },
    learning: {
      label: 'Đang học',
      icon: <Zap className="h-3 w-3" />,
      color: 'text-amber-500 bg-amber-50 border-amber-100',
      fill: 'bg-amber-500'
    },
    mastered: {
      label: 'Thành thạo',
      icon: <CheckCircle2 className="h-3 w-3" />,
      color: 'text-sakura bg-sakura/10 border-sakura/20',
      fill: 'bg-sakura'
    }
  };

  const config = configs[level];

  return (
    <div className={cn("space-y-2 w-full max-w-[120px]", className)}>
      <div className={cn(
        "flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-sm transition-all",
        config.color
      )}>
        {config.icon}
        {config.label}
      </div>
      <div className="relative pt-1">
        <div className="flex mb-1 items-center justify-between">
          <div>
            <span className="text-[9px] font-bold inline-block text-muted-foreground uppercase opacity-70">
              Tiến độ
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold inline-block text-muted-foreground">
              {progress}%
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </div>
    </div>
  );
};
