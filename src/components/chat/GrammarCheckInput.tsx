import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Sparkles, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface GrammarResult {
  isCorrect: boolean;
  corrected: string;
  explanation: string;
  rules: string[];
  suggestions: string[];
}

interface GrammarCheckInputProps {
  initialValue?: string;
  className?: string;
}

export const GrammarCheckInput: React.FC<GrammarCheckInputProps> = ({ initialValue = '', className }) => {
  const [text, setText] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GrammarResult | null>(null);
  const { toast } = useToast();

  const checkGrammar = useCallback(async (textToCheck: string) => {
    if (!textToCheck.trim() || textToCheck.length < 3) {
      setResult(null);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('japanese-grammar', {
        body: { text: textToCheck },
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
    const timer = setTimeout(() => {
      if (text !== initialValue) {
        checkGrammar(text);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [text, checkGrammar, initialValue]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập câu tiếng Nhật để kiểm tra ngữ pháp..."
          className="min-h-[120px] pr-10 font-jp text-lg resize-none"
        />
        <div className="absolute right-3 top-3">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : text.length > 0 ? (
            <Sparkles className="h-5 w-5 text-matcha animate-pulse" />
          ) : null}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className={cn(
              "border-2",
              result.isCorrect ? "border-matcha/50 bg-matcha/5" : "border-amber-500/50 bg-amber-500/5"
            )}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {result.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-matcha" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                    <span className="font-semibold">
                      {result.isCorrect ? 'Ngữ pháp chính xác!' : 'Có thể cải thiện'}
                    </span>
                  </div>
                  {!result.isCorrect && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-xs"
                      onClick={() => setText(result.corrected)}
                    >
                      <RefreshCcw className="h-3 w-3 mr-1" />
                      Sửa nhanh
                    </Button>
                  )}
                </div>

                {!result.isCorrect && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Câu đúng đề xuất:</p>
                    <p className="font-jp text-lg text-matcha-dark font-medium">{result.corrected}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Giải thích:</p>
                  <p className="text-sm">{result.explanation || "Không có giải thích."}</p>
                </div>

                {Array.isArray(result.rules) && result.rules.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {result.rules.map((rule, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] py-0 px-2">
                        {rule}
                      </Badge>
                    ))}
                  </div>
                )}

                {Array.isArray(result.suggestions) && result.suggestions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Các cách diễn đạt khác:</p>
                    <ul className="text-sm list-disc list-inside space-y-0.5">
                      {result.suggestions.map((s, i) => (
                        <li key={i} className="font-jp">{s}</li>
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
