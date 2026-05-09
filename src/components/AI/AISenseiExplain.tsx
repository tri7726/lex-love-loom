import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, BrainCircuit, Info, Loader2, X, ChevronRight, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';

interface AISenseiExplainProps {
  content: string;
  trigger?: React.ReactNode;
  mode?: 'grammar' | 'analysis';
}

export const AISenseiExplain: React.FC<AISenseiExplainProps> = ({ content, trigger, mode = 'analysis' }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchAnalysis = async () => {
    if (analysis) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: funcError } = await supabase.functions.invoke('japanese-analysis', {
        body: {
          content,
          mode: mode,
          task: mode === 'grammar' ? 'grammar' : 'analysis',
        },
      });

      if (funcError) throw funcError;
      setAnalysis(data);
    } catch (err: any) {
      console.error('AI Analysis Error:', err);
      setError(err.message || 'Không thể kết nối với AI Sensei');
    } finally {
      setLoading(false);
    }
  };

  const onOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) fetchAnalysis();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-sakura hover:bg-sakura/10 rounded-full font-bold"
          >
            <Sparkles className="h-4 w-4" /> Giải thích AI
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl bg-white/95 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-sakura/5 via-transparent to-primary/5 pointer-events-none" />
        
        <DialogHeader className="p-6 pb-2 relative z-10">
          <div className="flex items-center gap-3">
             <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sakura to-pink-400 flex items-center justify-center shadow-lg shadow-sakura/20">
                <BrainCircuit className="h-6 w-6 text-white" />
             </div>
             <div>
                <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                   AI Sensei Giải Thích
                   <Badge className="bg-sakura/10 text-sakura border-none text-[10px] uppercase font-black">AI Powered</Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-medium">Phân tích sâu ngữ pháp và ngữ cảnh</p>
             </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-full max-h-[60vh] p-6 pt-2 relative z-10">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-10 w-10 text-sakura" />
              </motion.div>
              <p className="text-sm font-bold text-muted-foreground animate-pulse">Sensei đang suy nghĩ...</p>
            </div>
          )}

          {error && (
            <div className="p-6 text-center space-y-4">
               <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <X className="h-8 w-8 text-red-500" />
               </div>
               <p className="text-red-500 font-bold">{error}</p>
               <Button variant="outline" onClick={fetchAnalysis} className="rounded-full">Thử lại</Button>
            </div>
          )}

          {analysis && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Overall Summary */}
              <section className="bg-white/50 border border-sakura/10 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                   <div className="h-7 w-7 rounded-lg bg-sakura/10 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-sakura" />
                   </div>
                   <h3 className="font-black text-sm uppercase tracking-wider text-foreground">Phân tích tổng quan</h3>
                   {analysis.analysis?.overall_analysis?.jlpt_level && (
                     <Badge className="ml-auto bg-primary/10 text-primary border-none">{analysis.analysis.overall_analysis.jlpt_level}</Badge>
                   )}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                  {analysis.analysis?.overall_analysis?.summary || analysis.result?.explanation || "Không có tóm tắt."}
                </p>
              </section>

              {/* Grammar Details (if in grammar mode) */}
              {analysis.format === 'grammar' && analysis.result?.rules_detail?.map((rule: any, i: number) => (
                <section key={i} className="space-y-3">
                  <div className="flex items-center gap-2">
                     <Badge className="bg-amber-100 text-amber-700 border-none">{rule.jlpt || 'N/A'}</Badge>
                     <h3 className="font-bold text-lg">{rule.pattern}</h3>
                  </div>
                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                     <p className="text-sm text-amber-900 font-medium">{rule.meaning}</p>
                  </div>
                  {rule.similar_examples && (
                    <div className="space-y-2">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Ví dụ tương tự</p>
                       {rule.similar_examples.map((ex: string, j: number) => (
                         <div key={j} className="flex items-start gap-2 p-3 bg-white rounded-xl border border-border/50 text-sm italic">
                            <ChevronRight className="h-4 w-4 text-sakura mt-0.5 shrink-0" />
                            <span>{ex}</span>
                         </div>
                       ))}
                    </div>
                  )}
                </section>
              ))}

              {/* Sentences Breakdown (if in analysis mode) */}
              {analysis.analysis?.sentences?.map((sentence: any, i: number) => (
                <div key={i} className="space-y-6">
                  {/* Word Breakdown */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5" /> Thành phần từ vựng
                    </h3>
                    <div className="grid gap-2">
                      {sentence.breakdown?.words?.map((w: any, j: number) => (
                        <div key={j} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border/40 hover:border-sakura/20 transition-colors shadow-sm">
                           <div className="min-w-[60px] text-center">
                              <p className="text-lg font-jp font-bold">{w.word}</p>
                              <p className="text-[10px] text-muted-foreground font-medium">{w.reading}</p>
                           </div>
                           <div className="h-8 w-px bg-border/40" />
                           <div className="flex-1">
                              <p className="text-xs font-bold text-foreground">{w.meaning}</p>
                              <div className="flex gap-1.5 mt-1">
                                 <Badge variant="outline" className="text-[8px] py-0 h-4 border-muted-foreground/20 text-muted-foreground font-black uppercase">{w.pos}</Badge>
                                 {w.hanviet && <Badge variant="outline" className="text-[8px] py-0 h-4 border-gold/30 text-gold-dark font-black uppercase">{w.hanviet}</Badge>}
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grammar Patterns */}
                  {sentence.breakdown?.grammar_patterns?.length > 0 && (
                    <div className="space-y-3">
                       <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                         <Zap className="h-3.5 w-3.5" /> Ngữ pháp chính
                       </h3>
                       <div className="space-y-2">
                         {sentence.breakdown.grammar_patterns.map((g: any, j: number) => (
                           <div key={j} className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                              <p className="text-sm font-bold text-indigo-700 mb-1">{g.pattern}</p>
                              <p className="text-xs text-indigo-900 leading-relaxed font-medium">{g.meaning}</p>
                           </div>
                         ))}
                       </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Cultural Notes */}
              {analysis.analysis?.cultural_notes?.length > 0 && (
                <section className="bg-amber-50/30 rounded-3xl p-5 border border-amber-100/50">
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 flex items-center gap-2 mb-3">
                    <Info className="h-3.5 w-3.5" /> Ghi chú văn hóa
                  </h3>
                  <ul className="space-y-2">
                    {analysis.analysis.cultural_notes.map((note: string, i: number) => (
                      <li key={i} className="text-xs text-amber-900 leading-relaxed font-medium flex gap-2">
                         <span className="text-amber-400">•</span> {note}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </motion.div>
          )}
        </ScrollArea>

        <div className="p-6 pt-2 text-center text-[10px] text-muted-foreground/40 font-medium">
           AI Sensei có thể đưa ra câu trả lời không chính xác 100%. Vui lòng đối chiếu với giáo trình.
        </div>
      </DialogContent>
    </Dialog>
  );
};
