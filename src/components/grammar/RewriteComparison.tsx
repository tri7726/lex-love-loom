import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Trophy, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CompareSentence {
  text: string;
  naturalness_rank: number;
  is_most_natural: boolean;
  analysis: string;
  formality_level: string;
  context_suitable: string[];
}

interface CompareResult {
  sentences: CompareSentence[];
  verdict: string;
  differences: Array<{
    aspect: string;
    detail: string;
  }>;
}

interface RewriteComparisonProps {
  className?: string;
}

const RewriteComparison: React.FC<RewriteComparisonProps> = ({ className }) => {
  const { toast } = useToast();
  const [sentences, setSentences] = useState<string[]>(['', '']);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSentenceChange = (index: number, value: string) => {
    const next = [...sentences];
    next[index] = value;
    setSentences(next);
  };

  const addSentence = () => {
    if (sentences.length < 3) setSentences([...sentences, '']);
  };

  const removeSentence = (index: number) => {
    if (sentences.length > 2) setSentences(sentences.filter((_, i) => i !== index));
  };

  const handleCompare = async () => {
    const valid = sentences.map(s => s.trim()).filter(s => s.length > 0);
    if (valid.length < 2) {
      toast({ title: 'Cần ít nhất 2 câu', description: 'Nhập ít nhất 2 câu tiếng Nhật để so sánh.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: { content: valid.join('\n'), isComparison: true, compare_sentences: valid },
      });
      if (error) throw error;
      if (data?.format === 'compare') {
        setResult(data.result as CompareResult);
      } else {
        toast({ title: 'Lỗi', description: 'Không thể so sánh lúc này.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Lỗi', description: 'Sensei đang bận, thử lại sau.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const rankColors = ['from-emerald-500 to-emerald-600', 'from-amber-500 to-amber-600', 'from-gray-400 to-gray-500'];
  const rankLabels = ['Tự nhiên nhất', 'Khá tự nhiên', 'Ít tự nhiên'];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Input area */}
      <Card className="border border-indigo-100/60 rounded-2xl bg-white/60">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" /> So sánh câu
          </h3>
          <p className="text-xs text-muted-foreground">Nhập 2-3 cách viết khác nhau của cùng một ý để Sensei phân tích</p>

          {sentences.map((s, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-[10px] font-bold text-indigo-400 mt-3 w-5 shrink-0">{String.fromCharCode(65 + i)}</span>
              <div className="flex-1">
                <textarea
                  value={s}
                  onChange={(e) => handleSentenceChange(i, e.target.value)}
                  placeholder={`Câu ${String.fromCharCode(65 + i)}...`}
                  className="w-full font-jp text-sm p-3 rounded-xl border border-indigo-100/60 bg-white/80 resize-none h-14 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                />
              </div>
              {sentences.length > 2 && (
                <button onClick={() => removeSentence(i)} className="text-xs text-rose-400 hover:text-rose-600 mt-3">✕</button>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            {sentences.length < 3 && (
              <Button onClick={addSentence} variant="outline" size="sm" className="rounded-full text-xs border-indigo-200/50">
                + Thêm câu
              </Button>
            )}
            <Button onClick={handleCompare} disabled={isLoading} className="rounded-full text-xs gap-1.5 bg-indigo-500 hover:bg-indigo-600 ml-auto">
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              So sánh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Ranked sentences */}
          <div className="grid gap-3">
            {result.sentences.sort((a, b) => a.naturalness_rank - b.naturalness_rank).map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'p-4 rounded-2xl border-2 relative overflow-hidden',
                  s.is_most_natural ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100 bg-white/60'
                )}
              >
                {/* Rank badge */}
                <div className={cn(
                  'absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-white text-[9px] font-black uppercase tracking-wider bg-gradient-to-r',
                  rankColors[i] || 'from-gray-400 to-gray-500'
                )}>
                  #{s.naturalness_rank} — {rankLabels[i] || ''}
                </div>

                {s.is_most_natural && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-500" />
                )}

                <div className="space-y-2 pr-20">
                  {s.is_most_natural && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <Trophy className="h-3 w-3" /> BEST
                    </span>
                  )}
                  <p className="font-jp text-base font-bold text-foreground">{s.text}</p>
                  <p className="text-xs text-foreground/70 leading-relaxed">{s.analysis}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[9px] border-indigo-200 text-indigo-600">
                      {s.formality_level}
                    </Badge>
                    {s.context_suitable.map((ctx, ci) => (
                      <span key={ci} className="text-[8px] bg-white border border-gray-100 text-muted-foreground px-1.5 py-0.5 rounded-full">
                        {ctx}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Verdict */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-1">Kết luận</p>
            <p className="text-sm font-medium leading-relaxed">{result.verdict}</p>
          </div>

          {/* Differences table */}
          {result.differences.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                <Info className="h-3 w-3" /> So sánh chi tiết
              </h4>
              <div className="grid gap-2">
                {result.differences.map((d, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-white/70 border border-indigo-100/50">
                    <p className="text-[11px] font-bold text-indigo-700 mb-1">{d.aspect}</p>
                    <p className="text-xs text-foreground/70 leading-relaxed">{d.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default RewriteComparison;
