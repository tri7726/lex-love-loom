import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, Sparkles, RefreshCcw, Trash2, Mic, MicOff, Volume2, Info, BookOpen, Quote } from 'lucide-react';
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

export const GrammarCheckInput: React.FC<GrammarCheckInputProps> = ({ 
  initialValue = '', 
  className,
  onClear
}) => {
  const [text, setText] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GrammarResult | null>(null);
  const { toast } = useToast();
  const { profile } = useProfile();
  const { speak, isSpeaking } = useTTS();
  const { isListening, startListening, stopListening } = useSpeechToText({
    onResult: (transcript) => setText(transcript)
  });

  const checkGrammar = useCallback(async (textToCheck: string) => {
    if (!textToCheck.trim() || textToCheck.length < 2) {
      setResult(null);
      return;
    }

    setIsLoading(true);
    try {
      const userContext = profile ? 
        `User is level ${profile.level}, name ${profile.full_name || 'Gakusei'}.` : 
        "User is learning Japanese.";

      const { data, error: invokeError } = await supabase.functions.invoke('japanese-analysis', {
        body: { 
          content: textToCheck, 
          isGrammar: true,
          isVip: true,
          prompt: `[Context: ${userContext}] Please check my grammar carefully Sensei!`
        },
      });

      if (invokeError) throw invokeError;
      
      if (data?.error && !data.explanation) {
        toast({
          title: 'Sensei Note',
          description: data.error,
        });
      }
      
      setResult(data);
    } catch (error: any) {
      console.error('Grammar check error:', error);
      toast({
        title: 'Lỗi Sensei',
        description: 'Sensei đang bận, vui lòng thử lại sau.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Debounce effect
  useEffect(() => {
    if (text === initialValue && !result) return;
    
    const timer = setTimeout(() => {
      if (text.trim() && text !== initialValue) {
        checkGrammar(text);
      } else if (!text.trim()) {
        setResult(null);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [text, checkGrammar, initialValue, result]);

  const handleClear = () => {
    setText('');
    setResult(null);
    if (onClear) onClear();
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="relative group">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập hoặc nói câu tiếng Nhật để kiểm tra..."
          className="min-h-[150px] pr-28 font-jp text-lg resize-none bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-sakura/10 dark:border-slate-800 transition-all rounded-3xl p-6 shadow-soft focus-visible:ring-sakura/30"
        />
        <div className="absolute right-4 top-4 flex flex-col gap-3">
            <Button
              onClick={() => isListening ? stopListening() : startListening()}
              variant="outline"
              size="icon"
              className={cn(
                 "h-12 w-12 rounded-2xl transition-all shadow-sm border-sakura/20",
                 isListening ? "bg-red-500 text-white shadow-lg border-transparent animate-pulse" : "bg-white/80 dark:bg-slate-900/80 text-sakura hover:bg-sakura/10"
              )}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          
          {text.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:text-destructive text-slate-400 transition-all shadow-sm"
              onClick={handleClear}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          {isLoading && (
            <div className="h-10 w-10 rounded-xl bg-white/80 dark:bg-slate-900/80 border-sakura/10 flex items-center justify-center shadow-sm">
               <Loader2 className="h-5 w-5 animate-spin text-sakura" />
            </div>
          )}
        </div>

        {text.length > 0 && !isLoading && !result && (
          <div className="absolute left-6 bottom-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sakura/50">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Sensei đang xem xét...
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="relative"
          >
            <Card className={cn(
              "border-0 overflow-hidden shadow-soft relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl",
              result.isCorrect ? "bg-green-50/30 dark:bg-green-950/10" : "bg-sakura/5 dark:bg-slate-900/90"
            )}>
              <div className={cn(
                "h-1.5 w-full",
                result.isCorrect ? "bg-green-500" : "bg-sakura"
              )} />
              
              <CardContent className="p-8 space-y-8">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center shadow-md",
                      result.isCorrect ? "bg-green-500 text-white" : "bg-sakura text-white shadow-sakura/20"
                    )}>
                      {result.isCorrect ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <AlertCircle className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold leading-tight">
                        {result.isCorrect ? 'Tuyệt vời, chính xác!' : 'Cần điều chỉnh'}
                      </h4>
                      <p className="text-xs text-muted-foreground font-medium">Bản tin từ Sensei AI</p>
                    </div>
                  </div>
                  {!result.isCorrect && (
                    <Button 
                      onClick={() => setText(result.corrected)}
                      variant="outline"
                      className="border-sakura/20 text-sakura hover:bg-sakura/10 rounded-xl h-10 px-4 text-xs font-bold transition-all shadow-sm"
                    >
                      <RefreshCcw className="h-3.5 w-3.5 mr-2" />
                      Sửa tự động
                    </Button>
                  )}
                </div>

                {!result.isCorrect && (
                  <div className="rounded-[2rem] bg-white/50 dark:bg-slate-950/50 border border-sakura/10 p-6 relative group hover:border-sakura/30 transition-all shadow-inner-soft">
                    <p className="text-[9px] uppercase tracking-[0.2em] font-black text-sakura/60 mb-3">Câu đúng từ Sensei</p>
                    <p className="font-jp text-2xl text-foreground font-bold leading-relaxed pr-12">
                      {result.corrected}
                    </p>
                    <Button
                      onClick={() => speak(result.corrected)}
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 bottom-4 h-10 w-10 rounded-full text-sakura hover:bg-sakura/10"
                    >
                      <Volume2 className="h-5 w-5" />
                    </Button>
                  </div>
                )}

                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground flex items-center gap-2 px-2">
                    <Info className="h-3.5 w-3.5 text-sakura" />
                    Phân tích từ Sensei
                  </p>
                  <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 bg-white/40 dark:bg-slate-800/40 p-5 rounded-2xl border border-white/20 shadow-sm italic font-medium">
                    {result.explanation || "Đang tải dữ liệu phân tích..."}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                  {Array.isArray(result.rules) && result.rules.length > 0 && (
                    <div className="space-y-4">
                       <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground flex items-center gap-2 px-2">
                         <BookOpen className="h-3.5 w-3.5 text-sakura" />
                         Kiến thức bổ trợ
                       </p>
                       <div className="flex flex-wrap gap-2">
                          {result.rules.map((rule, i) => (
                           <Badge key={i} variant="secondary" className="bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-sakura/10 px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                              {rule}
                            </Badge>
                          ))}
                       </div>
                    </div>
                  )}

                  {Array.isArray(result.suggestions) && result.suggestions.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground flex items-center gap-2 px-2">
                        <Quote className="h-3.5 w-3.5 text-sakura" />
                        Cách nói tự nhiên
                      </p>
                      <div className="space-y-3">
                        {result.suggestions.map((s, i) => (
                          <div 
                            key={i} 
                            onClick={() => speak(s)}
                            className="flex items-center gap-4 text-sm bg-white/40 dark:bg-white/5 hover:bg-sakura/10 p-4 rounded-2xl border border-white/20 transition-all cursor-pointer group/s shadow-sm"
                          >
                            <Volume2 className="h-4 w-4 text-sakura opacity-40 group-hover/s:opacity-100 transition-opacity" />
                            <span className="font-jp font-bold text-slate-800 dark:text-slate-200">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// export default GrammarCheckInput;
