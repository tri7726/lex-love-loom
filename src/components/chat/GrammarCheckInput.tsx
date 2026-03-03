import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, AlertCircle, Loader2, Sparkles, RefreshCcw, Trash2,
  Mic, MicOff, Volume2, Info, BookOpen, Quote, Save, Send
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTTS } from '@/hooks/useTTS';
import { useProfile } from '@/hooks/useProfile';
import { GRAMMAR_SAVED_KEY, GRAMMAR_SAVED_EVENT, loadSavedExercises } from './GrammarHistory';

/* ──────── Types ──────── */
export interface GrammarResult {
  isCorrect: boolean;
  corrected: string;
  explanation: string;
  rules: string[];
  suggestions: string[];
}

export interface GrammarCheckInputProps {
  initialValue?: string;
  className?: string;
  onClear?: () => void;
}

/* ──────── Highlight Japanese text in 「」 ──────── */
const HighlightJP: React.FC<{text: string}> = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(「[^」]*」)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^「/.test(p)
          ? <span key={i} className="font-jp font-bold text-primary bg-primary/10 px-1 py-0.5 rounded-md mx-0.5">{p}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  );
};

/** Parse "1. … 2. … n. …" into numbered items */
const parseExplanation = (text: string): {num: number; content: string}[] => {
  if (!text) return [];
  return text.split(/(?=\d+\.\s)/)
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(chunk => {
      const m = chunk.match(/^(\d+)\.\s+([\s\S]+)/);
      return m ? [{ num: parseInt(m[1]), content: m[2].trim() }] : [];
    });
};

/* ──────── Main Component ──────── */
export const GrammarCheckInput: React.FC<GrammarCheckInputProps> = ({
  initialValue = '',
  className,
  onClear,
}) => {
  const [text, setText] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GrammarResult | null>(null);
  const { toast } = useToast();
  const { profile } = useProfile();
  const { speak } = useTTS();
  const { isListening, startListening, stopListening } = useSpeechToText({
    onResult: (transcript) => setText(transcript)
  });

  const checkGrammar = useCallback(async (textToCheck: string) => {
    if (!textToCheck.trim() || textToCheck.length < 2) { setResult(null); return; }
    setIsLoading(true);
    try {
      const userContext = profile
        ? `User is level ${profile.level}, name ${profile.full_name || 'Gakusei'}.`
        : 'User is learning Japanese.';

      const { data, error: invokeError } = await supabase.functions.invoke('japanese-analysis', {
        body: {
          content: textToCheck,
          isGrammar: true,
          isVip: true,
          prompt: `[Context: ${userContext}] Vui lòng kiểm tra ngữ pháp hoặc dịch câu này sang tiếng Nhật tự nhiên nhất. Chỉ tập trung vào phần Text to analyze.`
        },
      });

      if (invokeError) throw invokeError;
      
      // Extract from { format: 'grammar', result: { ... } }
      const grammarResult = data?.format === 'grammar' ? data.result : data;
      
      if (data?.error && !grammarResult?.explanation) {
        toast({ title: 'Sensei Note', description: data.error });
      }
      setResult(grammarResult);
    } catch (error) {
      console.error('Grammar check error:', error);
      toast({ title: 'Lỗi Sensei', description: 'Sensei đang bận, vui lòng thử lại sau.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, profile]);

  // Removed automatic debounce as per user request for manual "Gửi" button
  useEffect(() => {
    if (text === initialValue && !result) return;
    if (!text.trim()) setResult(null);
  }, [text, initialValue, result]);

  const handleClear = () => { setText(''); setResult(null); if (onClear) onClear(); };

  /** Save to localStorage and notify GrammarHistory via custom event */
  const handleSave = () => {
    if (!result || !text.trim()) return;
    const prev = loadSavedExercises();
    const entry = { id: Date.now(), text: text.trim(), result, savedAt: new Date().toISOString() };
    const updated = [entry, ...prev].slice(0, 30);
    try { localStorage.setItem(GRAMMAR_SAVED_KEY, JSON.stringify(updated)); } catch (e) { console.error('Error saving grammar exercise:', e); }
    window.dispatchEvent(new Event(GRAMMAR_SAVED_EVENT));
    toast({ title: '✅ Đã lưu bài!', description: `"${text.trim().slice(0, 30)}${text.length > 30 ? '...' : ''}"` });
  };

  const explanationItems = result ? parseExplanation(result.explanation) : [];
  const hasNumberedItems = explanationItems.length > 1;

  return (
    <div className={cn('space-y-4', className)}>

      {/* ── Input ── */}
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (result) setResult(null); // Clear old results when typing new text
          }}
          placeholder="Nhập hoặc nói câu tiếng Nhật để kiểm tra..."
          className="min-h-[130px] pr-16 font-jp text-lg resize-none bg-background border-border rounded-2xl p-4 sm:p-5 focus-visible:ring-primary/30"
        />
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <Button onClick={() => isListening ? stopListening() : startListening()}
            variant="outline" size="icon"
            className={cn('h-9 w-9 rounded-xl border-border transition-all',
              isListening ? 'bg-red-500 text-white border-transparent animate-pulse' : 'bg-card text-primary hover:bg-primary/10')}>
            {isListening ? <MicOff className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}
          </Button>
          {text.length > 0 && (
            <Button variant="outline" size="icon" onClick={handleClear}
              className="h-9 w-9 rounded-xl bg-card border-border hover:text-destructive text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5"/>
            </Button>
          )}
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button 
            onClick={() => checkGrammar(text)}
            disabled={isLoading || !text.trim()}
            className="rounded-2xl px-8 h-12 bg-sakura hover:bg-sakura-dark text-white font-black uppercase tracking-widest gap-2 shadow-lg shadow-sakura/20 transition-all hover:scale-105 active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin"/>
            ) : (
              <>
                <Send className="h-5 w-5"/>
                <span>Gửi Sensei</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Result card ── */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
          >
            <Card className={cn(
              'border rounded-2xl overflow-hidden',
              result.isCorrect ? 'border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/10'
                               : 'border-border bg-background'
            )}>
              <div className={cn('h-1 w-full', result.isCorrect ? 'bg-green-400' : 'bg-primary')}/>

              <CardContent className="p-4 sm:p-5 space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center',
                      result.isCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-primary/10 text-primary')}>
                      {result.isCorrect ? <CheckCircle2 className="h-4.5 w-4.5"/> : <AlertCircle className="h-4.5 w-4.5"/>}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{result.isCorrect ? '✨ Chính xác!' : '📝 Cần điều chỉnh'}</p>
                      <p className="text-[10px] text-muted-foreground">Phân tích từ Sensei AI</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!result.isCorrect && (
                      <Button onClick={() => setText(result.corrected)} variant="outline" size="sm"
                        className="rounded-xl text-xs gap-1.5 border-border h-8">
                        <RefreshCcw className="h-3 w-3"/>Sửa tự động
                      </Button>
                    )}
                    <Button onClick={handleSave} variant="outline" size="sm"
                      className="rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 h-8">
                      <Save className="h-3 w-3"/>Lưu bài
                    </Button>
                  </div>
                </div>

                {/* Corrected sentence */}
                {!result.isCorrect && result.corrected && (
                  <div className="relative rounded-xl bg-primary/5 border border-primary/15 p-4 group">
                    <p className="text-[9px] uppercase tracking-widest text-primary/50 mb-1.5 font-black">Câu đúng từ Sensei</p>
                    <p className="font-jp text-xl sm:text-2xl font-bold text-foreground leading-relaxed pr-10">
                      {result.corrected}
                    </p>
                    <Button onClick={() => speak(result.corrected)} variant="ghost" size="icon"
                      className="absolute right-2 bottom-2 h-8 w-8 rounded-full text-primary/50 hover:text-primary hover:bg-primary/10">
                      <Volume2 className="h-4 w-4"/>
                    </Button>
                  </div>
                )}

                {/* Explanation */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-primary"/>Phân tích chi tiết
                  </p>
                  {hasNumberedItems ? (
                    <div className="space-y-2">
                      {explanationItems.map(({ num, content }) => (
                        <div key={num} className="flex gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                          <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center mt-0.5">
                            {num}
                          </span>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            <HighlightJP text={content}/>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed text-foreground/80 bg-muted/40 p-4 rounded-xl border border-border">
                      <HighlightJP text={result.explanation || 'Đang tải dữ liệu...'}/>
                    </div>
                  )}
                </div>

                {/* Rules + Suggestions */}
                {(result.rules?.length > 0 || result.suggestions?.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {result.rules?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-primary"/>Kiến thức bổ trợ
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.rules.map((rule, i) => (
                            <Badge key={i} variant="secondary"
                              className="bg-card border border-border text-foreground/80 px-2.5 py-1 rounded-lg text-xs">
                              {rule}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.suggestions?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground flex items-center gap-1.5">
                          <Quote className="h-3.5 w-3.5 text-primary"/>Cách nói tự nhiên
                        </p>
                        <div className="space-y-1.5">
                          {result.suggestions.map((s, i) => (
                            <div key={i} onClick={() => speak(s)}
                              className="flex items-center gap-3 text-sm bg-card border border-border hover:border-primary/40 p-3 rounded-xl cursor-pointer group/s transition-all">
                              <Volume2 className="h-3.5 w-3.5 text-primary/40 group-hover/s:text-primary transition-colors flex-shrink-0"/>
                              <span className="font-jp font-semibold text-foreground">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
