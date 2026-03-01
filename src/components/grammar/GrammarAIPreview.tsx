import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface GrammarResult {
  isCorrect: boolean;
  corrected: string;
  explanation: string;
  rules: string[];
  suggestions: string[];
}

export const GrammarAIPreview = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GrammarResult | null>(null);
  const { toast } = useToast();

  const handleCheck = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('japanese-grammar', {
        body: { text: input }
      });

      if (error) throw error;
      setResult(data);
    } catch (error) {
      console.error('Grammar check error:', error);
      toast({
        title: "Lỗi kết nối",
        description: "Không thể kết nối với AI. Vui lòng thử lại sau.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setInput('');
    setResult(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-gold" />
          AI Kiểm tra Ngữ pháp
        </h2>
        <p className="text-muted-foreground">
          Nhập câu tiếng Nhật của bạn để AI phân tích và sửa lỗi.
        </p>
      </div>

      <Card className="border-2 border-primary/20 shadow-soft overflow-hidden">
        <CardContent className="p-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ví dụ: 私は学生います..."
            className="min-h-[150px] border-none focus-visible:ring-0 text-lg font-jp p-6 resize-none"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between p-4 bg-muted/30 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isLoading || !input}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Làm mới
            </Button>
            <Button
              onClick={handleCheck}
              disabled={isLoading || !input.trim()}
              className="gap-2 bg-sakura hover:bg-sakura/90 px-6"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Kiểm tra ngay
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Status & Corrected */}
            <Card className={cn(
               "border-2",
               result.isCorrect ? "border-green-500/30 bg-green-50/50" : "border-amber-500/30 bg-amber-50/50"
            )}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {result.isCorrect ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-amber-500 shrink-0" />
                  )}
                  <div className="space-y-4 flex-1">
                    <div>
                      <h3 className="font-bold text-lg mb-1">
                        {result.isCorrect ? "Câu của bạn rất chính xác!" : "Cần điều chỉnh một chút"}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.rules.map((rule, i) => (
                          <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">
                            {rule}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {!result.isCorrect && (
                      <div className="p-4 bg-background rounded-xl border-2 border-primary/10 shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Đề xuất sửa lỗi</p>
                        <p className="text-xl font-jp text-primary font-bold">
                          {result.corrected}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" /> Giải thích
                        </p>
                        <p className="text-sm leading-relaxed text-foreground/80">
                            {result.explanation}
                        </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Natural Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <Card className="border-2 border-indigo-jp/20 bg-indigo-jp/5 shadow-soft">
                <CardContent className="p-6">
                  <h4 className="font-bold flex items-center gap-2 mb-4 text-indigo-jp">
                    <Sparkles className="h-5 w-5" />
                    Cách diễn đạt tự nhiên hơn
                  </h4>
                  <div className="space-y-3">
                    {result.suggestions.map((suggestion, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-indigo-jp/10">
                        <ArrowRight className="h-4 w-4 text-indigo-jp" />
                        <span className="font-jp text-lg">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
