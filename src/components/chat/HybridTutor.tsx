import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles, BrainCircuit, Loader2, Send, Lightbulb, BookOpen, Globe, Quote, Mic, MicOff, Volume2, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTTS } from '@/hooks/useTTS';
import { useProfile } from '@/hooks/useProfile';

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
  const { profile } = useProfile();
  const { speak, isSpeaking } = useTTS();
  const { isListening, startListening, stopListening } = useSpeechToText({
    onResult: (text) => setPrompt(text)
  });

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setIsLoading(true);
    setResult(null);
    setEngine(null);

    try {
      const userContext = profile
        ? `User is level ${profile.level}, has ${profile.xp} XP and a streak of ${profile.streak} days. Name: ${profile.full_name || 'Gakusei'}.`
        : 'User is a Japanese learner.';

      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: {
          content,
          prompt: `[Context: ${userContext}] ${prompt}`,
          isVip: true
        },
      });

      if (error) throw error;

      if (data.format === 'structured') {
        setResult(data.analysis);
        setEngine(data.engine);
        toast({
          title: 'Phân tích VIP hoàn tất',
          description: `Sensei đã hoàn thành phân tích sâu bằng ${data.engine}.`,
        });
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

  const handleMicToggle = () => {
    if (isListening) stopListening(); else startListening();
  };

  const playEntireText = () => {
    if (!result) return;
    speak(result.sentences.map(s => s.japanese).join('. '));
  };

  const scenarios = [
    { label: 'Giải thích văn hóa', prompt: 'Giải thích các yếu tố văn hóa và sắc thái trong đoạn này.' },
    { label: 'Đóng vai hội thoại', prompt: 'Hãy đóng vai Sensei và cùng tôi luyện tập hội thoại dựa trên đoạn văn này.' },
    { label: 'Tìm từ đồng nghĩa', prompt: 'Tìm các từ vựng đồng nghĩa hoặc cách diễn đạt tự nhiên hơn cho các câu trên.' }
  ];

  return (
    <div className="space-y-6">
      <div className={cn('grid grid-cols-1 gap-8 transition-all duration-500', (result || isLoading) ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto')}>

        {/* ── Input area ── */}
        <div className="space-y-4">

          {/* JP text input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5"/>Văn bản tiếng Nhật
            </label>
            <div className="relative group">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Dán đoạn văn tiếng Nhật bạn muốn học vào đây..."
                className="min-h-[180px] font-jp text-lg resize-none bg-background border-border rounded-xl p-4 focus-visible:ring-primary/30"
              />
              <div className="absolute top-3.5 right-3.5 text-primary/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <Languages className="h-4 w-4"/>
              </div>
            </div>
          </div>

          {/* Question input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5"/>Câu hỏi phụ (Tùy chọn)
            </label>
            <div className="relative">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Giải thích sự khác biệt giữa honne và tatemae trong đoạn này"
                className="min-h-[80px] pr-28 resize-none bg-background border-border rounded-xl p-4 focus-visible:ring-primary/30"
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <Button onClick={handleMicToggle} variant="ghost" size="icon"
                  className={cn('h-9 w-9 rounded-xl transition-all',
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary')}>
                  {isListening ? <MicOff className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}
                </Button>
                <Button onClick={handleAnalyze} disabled={isLoading || !content.trim()}
                  className="h-9 px-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow font-bold text-xs gap-2">
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Send className="h-3.5 w-3.5"/>}
                  PHÂN TÍCH
                </Button>
              </div>
            </div>
          </div>

          {/* Scenario chips */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gợi ý nội dung:</p>
            <div className="flex flex-wrap gap-2">
              {scenarios.map((tag) => (
                <button key={tag.label} onClick={() => setPrompt(tag.prompt)}
                  className="text-xs px-3 py-1.5 rounded-lg border bg-card border-border hover:border-primary/40 hover:text-primary transition-all font-semibold">
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Result area ── */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-[400px] flex flex-col items-center justify-center text-center gap-4 bg-muted/30 rounded-2xl border border-dashed border-border">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/50"/>
                <div className="space-y-1">
                  <p className="font-bold text-sm">Đang xử lý dữ liệu...</p>
                  <p className="text-xs text-muted-foreground">Sensei AI đang phân tích từng từ vựng và cấu trúc.</p>
                </div>
              </motion.div>
            ) : result ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                      <Sparkles className="h-4 w-4"/>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                        Engine: {engine === 'gemini' ? 'Google Gemini' : 'Groq Llama 3'}
                      </p>
                      <p className="text-xs font-bold">Phân tích hoàn tất</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={playEntireText} disabled={isSpeaking}
                    className="text-xs font-bold border-border gap-1.5">
                    <Volume2 className="h-3.5 w-3.5"/>Nghe hội thoại
                  </Button>
                </div>

                {/* Overall summary */}
                <Card className="border-border bg-card rounded-xl overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-border bg-muted/30">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 text-primary"/>Tổng quan đoạn văn
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge className="bg-foreground text-background border-0 text-xs">
                        {result.overall_analysis.jlpt_level}
                      </Badge>
                      <Badge variant="outline" className="capitalize text-xs font-bold">
                        {result.overall_analysis.politeness_level}
                      </Badge>
                      <Badge variant="outline" className="capitalize text-xs font-bold">
                        {result.overall_analysis.text_type}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {result.overall_analysis.summary}
                    </p>
                  </CardContent>
                </Card>

                {/* Sentence breakdown */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Quote className="h-3.5 w-3.5 text-primary"/>Mổ xẻ từng câu
                  </h3>
                  {result.sentences.map((sentence, sIdx) => (
                    <motion.div key={sIdx}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: sIdx * 0.1 }}
                      className="group space-y-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-lg font-jp font-bold leading-snug group-hover:text-primary transition-colors">
                            {sentence.japanese}
                          </p>
                          <p className="text-sm text-muted-foreground italic">{sentence.vietnamese}</p>
                        </div>
                        <Button variant="ghost" size="icon"
                          className="h-9 w-9 text-primary/50 hover:text-primary hover:bg-primary/10 rounded-full flex-shrink-0"
                          onClick={() => speak(sentence.japanese)}>
                          <Volume2 className="h-4 w-4"/>
                        </Button>
                      </div>

                      {/* Word chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sentence.breakdown.words.map((w, wIdx) => (
                          <div key={wIdx} className="group/word relative">
                            <Badge variant="secondary"
                              className="bg-muted hover:bg-primary hover:text-primary-foreground transition-all cursor-help font-jp py-1 px-2.5 rounded-lg border-0">
                              {w.word}
                            </Badge>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-popover text-popover-foreground rounded-xl shadow-xl opacity-0 group-hover/word:opacity-100 transition-all z-20 pointer-events-none border border-border text-xs">
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-start">
                                  <p className="font-bold text-base font-jp">{w.word}</p>
                                  <Badge variant="outline" className="text-[9px] h-4 py-0 uppercase font-black">{w.word_type}</Badge>
                                </div>
                                <p className="text-primary font-bold">【{w.reading}】</p>
                                {w.hanviet && <p className="text-sakura font-bold text-[10px] uppercase">Hán Việt: {w.hanviet}</p>}
                                <div className="h-px bg-border"/>
                                <p className="text-xs leading-snug text-muted-foreground">{w.meaning}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Grammar patterns */}
                      {sentence.breakdown.grammar_patterns.length > 0 && (
                        <div className="pt-1 grid gap-2">
                          {sentence.breakdown.grammar_patterns.map((g, gIdx) => (
                            <div key={gIdx} className="relative overflow-hidden bg-muted/40 p-3 rounded-xl border border-border group-hover:border-primary/20 transition-all">
                              <div className="absolute top-0 right-0 p-2 opacity-5">
                                <BrainCircuit className="h-10 w-10 text-primary"/>
                              </div>
                              <p className="text-xs font-bold text-primary mb-0.5">{g.pattern}</p>
                              <p className="text-xs font-bold mb-1">{g.meaning}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{g.usage}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Cultural notes */}
                {result.cultural_notes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-gold"/>Deep Insights
                    </h3>
                    <div className="space-y-2">
                      {result.cultural_notes.map((note, nIdx) => (
                        <div key={nIdx} className="p-4 text-sm font-medium bg-gradient-to-r from-gold/10 to-transparent border-l-4 border-gold rounded-r-xl">
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-10 bg-muted/20 rounded-2xl border border-dashed border-border text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-card flex items-center justify-center mb-5 shadow-sm">
                  <BrainCircuit className="h-7 w-7 opacity-30"/>
                </div>
                <h3 className="text-base font-bold mb-1.5 text-foreground/70">Sensei AI Sẵn Sàng</h3>
                <p className="max-w-xs text-xs leading-relaxed">
                  Nhập văn bản tiếng Nhật và chọn phong cách học để bắt đầu buổi phân tích chuyên sâu.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
