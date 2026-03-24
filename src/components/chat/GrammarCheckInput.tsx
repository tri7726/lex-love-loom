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
import { useAI } from '@/contexts/AIContext';
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

/* ──────── Highlight Japanese text ──────── */
const HighlightJP: React.FC<{text: string}> = ({ text }) => {
  if (!text) return null;
  // Match 「」 or specific JP grammar patterns
  const parts = text.split(/(「[^」]*」)/g);
  return (
    <span className="leading-relaxed">
      {parts.map((p, i) =>
        /^「/.test(p)
          ? <span key={i} className="font-jp font-bold text-sakura bg-sakura/10 px-1.5 py-0.5 rounded-md mx-0.5 shadow-sm border border-sakura/5 inline-block">{p}</span>
          : <span key={i} className="opacity-90">{p}</span>
      )}
    </span>
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
  const { checkGrammar: aiCheckGrammar, isAnalyzing: isLoading } = useAI();
  const [result, setResult] = useState<GrammarResult | null>(null);
  const { toast } = useToast();
  const { profile } = useProfile();
  const { speak } = useTTS();
  const { isListening, startListening, stopListening } = useSpeechToText({
    onResult: (transcript) => setText(transcript)
  });

  const checkGrammar = useCallback(async (textToCheck: string) => {
    if (!textToCheck.trim() || textToCheck.length < 2) { 
      setResult(null); 
      return; 
    }
    
    try {
      // Local PicoClaw check (Low latency)
      let localSuccess = false;
      try {
        const response = await fetch('http://localhost:18790/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3',
            messages: [
              { role: 'system', content: 'You are a helpful Japanese Sensei. Always respond in valid JSON format.' },
              { role: 'user', content: `Check grammar for: "${textToCheck}"` }
            ],
            response_format: { type: "json_object" }
          }),
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              setResult(JSON.parse(jsonMatch[0]));
              localSuccess = true;
            }
          }
        }
      } catch (localErr) {
        console.log('Local PicoClaw not available.');
      }

      if (localSuccess) return;

      // Fallback to Unified AI Provider
      const data = await aiCheckGrammar(textToCheck);
      
      if (data) {
        const grammarResult = data.format === 'grammar' ? data.result : data;
        setResult(grammarResult);
      }
    } catch (error) {
      console.error('Grammar check failed:', error);
      toast({ 
        title: 'Lỗi Sensei', 
        description: 'Sensei đang bận, vui lòng thử lại sau.', 
        variant: 'destructive' 
      });
    }
  }, [toast, aiCheckGrammar]);

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
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-sakura/20 to-sakura-light/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative">
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (result) setResult(null); // Clear old results when typing new text
            }}
            placeholder="Nhập hoặc nói câu tiếng Nhật để kiểm tra..."
            className="min-h-[140px] pr-16 font-jp text-lg resize-none bg-white/80 dark:bg-black/40 backdrop-blur-sm border-sakura/20 rounded-2xl p-5 sm:p-6 focus-visible:ring-sakura/30 shadow-card transition-all"
          />
          <div className="absolute right-4 top-4 flex flex-col gap-2.5">
            <Button onClick={() => isListening ? stopListening() : startListening()}
              variant="outline" size="icon"
              className={cn('h-10 w-10 rounded-xl border-border/50 shadow-sm transition-all active:scale-95',
                isListening ? 'bg-destructive text-white border-transparent animate-pulse' : 'bg-white/80 dark:bg-card text-sakura hover:bg-sakura/10 hover:border-sakura/30')}>
              {isListening ? <MicOff className="h-4.5 w-4.5"/> : <Mic className="h-4.5 w-4.5"/>}
            </Button>
            {text.length > 0 && (
              <Button variant="outline" size="icon" onClick={handleClear}
                className="h-10 w-10 rounded-xl bg-white/80 dark:bg-card border-border/50 shadow-sm hover:text-destructive text-muted-foreground hover:bg-destructive/5 active:scale-95">
                <Trash2 className="h-4 w-4"/>
              </Button>
            )}
          </div>
        </div>
        
        <div className="mt-5 flex justify-end">
          <Button 
            onClick={() => checkGrammar(text)}
            disabled={isLoading || !text.trim()}
            className="rounded-full px-10 h-13 bg-sakura hover:bg-sakura-dark text-white font-black uppercase tracking-[0.2em] gap-3 shadow-soft transition-all hover:translate-y-[-2px] active:translate-y-[1px]"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin"/>
            ) : (
              <>
                <Send className="h-5 w-5 transform transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"/>
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
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <Card className={cn(
              'border-none rounded-[2rem] overflow-hidden shadow-elevated relative',
              result.isCorrect ? 'bg-gradient-to-br from-green-50/80 to-green-100/80 dark:from-green-950/20 dark:to-green-900/20'
                               : 'bg-white/60 dark:bg-card/60 backdrop-blur-xl border border-white/20'
            )}>
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-sakura/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
              
              <CardContent className="p-6 sm:p-8 space-y-8 relative z-10">

                {/* Header Section */}
                <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-sakura/10">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                      className={cn('h-12 w-12 rounded-2xl flex items-center justify-center shadow-soft',
                        result.isCorrect ? 'bg-green-500 text-white' : 'bg-sakura text-white')}>
                      {result.isCorrect ? <CheckCircle2 className="h-6 w-6"/> : <Sparkles className="h-6 w-6"/>}
                    </motion.div>
                    <div>
                      <h3 className="font-bold text-xl tracking-tight text-foreground">
                        {result.isCorrect ? '✨ Tuyệt vời!' : '📝 Lời khuyên của Sensei'}
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-70">Analysis by PicoClaw Engine</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    {!result.isCorrect && (
                      <Button onClick={() => setText(result.corrected)} variant="outline" size="sm"
                        className="rounded-full px-4 text-xs gap-2 border-sakura/30 h-9 hover:bg-sakura/5 transition-colors">
                        <RefreshCcw className="h-3.5 w-3.5"/>Tự động sửa
                      </Button>
                    )}
                    <Button onClick={handleSave} variant="default" size="sm"
                      className="rounded-full px-4 text-xs gap-2 bg-sakura/10 text-sakura hover:bg-sakura/20 border-none h-9 shadow-sm">
                      <Save className="h-3.5 w-3.5"/>Lưu vào kho
                    </Button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Corrected Sentence & Suggestions */}
                  <div className="lg:col-span-12 space-y-6">
                    {!result.isCorrect && result.corrected && (
                      <motion.div 
                        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                        className="relative rounded-[1.5rem] bg-gradient-to-br from-sakura to-sakura-dark p-[1px] shadow-lg overflow-hidden group">
                        <div className="bg-white/95 dark:bg-gray-950/90 p-6 rounded-[1.45rem] h-full">
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-sakura/60 bg-sakura/5 px-3 py-1 rounded-full">Câu đúng từ Sensei</span>
                            <Button onClick={() => speak(result.corrected)} variant="ghost" size="icon"
                              className="h-10 w-10 rounded-full text-sakura hover:bg-sakura/10 hover:scale-110 active:scale-95 transition-all">
                              <Volume2 className="h-5 w-5"/>
                            </Button>
                          </div>
                          <p className="font-jp text-2xl sm:text-3xl font-bold text-foreground leading-relaxed">
                            {result.corrected}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Quick Analysis Overview */}
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                      className="space-y-4">
                      <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
                        <Info className="h-4 w-4 text-sakura"/> Giải thích chi tiết
                      </h4>
                      {hasNumberedItems ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {explanationItems.map(({ num, content }, idx) => (
                            <motion.div 
                              key={num}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + idx * 0.1 }}
                              className="flex gap-4 p-5 rounded-2xl bg-sakura-light/30 border border-sakura/5 hover:bg-sakura-light/50 transition-colors">
                              <span className="flex-shrink-0 h-7 w-7 rounded-xl bg-sakura text-white text-xs font-black flex items-center justify-center shadow-sm">
                                {num}
                              </span>
                              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
                                <HighlightJP text={content}/>
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-base leading-relaxed text-foreground/90 bg-sakura-light/30 p-6 rounded-2xl border border-sakura/5">
                          <HighlightJP text={result.explanation || 'Sensei đang suy nghĩ...'}/>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* Knowledge Cards */}
                  <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {result.rules?.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="p-6 rounded-[1.5rem] bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-500/10 space-y-4">
                        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                          <BookOpen className="h-4 w-4"/> Kiến thức trọng tâm
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {result.rules.map((rule, i) => (
                            <Badge key={i} variant="secondary"
                              className="bg-white dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border-none">
                              {rule}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {result.suggestions?.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        className="p-6 rounded-[1.5rem] bg-amber-50/30 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-500/10 space-y-4">
                        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                          <Quote className="h-4 w-4"/> Biến thể tự nhiên
                        </h4>
                        <div className="space-y-2.5">
                          {result.suggestions.map((s, i) => (
                            <div key={i} onClick={() => speak(s)}
                              className="flex items-center justify-between gap-3 text-sm bg-white/80 dark:bg-amber-900/30 hover:bg-amber-50 dark:hover:bg-amber-900/50 p-3.5 rounded-xl cursor-pointer group/s transition-all shadow-sm">
                              <span className="font-jp font-bold text-foreground pr-4">{s}</span>
                              <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-200 opacity-60 group-hover/s:opacity-100 transition-opacity">
                                <Volume2 className="h-4 w-4"/>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
