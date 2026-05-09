import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAI } from '@/contexts/AIContext';
import { useTTS } from '@/hooks/useTTS';

/* ──────── Types ──────── */
interface WritingSuggestion {
  text: string;
  reason: string;
}

interface WritingAssistantProps {
  text: string;
  enabled: boolean;
  className?: string;
}

/* ──────── Debounce hook ──────── */
function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const WritingAssistant: React.FC<WritingAssistantProps> = ({ text, enabled, className }) => {
  const { checkGrammar } = useAI();
  const { speak } = useTTS();
  const debouncedText = useDebounce(text, 1500);
  const [suggestion, setSuggestion] = useState<WritingSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastRequestRef = useRef<string>('');

  const checkForSuggestions = useCallback(async (content: string) => {
    if (!content.trim() || content.trim().length < 3) {
      setSuggestion(null);
      return;
    }

    // Avoid re-checking the same text
    if (content === lastRequestRef.current) return;
    lastRequestRef.current = content;

    setLoading(true);
    try {
      const data = await checkGrammar(content);
      if (data) {
        const result = data.format === 'grammar' ? data.result : data;
        if (!result.isCorrect && result.corrected && result.corrected !== content.trim()) {
          setSuggestion({
            text: result.corrected,
            reason: result.errors?.[0]?.explanation || result.explanation?.slice(0, 120) || '',
          });
          setDismissed(false);
        } else {
          setSuggestion(null);
        }
      }
    } catch {
      // Silently fail — assistant is non-critical
    } finally {
      setLoading(false);
    }
  }, [checkGrammar]);

  useEffect(() => {
    if (!enabled || !debouncedText.trim()) {
      setSuggestion(null);
      return;
    }
    checkForSuggestions(debouncedText);
  }, [debouncedText, enabled, checkForSuggestions]);

  if (!enabled || !suggestion || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        className={cn('overflow-hidden', className)}
      >
        <div className="relative p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/80 to-violet-50/80 border border-indigo-100/60">
          {loading && (
            <div className="absolute right-3 top-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
            </div>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="absolute right-3 top-3 text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-start gap-2.5 pr-8">
            <div className="h-6 w-6 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Gợi ý viết</p>
              <p className="text-sm font-jp font-bold text-foreground/90 flex items-center gap-2">
                <span>{suggestion.text}</span>
                <button
                  onClick={() => speak(suggestion.text)}
                  className="text-indigo-400 hover:text-indigo-600 shrink-0"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </p>
              {suggestion.reason && (
                <p className="text-[11px] text-foreground/60 leading-relaxed">{suggestion.reason}</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WritingAssistant;
