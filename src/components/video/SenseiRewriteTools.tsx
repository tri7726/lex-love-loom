import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Volume2, RefreshCw, Repeat, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RewriteResult } from '@/components/video/AnalysisPanel';

interface Props {
  text: string;
  onRewrite: (mode: 'politeness' | 'jlpt', text: string) => Promise<RewriteResult | null>;
}

export const SenseiRewriteTools: React.FC<Props> = ({ text, onRewrite }) => {
  const [activeMode, setActiveMode] = useState<'politeness' | 'jlpt' | null>(null);
  const [loading, setLoading] = useState<'politeness' | 'jlpt' | null>(null);
  const [results, setResults] = useState<Partial<Record<'politeness' | 'jlpt', RewriteResult>>>({});

  const run = async (mode: 'politeness' | 'jlpt') => {
    setLoading(mode);
    setActiveMode(mode);
    try {
      const res = await onRewrite(mode, text);
      if (res) setResults(prev => ({ ...prev, [mode]: res }));
    } finally {
      setLoading(null);
    }
  };

  const speak = (t: string) => {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'ja-JP';
    u.rate = 0.85;
    speechSynthesis.speak(u);
  };

  const current = activeMode ? results[activeMode] : null;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={() => run('politeness')}
          disabled={loading === 'politeness'}
          className={cn(
            'gap-1.5 rounded-full text-xs h-9 px-4 border transition-all',
            activeMode === 'politeness'
              ? 'bg-sakura text-white border-sakura'
              : 'bg-white text-sakura border-sakura/30 hover:bg-sakura/10'
          )}
        >
          {loading === 'politeness' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Repeat className="h-3.5 w-3.5" />}
          So sánh phong cách (敬語/丁寧/普通)
        </Button>
        <Button
          size="sm"
          onClick={() => run('jlpt')}
          disabled={loading === 'jlpt'}
          className={cn(
            'gap-1.5 rounded-full text-xs h-9 px-4 border transition-all',
            activeMode === 'jlpt'
              ? 'bg-sakura text-white border-sakura'
              : 'bg-white text-sakura border-sakura/30 hover:bg-sakura/10'
          )}
        >
          {loading === 'jlpt' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GraduationCap className="h-3.5 w-3.5" />}
          Viết lại theo JLPT (N5/N3/N1)
        </Button>
        {activeMode && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => activeMode && run(activeMode)}
            disabled={!!loading}
            className="gap-1.5 rounded-full text-xs h-9 px-3 text-muted-foreground hover:text-sakura"
            title="Tạo lại"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={activeMode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-2xl border border-sakura/15 bg-gradient-to-br from-white to-sakura-light/10 p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sakura">
              <Sparkles className="h-3.5 w-3.5" />
              {activeMode === 'politeness' ? 'So sánh độ lịch sự' : 'Viết lại theo JLPT'}
            </div>

            {(current.variants ?? []).map((v, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-sakura/10 bg-white/80 p-3 space-y-1 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-sakura-dark bg-sakura-light/40 px-2 py-0.5 rounded-full">
                    {v.label}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-sakura hover:bg-sakura/10"
                    onClick={() => speak(v.japanese)}
                    title="Nghe phát âm"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-base font-medium text-foreground leading-relaxed">{v.japanese}</p>
                {v.reading && (
                  <p className="text-xs text-muted-foreground">{v.reading}</p>
                )}
                {v.vietnamese && (
                  <p className="text-sm text-foreground/70 italic">→ {v.vietnamese}</p>
                )}
                {v.nuance && (
                  <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">{v.nuance}</p>
                )}
              </div>
            ))}

            {current.recommendation && (
              <div className="rounded-xl bg-amber-50/60 border border-amber-200/50 p-3 text-xs text-amber-800 leading-relaxed">
                <span className="font-bold">💡 Khuyến nghị: </span>
                {current.recommendation}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
