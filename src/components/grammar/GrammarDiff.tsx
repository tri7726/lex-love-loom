import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GrammarError {
  position: number;
  original: string;
  corrected: string;
  type: string;
  difficulty: string;
  explanation: string;
}

interface GrammarDiffProps {
  original: string;
  corrected: string;
  errors?: GrammarError[];
  className?: string;
}

interface DiffSegment {
  type: 'unchanged' | 'removed' | 'added' | 'changed';
  text: string;
  error?: GrammarError;
}

/** Build diff segments from original text + errors.
 *  Each error splits the text into segments around it.
 *  Overlapping errors at the same position are merged. */
function buildSegments(text: string, errors: GrammarError[]): DiffSegment[] {
  if (!errors || errors.length === 0) {
    return [{ type: 'unchanged', text }];
  }

  // Sort errors by position
  const sorted = [...errors].sort((a, b) => a.position - b.position);

  const segments: DiffSegment[] = [];
  let cursor = 0;

  for (const err of sorted) {
    // Text before this error
    if (err.position > cursor) {
      segments.push({ type: 'unchanged', text: text.slice(cursor, err.position) });
    }

    // The error region in the original
    const end = err.position + err.original.length;
    const originalText = text.slice(err.position, end);

    segments.push({ type: 'removed', text: originalText || err.original, error: err });
    segments.push({ type: 'added', text: err.corrected, error: err });

    cursor = end;
  }

  // Remaining text after last error
  if (cursor < text.length) {
    segments.push({ type: 'unchanged', text: text.slice(cursor) });
  }

  return segments;
}

const typeColors: Record<string, string> = {
  particle_mistake: 'border-l-purple-400 bg-purple-50/60',
  verb_conjugation: 'border-l-blue-400 bg-blue-50/60',
  word_choice: 'border-l-orange-400 bg-orange-50/60',
  politeness: 'border-l-pink-400 bg-pink-50/60',
  spelling: 'border-l-red-400 bg-red-50/60',
  structure: 'border-l-teal-400 bg-teal-50/60',
};

const GrammarDiff: React.FC<GrammarDiffProps> = ({ original, corrected, errors, className }) => {
  const segments = buildSegments(original, errors || []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border border-sakura/10 overflow-hidden', className)}
    >
      {/* Diff header */}
      <div className="flex items-center gap-3 px-5 py-2.5 bg-sakura/5 border-b border-sakura/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          Original
        </span>
        <span className="text-muted-foreground/30">→</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Corrected
        </span>
      </div>

      {/* Inline diff view */}
      <div className="px-5 py-4 bg-white/60 space-y-3">
        {/* Original text with errors highlighted */}
        <div className="font-jp text-lg leading-relaxed">
          {segments.map((seg, i) => {
            if (seg.type === 'unchanged') {
              return <span key={i} className="text-foreground/80">{seg.text}</span>;
            }
            if (seg.type === 'removed') {
              return (
                <motion.span
                  key={`rm-${i}`}
                  initial={{ backgroundColor: 'rgba(225, 29, 72, 0)' }}
                  animate={{ backgroundColor: 'rgba(225, 29, 72, 0.08)' }}
                  transition={{ duration: 0.4 }}
                  className="relative inline rounded px-1 -mx-1"
                >
                  <span className="text-rose-500 line-through decoration-rose-400 decoration-2">{seg.text}</span>
                </motion.span>
              );
            }
            if (seg.type === 'added') {
              return (
                <motion.span
                  key={`add-${i}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="inline-block"
                >
                  <span className="text-emerald-600 font-bold">{seg.text}</span>
                </motion.span>
              );
            }
            return null;
          })}
        </div>

        {/* Error breakdown cards */}
        {errors && errors.length > 0 && (
          <div className="space-y-1.5 mt-2 pt-3 border-t border-sakura/5">
            {errors.map((err, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border-l-2 text-xs',
                  typeColors[err.type] || 'border-l-gray-300 bg-gray-50/40'
                )}
              >
                <span className="font-jp text-rose-500 line-through shrink-0">{err.original}</span>
                <span className="text-muted-foreground/40 shrink-0">→</span>
                <span className="font-jp text-emerald-600 font-bold shrink-0">{err.corrected}</span>
                <span className="text-muted-foreground/50 ml-1 truncate">{err.explanation}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default GrammarDiff;
