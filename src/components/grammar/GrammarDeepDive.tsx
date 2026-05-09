import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Brain, Lightbulb, AlertTriangle, ChevronDown, ChevronUp, TreePine } from 'lucide-react';
import { useAI } from '@/contexts/AIContext';
import { cn } from '@/lib/utils';

interface GrammarRule {
  pattern: string;
  jlpt: string;
  meaning: string;
}

interface GrammarDeepDiveProps {
  rule: GrammarRule;
  userSentence: string;
  isOpen: boolean;
  onToggle: () => void;
}

interface ReasoningStep {
  step: number;
  title: string;
  explanation: string;
  example?: string;
}

interface DeepExplainResult {
  reasoning_steps: ReasoningStep[];
  conclusion: string;
  difficulty: string;
  related_patterns: string[];
  mnemonics?: string;
  common_mistakes?: string;
}

const GrammarDeepDive: React.FC<GrammarDeepDiveProps> = ({
  rule,
  userSentence,
  isOpen,
  onToggle,
}) => {
  const { explainDeep } = useAI();
  const [result, setResult] = React.useState<DeepExplainResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadExplanation = useCallback(async () => {
    if (result || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await explainDeep(
        `Explain the grammar pattern "${rule.pattern}" (${rule.jlpt}) in this sentence: "${userSentence}"`,
        `The user is learning about ${rule.pattern}. Meaning: ${rule.meaning}. JLPT Level: ${rule.jlpt}.`,
        'grammar'
      );
      if (data) {
        setResult(data as DeepExplainResult);
      } else {
        setError('Sensei không thể giải thích lúc này.');
      }
    } catch {
      setError('Có lỗi xảy ra khi tải giải thích.');
    } finally {
      setIsLoading(false);
    }
  }, [rule, userSentence, result, isLoading, explainDeep]);

  const handleToggle = () => {
    if (!isOpen && !result && !isLoading) {
      loadExplanation();
    }
    onToggle();
  };

  return (
    <div className="border-t border-sakura/5 pt-2">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className="flex items-center gap-2 text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors py-1.5 px-2 -mx-2 rounded-lg hover:bg-violet-50/50 w-full"
      >
        <Brain className="h-3.5 w-3.5 shrink-0" />
        <span>Giải thích sâu về <span className="font-jp">{rule.pattern}</span></span>
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin ml-auto" />
        ) : isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 ml-auto" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-1 px-2 space-y-3">
              {isLoading && !result && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-50/50 border border-violet-100/60">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                  <span className="text-xs text-violet-600 font-medium">Sensei đang suy luận...</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-600">
                  {error}
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  {/* Reasoning steps */}
                  {result.reasoning_steps.length > 0 && (
                    <div className="space-y-2">
                      {result.reasoning_steps.map((step) => (
                        <div key={step.step} className="flex gap-3">
                          <span className="h-6 w-6 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                            {step.step}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground">{step.title}</p>
                            <p className="text-[11px] text-foreground/70 mt-0.5 leading-relaxed">{step.explanation}</p>
                            {step.example && (
                              <p className="font-jp text-xs text-violet-700 bg-violet-50/60 rounded-lg px-2.5 py-1.5 mt-1.5 border border-violet-100/50">
                                {step.example}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Conclusion */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-1">Kết luận</p>
                    <p className="text-xs font-medium leading-relaxed">{result.conclusion}</p>
                  </div>

                  {/* Mnemonics */}
                  {result.mnemonics && (
                    <div className="flex gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-100/60">
                      <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Mẹo ghi nhớ</p>
                        <p className="text-[11px] text-foreground/70 mt-0.5">{result.mnemonics}</p>
                      </div>
                    </div>
                  )}

                  {/* Common mistakes */}
                  {result.common_mistakes && (
                    <div className="flex gap-2.5 p-3 rounded-xl bg-rose-50/70 border border-rose-100/60">
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider">Lỗi thường gặp</p>
                        <p className="text-[11px] text-foreground/70 mt-0.5">{result.common_mistakes}</p>
                      </div>
                    </div>
                  )}

                  {/* Related patterns */}
                  {result.related_patterns.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-violet-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                        <TreePine className="h-3 w-3" /> Mẫu câu liên quan
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.related_patterns.map((p, i) => (
                          <span key={i} className="text-[10px] font-medium bg-white border border-violet-100 text-violet-600 px-2 py-0.5 rounded-full">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GrammarDeepDive;
