import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles, BrainCircuit, Loader2, Send, Lightbulb, BookOpen, Globe, Quote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AnalysisData {
  overall_analysis: {
    jlpt_level: string;
    politeness_level: string;
    text_type: string;
    summary: string;
  };
  sentences: {
    japanese: string;
    vietnamese: string;
    breakdown: {
      words: {
        word: string;
        reading: string;
        hanviet?: string;
        meaning: string;
        word_type: string;
      }[];
      grammar_patterns: {
        pattern: string;
        meaning: string;
        usage: string;
      }[];
    };
  }[];
  cultural_notes: string[];
}

export const HybridTutor = () => {
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [engine, setEngine] = useState<'groq' | 'gemini' | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!content.trim()) return;

    setIsLoading(true);
    setResult(null);
    setEngine(null);

    try {
      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: { content, prompt },
      });

      if (error) throw error;
      
      if (data.format === 'structured') {
        setResult(data.analysis);
        setEngine(data.engine);
      } else {
        toast({
          title: 'Kết quả không xác định',
          description: 'AI không trả về dữ liệu cấu trúc. Thử lại sau.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Hybrid analysis error:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể phân tích dữ liệu lúc này.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input area */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-matcha" />
              Văn bản tiếng Nhật
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Dán đoạn văn tiếng Nhật bạn muốn học vào đây..."
              className="min-h-[200px] font-jp text-lg resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-sakura" />
              Câu hỏi hoặc yêu cầu (tùy chọn)
            </label>
            <div className="relative">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Giải thích sự khác biệt giữa honne và tatemae trong đoạn này"
                className="min-h-[80px] pr-12 resize-none"
              />
              <Button 
                onClick={handleAnalyze} 
                disabled={isLoading || !content.trim()}
                className="absolute right-2 bottom-2 h-8 w-8 p-0 bg-matcha hover:bg-matcha-dark"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <p className="text-xs text-muted-foreground w-full mb-1">Thử gõ các từ khóa để kích hoạt Gemini:</p>
            {['Giải thích văn hóa', 'Tại sao dùng...', 'Sắc thái từ vựng'].map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="cursor-pointer hover:bg-muted"
                onClick={() => setPrompt(prev => prev ? prev + ' ' + tag : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Result area */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[400px] flex flex-col items-center justify-center text-center gap-4 bg-muted/20 rounded-xl"
              >
                <div className="relative">
                  <BrainCircuit className="h-12 w-12 text-matcha animate-pulse" />
                  <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-sakura animate-bounce" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">AI Tutor đang suy nghĩ...</p>
                  <p className="text-xs text-muted-foreground">Đang phân tích sâu cấu trúc và ngữ cảnh</p>
                </div>
              </motion.div>
            ) : result ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Engine Badge */}
                <div className="flex justify-end">
                  <Badge variant="secondary" className="gap-1.5 py-1">
                    {engine === 'gemini' ? (
                      <><Sparkles className="h-3 w-3 text-purple-500" /> Powered by Gemini (Deep Analysis)</>
                    ) : (
                      <><BrainCircuit className="h-3 w-3 text-matcha" /> Powered by Groq (Fast Analysis)</>
                    )}
                  </Badge>
                </div>

                {/* Overall Summary */}
                <Card className="border-l-4 border-l-matcha bg-matcha/5">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-matcha" />
                      Tổng quan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    <div className="flex gap-4 mb-3">
                      <Badge variant="outline">{result.overall_analysis.jlpt_level}</Badge>
                      <Badge variant="outline" className="capitalize">{result.overall_analysis.politeness_level}</Badge>
                      <Badge variant="outline" className="capitalize">{result.overall_analysis.text_type}</Badge>
                    </div>
                    <p className="text-sm leading-relaxed">{result.overall_analysis.summary}</p>
                  </CardContent>
                </Card>

                {/* Sentence Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 px-1">
                    <Quote className="h-4 w-4 text-sakura" />
                    Phân tích chi tiết
                  </h3>
                  {result.sentences.map((sentence, sIdx) => (
                    <div key={sIdx} className="space-y-3 p-4 bg-muted/40 rounded-xl border border-muted">
                      <div className="space-y-1">
                        <p className="text-lg font-jp font-medium">{sentence.japanese}</p>
                        <p className="text-sm text-muted-foreground italic">{sentence.vietnamese}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {sentence.breakdown.words.map((w, wIdx) => (
                          <div key={wIdx} className="group relative">
                            <Badge variant="secondary" className="font-jp py-1 hover:bg-matcha hover:text-white transition-colors cursor-help">
                              {w.word}
                            </Badge>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none border text-xs">
                              <p className="font-bold font-jp">{w.word} ({w.reading})</p>
                              {w.hanviet && <p className="text-sakura">Hán Việt: {w.hanviet}</p>}
                              <p className="mt-1">{w.meaning}</p>
                              <Badge variant="outline" className="mt-1 text-[10px] h-4">{w.word_type}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      {sentence.breakdown.grammar_patterns.length > 0 && (
                        <div className="pt-2 space-y-2">
                          {sentence.breakdown.grammar_patterns.map((g, gIdx) => (
                            <div key={gIdx} className="text-xs bg-background/50 p-2 rounded border border-dotted border-sakura/30">
                              <span className="font-bold text-sakura">{g.pattern}</span>: {g.meaning}
                              <p className="text-muted-foreground mt-1">{g.usage}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Cultural Notes */}
                {result.cultural_notes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 px-1">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      Ghi chú văn hóa & ngữ cảnh
                    </h3>
                    <div className="space-y-2">
                      {result.cultural_notes.map((note, nIdx) => (
                        <div key={nIdx} className="p-3 text-sm bg-yellow-500/5 border-l-2 border-yellow-500 rounded-r-lg">
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                <p>Nhập văn bản và câu hỏi bên trái để bắt đầu buổi học cùng AI Tutor.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// export default HybridTutor;
