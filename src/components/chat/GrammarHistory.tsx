/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp, RefreshCcw, Trash2, X, Volume2, BookOpen, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTTS } from '@/hooks/useTTS';

/* ──────── Types ──────── */
export interface SavedExercise {
  id: number;
  text: string;
  result: {
    isCorrect: boolean;
    corrected: string;
    explanation: string;
    rules: string[];
    suggestions: string[];
  };
  savedAt: string;
}

/* ──────── Helpers ──────── */
export const GRAMMAR_SAVED_KEY = 'grammar-saved-exercises';
export const GRAMMAR_SAVED_EVENT = 'grammar-saved';

export const loadSavedExercises = (): SavedExercise[] => {
  try { return JSON.parse(localStorage.getItem(GRAMMAR_SAVED_KEY) || '[]'); }
  catch { return []; }
};

const HighlightJP: React.FC<{text: string}> = ({ text }) => {
  const parts = text.split(/(「[^」]*」)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^「/.test(p)
          ? <span key={i} className="font-jp font-bold text-primary bg-primary/10 px-1 py-0.5 rounded mx-0.5">{p}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  );
};

/* ──────── Single saved item ──────── */
const HistoryItem: React.FC<{
  item: SavedExercise;
  onDelete: (id: number) => void;
  onReload: (text: string) => void;
}> = ({ item, onDelete, onReload }) => {
  const [open, setOpen] = useState(false);
  const { speak } = useTTS();
  const date = new Date(item.savedAt).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      item.result.isCorrect ? 'border-green-200 dark:border-green-900/40' : 'border-sakura/20'
    }`}>
      {/* Header row */}
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left">
        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${item.result.isCorrect ? 'bg-green-400' : 'bg-primary'}`}/>
        <span className="font-jp text-xs text-foreground flex-1 truncate">{item.text}</span>
        <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:block">{date}</span>
        {open ? <ChevronUp className="h-3 w-3 text-muted-foreground flex-shrink-0"/>
              : <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0"/>}
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2.5 border-t border-border bg-muted/20">

              {/* Corrected sentence */}
              {!item.result.isCorrect && item.result.corrected && (
                <div className="mt-2.5 bg-primary/5 border border-primary/15 rounded-lg p-2.5 relative">
                  <p className="text-[9px] uppercase tracking-widest text-primary/50 mb-1 font-bold">Câu đúng</p>
                  <p className="font-jp font-bold text-sm text-foreground pr-8">{item.result.corrected}</p>
                  <button onClick={() => speak(item.result.corrected)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors">
                    <Volume2 className="h-4 w-4"/>
                  </button>
                </div>
              )}

              {/* Explanation (truncated) */}
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">
                <HighlightJP text={item.result.explanation}/>
              </p>

              {/* Rules chips */}
              {item.result.rules?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.result.rules.slice(0, 3).map((r, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">{r}</span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => onReload(item.text)}
                  className="h-7 rounded-lg text-[11px] gap-1 border-border flex-1">
                  <RefreshCcw className="h-3 w-3"/>Kiểm tra lại
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}
                  className="h-7 rounded-lg text-[11px] gap-1 text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3"/>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ──────── Main Panel ──────── */
interface GrammarHistoryProps {
  onReload?: (text: string) => void;
}

export const GrammarHistory: React.FC<GrammarHistoryProps> = ({ onReload }) => {
  const [saved, setSaved] = useState<SavedExercise[]>(loadSavedExercises);

  /* Listen for saves from GrammarCheckInput in same tab */
  useEffect(() => {
    const handler = () => setSaved(loadSavedExercises());
    window.addEventListener(GRAMMAR_SAVED_EVENT, handler);
    return () => window.removeEventListener(GRAMMAR_SAVED_EVENT, handler);
  }, []);

  const handleDelete = (id: number) => {
    const updated = saved.filter(s => s.id !== id);
    setSaved(updated);
    try { localStorage.setItem(GRAMMAR_SAVED_KEY, JSON.stringify(updated)); } catch (e) { console.error('Error deleting grammar exercise:', e); }
  };

  const handleClearAll = () => {
    setSaved([]);
    try { localStorage.removeItem(GRAMMAR_SAVED_KEY); } catch (e) { console.error('Error clearing grammar exercises:', e); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary"/>
          <span className="text-sm font-semibold text-foreground">Bài đã lưu</span>
          {saved.length > 0 && (
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {saved.length}
            </span>
          )}
        </div>
        {saved.length > 0 && (
          <button onClick={handleClearAll}
            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
            <Trash2 className="h-3 w-3"/>Xóa tất cả
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
            <Inbox className="h-8 w-8 text-muted-foreground/30"/>
            <p className="text-xs text-muted-foreground">Chưa có bài nào được lưu</p>
            <p className="text-[10px] text-muted-foreground/60">Nhấn "Lưu bài" sau khi kiểm tra ngữ pháp</p>
          </div>
        ) : (
          saved.map(item => (
            <HistoryItem
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onReload={(t) => { if (onReload) onReload(t); }}
            />
          ))
        )}
      </div>

      {/* Footer hint */}
      {saved.length > 0 && (
        <div className="px-4 py-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            {saved.length} bài · lưu tối đa 30
          </p>
        </div>
      )}
    </div>
  );
};
