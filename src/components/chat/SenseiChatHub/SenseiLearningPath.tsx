import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LearningPath, LearningStep } from '@/hooks/useLearningPath';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SenseiLearningPathProps {
  path: LearningPath | null;
  isGenerating: boolean;
  onSelectStep: (prompt: string) => void;
  onRefresh: () => void;
}

const STEP_STYLES: Record<LearningStep['type'], { bg: string; border: string; badge: string }> = {
  warmup:    { bg: 'bg-sakura/5',    border: 'border-sakura/20',    badge: 'bg-sakura/10 text-sakura' },
  practice:  { bg: 'bg-indigo-50/50', border: 'border-indigo-200/40', badge: 'bg-indigo-100 text-indigo-600' },
  challenge: { bg: 'bg-amber-50/50', border: 'border-amber-200/40', badge: 'bg-amber-100 text-amber-700' },
};

export const SenseiLearningPathCard: React.FC<SenseiLearningPathProps> = ({
  path, isGenerating, onSelectStep, onRefresh
}) => {
  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[80%] mx-auto mb-4 p-6 bg-white/60 backdrop-blur-xl border border-sakura/10 rounded-[2rem] flex items-center gap-4 text-sakura/60"
      >
        <Loader2 className="h-5 w-5 animate-spin shrink-0" />
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-sakura/50">Sensei đang phân tích lịch sử học...</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Đang tạo lộ trình học cá nhân hóa cho bạn</p>
        </div>
      </motion.div>
    );
  }

  if (!path) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-[80%] mx-auto mb-4"
      >
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-sakura/40">Lộ trình hôm nay • RAG</span>
            </div>
            <h3 className="text-base font-serif font-black text-slate-700 leading-snug">
              {path.focus_topic}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 italic">{path.reason}</p>
          </div>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 rounded-full text-slate-300 hover:text-sakura hover:bg-sakura/5 shrink-0"
            onClick={onRefresh}
            title="Tạo lộ trình mới"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Steps */}
        <div className="flex gap-2 flex-wrap">
          {path.steps.map((step, i) => {
            const s = STEP_STYLES[step.type];
            return (
              <motion.button
                key={i}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectStep(step.prompt)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all duration-300",
                  "text-left cursor-pointer group hover:shadow-md",
                  s.bg, s.border
                )}
              >
                <span className="text-lg leading-none">{step.icon}</span>
                <div className="min-w-0">
                  <span className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md", s.badge)}>
                    {step.label}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[160px] group-hover:text-slate-700">
                    {step.prompt.length > 40 ? step.prompt.slice(0, 40) + '...' : step.prompt}
                  </p>
                </div>
                <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-sakura shrink-0 ml-auto transition-colors" />
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
