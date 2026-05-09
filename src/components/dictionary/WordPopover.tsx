/**
 * WordPopover — P2 của Local Dictionary Engine
 * Popover tra từ tức thì khi click.
 * Badge ⚡ Local / 💾 Cache / 🌐 AI để user biết nguồn dữ liệu.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Loader2, Zap, Database, Globe } from 'lucide-react';
import { useWordLookup, type WordLookupResult } from '@/hooks/useWordLookup';
import { useWordHistory } from '@/hooks/useWordHistory';

interface WordPopoverProps {
  word: string;
  anchorEl?: HTMLElement | null; // dùng để định vị (optional)
  onClose: () => void;
}

const SOURCE_BADGE: Record<WordLookupResult['source'], { label: string; icon: React.ElementType; color: string }> = {
  local: { label: 'Local', icon: Zap,      color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cache: { label: 'Cache', icon: Database,  color: 'text-muted-foreground bg-cream border-border' },
  api:   { label: 'AI',    icon: Globe,     color: 'text-orange-500 bg-orange-50 border-orange-200' },
};

export const WordPopover: React.FC<WordPopoverProps> = ({ word, onClose }) => {
  const { result, isLoading, source, lookup } = useWordLookup();
  const { saveWord, isWordSaved } = useWordHistory();

  React.useEffect(() => {
    if (word) lookup(word);
  }, [word, lookup]);

  const badge = source ? SOURCE_BADGE[source] : null;
  const isSaved = result ? isWordSaved(result.word) : false;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="z-[200] w-72 rounded-2xl border border-white/40 bg-white/90 shadow-2xl backdrop-blur-xl"
        style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <span className="text-base font-bold text-foreground">{word}</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground/70 transition hover:bg-sakura-light/20 hover:text-foreground/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {isLoading && !result && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang tra cứu AI...</span>
            </div>
          )}

          {!isLoading && !result && !source && (
            <p className="text-sm text-muted-foreground/70">Không tìm thấy từ này.</p>
          )}

          {result && (
            <div className="space-y-2">
              {/* Reading + JLPT */}
              <div className="flex flex-wrap items-center gap-2">
                {result.reading && result.reading !== result.word && (
                  <span className="text-sm text-muted-foreground">{result.reading}</span>
                )}
                {result.jlpt_level && (
                  <span className="rounded-full border border-sakura/30 bg-sakura/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sakura">
                    {result.jlpt_level}
                  </span>
                )}
                {result.word_type && (
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                    {result.word_type}
                  </span>
                )}
              </div>

              {/* Hán Việt */}
              {result.hanviet && (
                <p className="text-xs font-medium text-amber-600">🀄 {result.hanviet}</p>
              )}

              {/* Meaning */}
              <p className="text-sm font-medium leading-snug text-foreground/80">
                📖 {result.meaning}
              </p>

              {/* Example */}
              {(result.example || (result.examples && result.examples.length > 0)) && (
                <div className="mt-1 rounded-xl border border-border/50 bg-cream/60 px-3 py-2">
                  {result.example ? (
                    <>
                      <p className="text-xs text-foreground/70">{result.example}</p>
                      {result.exampleMeaning && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">{result.exampleMeaning}</p>
                      )}
                    </>
                  ) : result.examples?.[0] ? (
                    <>
                      <p className="text-xs text-foreground/70">{result.examples[0].japanese}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">{result.examples[0].vietnamese}</p>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {result && (
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
            {/* Source badge */}
            {badge && (
              <div className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.color}`}>
                <badge.icon className="h-3 w-3" />
                <span>{badge.label}</span>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={() =>
                saveWord({
                  word: result.word,
                  reading: result.reading,
                  meaning: result.meaning,
                })
              }
              disabled={isSaved}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                isSaved
                  ? 'cursor-default bg-emerald-50 text-emerald-600'
                  : 'bg-sakura/90 text-white hover:bg-rose-500 shadow-sm'
              }`}
            >
              <BookOpen className="h-3 w-3" />
              {isSaved ? 'Đã lưu' : 'Lưu vào Inbox'}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
