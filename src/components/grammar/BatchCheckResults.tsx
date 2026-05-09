import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Clock, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useTTS } from '@/hooks/useTTS';

interface BatchLineError {
  position: number;
  original: string;
  corrected: string;
  type: string;
  difficulty: string;
  explanation: string;
}

interface BatchGrammarResult {
  isCorrect: boolean;
  corrected: string;
  errors?: BatchLineError[];
  explanation: string;
}

export interface BatchLineResult {
  line: string;
  lineNumber: number;
  status: 'pending' | 'checking' | 'correct' | 'incorrect' | 'error';
  result?: BatchGrammarResult;
}

interface BatchCheckResultsProps {
  results: BatchLineResult[];
  className?: string;
}

const typeBadgeColors: Record<string, string> = {
  particle_mistake: 'bg-purple-100 text-purple-700',
  verb_conjugation: 'bg-blue-100 text-blue-700',
  word_choice: 'bg-orange-100 text-orange-700',
  politeness: 'bg-pink-100 text-pink-700',
  spelling: 'bg-red-100 text-red-700',
  structure: 'bg-teal-100 text-teal-700',
};

const BatchCheckResults: React.FC<BatchCheckResultsProps> = ({ results, className }) => {
  const { speak } = useTTS();
  const [expanded, setExpanded] = React.useState<number | null>(null);

  const completed = results.filter(r => r.status === 'correct' || r.status === 'incorrect' || r.status === 'error').length;
  const total = results.length;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Summary bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/70 border border-border/50 text-xs">
        <span className="font-medium text-foreground/70">
          Đã kiểm tra <strong>{completed}/{total}</strong> câu
        </span>
        <div className="flex gap-3">
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {results.filter(r => r.status === 'correct').length}
          </span>
          <span className="flex items-center gap-1 text-rose-500">
            <XCircle className="h-3.5 w-3.5" />
            {results.filter(r => r.status === 'incorrect').length}
          </span>
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-1.5">
        {results.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <button
              onClick={() => r.result && setExpanded(expanded === i ? null : i)}
              disabled={r.status === 'pending' || r.status === 'checking'}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                r.status === 'pending' && 'bg-white/40 border-border/30',
                r.status === 'checking' && 'bg-blue-50/40 border-blue-200/50',
                r.status === 'correct' && 'bg-green-50/40 border-green-200/50',
                r.status === 'incorrect' && 'bg-rose-50/40 border-rose-200/50',
                r.status === 'error' && 'bg-gray-50 border-gray-200',
                r.result && 'cursor-pointer hover:shadow-sm',
              )}
            >
              {/* Status icon */}
              <span className="shrink-0">
                {r.status === 'pending' && <Clock className="h-4 w-4 text-muted-foreground/40" />}
                {r.status === 'checking' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                {r.status === 'correct' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {r.status === 'incorrect' && <XCircle className="h-4 w-4 text-rose-500" />}
                {r.status === 'error' && <XCircle className="h-4 w-4 text-muted-foreground" />}
              </span>

              {/* Line number */}
              <span className="text-[10px] font-bold text-muted-foreground/50 w-5 shrink-0">{r.lineNumber}</span>

              {/* Text */}
              <span className="font-jp text-sm truncate flex-1"
                style={{ textDecoration: r.status === 'incorrect' ? 'line-through wavy' : 'none', textDecorationColor: '#f43f5e' }}>
                {r.line}
              </span>

              {/* Expand */}
              {r.result && (
                <span className="text-muted-foreground/40 shrink-0">
                  {expanded === i ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
              )}
            </button>

            {/* Expanded result */}
            <AnimatePresence>
              {expanded === i && r.result && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 ml-10 space-y-3 bg-white/50 rounded-b-xl border-x border-b border-border/30">
                    {/* Corrected */}
                    {r.result.corrected && (
                      <div className="flex items-start gap-2">
                        <span className="font-jp text-sm text-emerald-600 font-bold">{r.result.corrected}</span>
                        <button onClick={() => speak(r.result!.corrected)} className="text-emerald-400 hover:text-emerald-600 shrink-0">
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Errors */}
                    {r.result.errors && r.result.errors.length > 0 && (
                      <div className="space-y-1.5">
                        {r.result.errors.map((err, ei) => (
                          <div key={ei} className="flex items-center gap-2 text-xs">
                            <span className="font-jp text-rose-500 line-through">{err.original}</span>
                            <span className="text-muted-foreground/40">→</span>
                            <span className="font-jp text-emerald-600 font-bold">{err.corrected}</span>
                            <Badge className={cn('text-[8px] px-1.5 py-0 rounded-full border-none ml-auto', typeBadgeColors[err.type] || 'bg-gray-100')}>
                              {err.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Explanation */}
                    {r.result.explanation && (
                      <p className="text-[11px] text-foreground/60 leading-relaxed">{r.result.explanation}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BatchCheckResults;
