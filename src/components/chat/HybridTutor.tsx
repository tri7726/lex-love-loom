import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles, BrainCircuit, Loader2, Send, Lightbulb, BookOpen, Globe, Quote, Mic, MicOff, Volume2, History, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
      // Create a personalized context string
      const userContext = profile ? 
        `User is level ${profile.level}, has ${profile.xp} XP and a streak of ${profile.streak} days. Name: ${profile.full_name || 'Gakusei'}.` : 
        "User is a Japanese learner.";

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
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const playEntireText = () => {
    if (!result) return;
    const fullText = result.sentences.map(s => s.japanese).join('. ');
    speak(fullText);
  };

  const scenarios = [
    { label: "Giải thích văn hóa", prompt: "Giải thích các yếu tố văn hóa và sắc thái trong đoạn này." },
    { label: "Đóng vai hội thoại", prompt: "Hãy đóng vai Sensei và cùng tôi luyện tập hội thoại dựa trên đoạn văn này." },
    { label: "Tìm từ đồng nghĩa", prompt: "Tìm các từ vựng đồng nghĩa hoặc cách diễn đạt tự nhiên hơn cho các câu trên." }
  ];

  return (
    <div className="space-y-8">
      <div className={cn("grid grid-cols-1 gap-12 transition-all duration-500", (result || isLoading) ? "lg:grid-cols-2" : "max-w-3xl mx-auto")}>
        {/* Input area */}
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-400" />
              Văn bản tiếng Nhật
            </label>
            <div className="group relative">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Dán đoạn văn tiếng Nhật bạn muốn học vào đây..."
                className="min-h-[200px] font-jp text-lg resize-none bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 transition-all rounded-xl p-4 shadow-sm focus-visible:ring-indigo-500"
              />
              <div className="absolute top-4 right-4 text-matcha opacity-0 group-hover:opacity-100 transition-opacity">
                 <Languages className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-slate-400" />
              Câu hỏi phụ (Tùy chọn)
            </label>
            <div className="relative group">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Giải thích sự khác biệt giữa honne và tatemae trong đoạn này"
                className="min-h-[90px] pr-24 resize-none bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 transition-all rounded-xl p-4 shadow-sm focus-visible:ring-indigo-500"
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <Button
                  onClick={handleMicToggle}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-xl transition-all",
                    isListening ? "bg-red-500 text-white animate-pulse" : "hover:bg-sakura/10 text-muted-foreground"
                  )}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button 
                  onClick={handleAnalyze} 
                  disabled={isLoading || !content.trim()}
                  className="h-10 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 rounded-lg transition-all shadow-md font-bold text-xs"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  PHÂN TÍCH
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
               Gợi ý nội dung:
            </p>
            <div className="flex flex-wrap gap-2">
              {scenarios.map((tag) => (
                <button 
                  key={tag.label} 
                  className="text-xs px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-all font-bold"
                  onClick={() => setPrompt(tag.prompt)}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result area */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[500px] flex flex-col items-center justify-center text-center gap-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800"
              >
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <div className="space-y-1">
                  <p className="font-bold">Đang xử lý dữ liệu...</p>
                  <p className="text-xs text-slate-500">Sensei AI đang phân tích từng từ vựng và cấu trúc.</p>
                </div>
              </motion.div>
            ) : result ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                {/* Professional Result Header */}
                <div className="flex items-center justify-between border-b pb-4">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Engine: {engine === 'gemini' ? 'Google Gemini' : 'Groq Llama 3'}</p>
                        <p className="text-xs font-bold">Phân tích hoàn tất</p>
                      </div>
                   </div>
                   <Button variant="outline" size="sm" onClick={playEntireText} disabled={isSpeaking} className="text-xs font-bold border-slate-200 dark:border-slate-800">
                      <Volume2 className="h-4 w-4 mr-2" />
                      Nghe hội thoại
                   </Button>
                </div>

                {/* Overall Summary */}
                <Card className="border shadow-md bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
                  <CardHeader className="py-4 border-b bg-slate-50/50 dark:bg-slate-800/50">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <Globe className="h-4 w-4 text-indigo-600" />
                      Tổng quan đoạn văn
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-6">
                    <div className="flex gap-2 mb-4">
                      <Badge className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-0">{result.overall_analysis.jlpt_level}</Badge>
                      <Badge variant="outline" className="capitalize font-bold">{result.overall_analysis.politeness_level}</Badge>
                      <Badge variant="outline" className="capitalize font-bold">{result.overall_analysis.text_type}</Badge>
                    </div>
                    <p className="text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300">{result.overall_analysis.summary}</p>
                  </CardContent>
                </Card>

                {/* Sentence Breakdown */}
                <div className="space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
                    <Quote className="h-4 w-4 text-sakura" />
                    Mổ xẻ từng câu
                  </h3>
                  {result.sentences.map((sentence, sIdx) => (
                    <motion.div 
                      key={sIdx} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: sIdx * 0.1 }}
                      className="group space-y-4 p-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-[2rem] border border-white/20 hover:border-sakura/30 hover:shadow-sakura-soft transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <p className="text-xl font-jp font-bold leading-tight group-hover:text-sakura transition-colors">{sentence.japanese}</p>
                          <p className="text-sm text-muted-foreground italic font-medium">{sentence.vietnamese}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-sakura hover:bg-sakura/10 rounded-full" onClick={() => speak(sentence.japanese)}>
                           <Volume2 className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {sentence.breakdown.words.map((w, wIdx) => (
                          <div key={wIdx} className="group/word relative">
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-1.5 px-3 border-0 rounded-lg hover:bg-indigo-600 hover:text-white transition-all cursor-help font-jp">
                              {w.word}
                            </Badge>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl shadow-2xl opacity-0 group-hover/word:opacity-100 transition-all z-20 pointer-events-none border border-slate-200 dark:border-slate-800 text-xs">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <p className="font-bold text-lg font-jp">{w.word}</p>
                                  <Badge variant="outline" className="text-[9px] h-4 py-0 uppercase font-black">{w.word_type}</Badge>
                                </div>
                                <p className="text-indigo-600 font-bold text-sm">【{w.reading}】</p>
                                {w.hanviet && <p className="text-sakura font-bold text-[10px] uppercase">Hán Việt: {w.hanviet}</p>}
                                <div className="h-px bg-slate-100 dark:bg-slate-800" />
                                <p className="text-xs font-medium leading-snug">{w.meaning}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {sentence.breakdown.grammar_patterns.length > 0 && (
                        <div className="pt-2 grid grid-cols-1 gap-3">
                          {sentence.breakdown.grammar_patterns.map((g, gIdx) => (
                            <div key={gIdx} className="relative overflow-hidden bg-background/40 p-4 rounded-2xl border border-sakura/10 group-hover:border-sakura/30 transition-all">
                               <div className="absolute top-0 right-0 p-2 opacity-10">
                                  <BrainCircuit className="h-10 w-10 text-sakura" />
                               </div>
                               <p className="text-sm font-bold text-sakura mb-1">{g.pattern}</p>
                               <p className="text-xs font-bold mb-2">{g.meaning}</p>
                               <p className="text-xs text-muted-foreground leading-relaxed italic">{g.usage}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Cultural Notes */}
                {result.cultural_notes.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
                      <Sparkles className="h-4 w-4 text-gold" />
                      Deep Insights
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {result.cultural_notes.map((note, nIdx) => (
                        <div key={nIdx} className="p-5 text-sm font-medium bg-gradient-to-r from-gold/10 to-transparent border-l-4 border-gold rounded-r-2xl backdrop-blur-sm">
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 dark:bg-slate-900/30 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <div className="h-16 w-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center mb-6 shadow-sm">
                   <BrainCircuit className="h-8 w-8 opacity-40" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-slate-600 dark:text-slate-300">Sensei AI Sẵn Sàng</h3>
                <p className="max-w-xs mx-auto text-xs leading-relaxed">Nhập văn bản tiếng Nhật và chọn phong cách học để bắt đầu buổi phân tích chuyên sâu.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// export default HybridTutor;
