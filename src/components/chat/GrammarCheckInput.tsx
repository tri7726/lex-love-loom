import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, Sparkles, RefreshCcw, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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

  const checkGrammar = useCallback(async (textToCheck: string) => {
    if (!textToCheck.trim() || textToCheck.length < 2) {
      setResult(null);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('japanese-analysis', {
        body: { content: textToCheck, isGrammar: true },
      });

      if (invokeError) throw invokeError;
      
      if (data?.error && !data.explanation) {
        toast({
          title: 'Lưu ý từ AI',
          description: data.error,
          variant: 'default',
        });
      }
      
      setResult(data);
    } catch (error: any) {
      console.error('Grammar check error:', error);
      toast({
        title: 'Lỗi kết nối',
        description: error.message || 'Không thể kết nối với hệ thống kiểm tra ngữ pháp.',
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
    <div className={cn("space-y-4", className)}>
      <div className="relative group">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập câu tiếng Nhật để kiểm tra ngữ pháp..."
          className="min-h-[140px] pr-12 font-jp text-lg resize-none shadow-sm focus-visible:ring-matcha transition-all bg-card/50"
        />
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-matcha" />
          ) : text.length > 0 ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                onClick={handleClear}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : null}
          {text.length > 0 && !isLoading && (
            <Sparkles className="h-5 w-5 text-gold/60 animate-pulse ml-1.5" />
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Card className={cn(
              "border-2 overflow-hidden shadow-md",
              result.isCorrect ? "border-matcha/40 bg-matcha/5" : "border-amber-500/40 bg-amber-500/5"
            )}>
              <div className={cn(
                "h-1.5 w-full",
                result.isCorrect ? "bg-matcha" : "bg-amber-500"
              )} />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "p-1.5 rounded-full",
                      result.isCorrect ? "bg-matcha/20 text-matcha" : "bg-amber-500/20 text-amber-500"
                    )}>
                      {result.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-base leading-tight">
                        {result.isCorrect ? 'Ngữ pháp chính xác!' : 'Phát hiện lỗi ngữ pháp'}
                      </h4>
                      <p className="text-xs text-muted-foreground">Phân tích bởi AI</p>
                    </div>
                  </div>
                  {!result.isCorrect && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 px-4 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600 transition-all font-medium whitespace-nowrap"
                      onClick={() => setText(result.corrected)}
                    >
                      <RefreshCcw className="h-3.5 w-3.5 mr-2" />
                      Sửa tự động
                    </Button>
                  )}
                </div>

                {!result.isCorrect && (
                  <div className="rounded-lg bg-background/50 border p-3 border-amber-500/20">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Gợi ý sửa đổi</p>
                    <p className="font-jp text-xl text-matcha-dark font-semibold selection:bg-matcha/30 leading-relaxed">
                      {result.corrected}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Giải thích chi tiết</p>
                  <p className="text-sm leading-relaxed text-foreground/90 bg-background/30 p-2.5 rounded-md italic">
                    {result.explanation || "AI không cung cấp giải thích cụ thể, vui lòng thử lại."}
                  </p>
                </div>

                {Array.isArray(result.rules) && result.rules.length > 0 && (
                  <div className="space-y-2">
                     <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Quy tắc áp dụng</p>
                     <div className="flex flex-wrap gap-2">
                        {result.rules.map((rule, i) => (
                          <Badge key={i} variant="secondary" className="bg-matcha/10 text-matcha-dark hover:bg-matcha/20 border-none px-2.5 py-0.5 font-medium">
                            {rule}
                          </Badge>
                        ))}
                     </div>
                  </div>
                )}

                {Array.isArray(result.suggestions) && result.suggestions.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-muted-foreground/10">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Các cách diễn đạt khác</p>
                    <ul className="grid gap-2">
                      {result.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm bg-background/40 hover:bg-background/60 p-2 rounded transition-colors group">
                          <span className="text-matcha mt-1 group-hover:scale-125 transition-transform">•</span>
                          <span className="font-jp flex-1">{s}</span>
                        </li>
                      ))}
                    </ul>
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


// export default GrammarCheckInput;
