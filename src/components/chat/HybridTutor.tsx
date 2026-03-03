import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Send, Loader2, Sparkles, BrainCircuit, Mic, MicOff, 
  Languages, BookOpen, Lightbulb, Volume2, Layers,
  LayoutList, GalleryHorizontalEnd, ChevronLeft, ChevronRight, X,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

const scenarios = [
  { 
    id: 'grammar',
    label: 'Giải thích Ngữ pháp', 
    prompt: 'Hãy phân tích cực kỳ sâu về các cấu trúc ngữ pháp (Grammar Patterns) trong bài. Giải thích cách chia động từ, các hạt (particles) và cấu trúc câu phức tạp nếu có. Tập trung 100% vào ngữ pháp.' 
  },
  { 
    id: 'vocab',
    label: 'Học từ vựng', 
    prompt: 'Liệt kê tất cả từ vựng quan trọng. Yêu cầu bắt buộc: cung cấp Hán Việt, nghĩa chi tiết, và quan trọng nhất là các ví dụ thực tế hoặc từ đi kèm (collocations). Đi sâu vào từ vựng.' 
  },
  { 
    id: 'translation',
    label: 'Dịch & Giải nghĩa', 
    prompt: 'Dịch đoạn văn này sang tiếng Việt một cách mượt mà và tự nhiên nhất (không dịch word-by-word). Giải thích ý nghĩa ẩn dụ hoặc hoàn cảnh sử dụng của cả đoạn văn.' 
  },
  { 
    id: 'nuance',
    label: 'Phân tích sắc thái', 
    prompt: 'Phân tích kỹ mức độ lịch sự (Keigo, Desu/Masu, Casual), sắc thái biểu cảm (vui, buồn, mỉa mai...) và văn phong (báo chí, văn chương, hội thoại). Giải thích tại sao tác giả dùng cách nói này.' 
  },
];

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
        jlpt_level?: string;
      }[];
      grammar_patterns: {
        pattern: string;
        meaning: string;
        usage: string;
      }[];
    };
  }[];
  cultural_notes?: string[];
  
  // Backward compatibility for old grammar analysis
  isCorrect?: boolean;
  corrected?: string;
  explanation?: string;
  rules?: string[];
  suggestions?: string[];
}

interface HybridTutorProps {
  initialData?: {
    content?: string;
    analysis?: AnalysisData | null;
  };
}

export const HybridTutor = ({ initialData }: HybridTutorProps) => {
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [engine] = useState<'gemini' | 'groq'>('gemini');
  const [isListening, setIsListening] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'swipe'>('list');
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>('translation');
  const { profile } = useProfile();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialData) {
      // Corrected keys to match analysis_history table schema
      setContent(initialData.content || '');
      setResult(initialData.analysis || null);
      setIsPanelOpen(true);
    }
  }, [initialData]);

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setIsLoading(true);
    setIsPanelOpen(true);
    
    try {
      const userContext = profile ? 
        `User Level: ${profile.level || 'N5'}, name ${profile.full_name || 'Gakusei'}.` : 
        "User is learning Japanese.";

      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: { 
          content: content, // The edge function expects 'content'
          prompt: prompt ? `[Context: ${userContext}] ${prompt}` : undefined, 
          engine,
          isVip: true 
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      // The structured format returns { format: 'structured', analysis: { ... } }
      if (data.format === 'structured' && data.analysis) {
        setResult(data.analysis);
      } else if (data.format === 'grammar' && data.result) {
        // Handle grammar if needed, though HybridTutor usually shows structured analysis
        setResult(data.result);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Có lỗi xảy ra khi phân tích. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text: string) => {
    if (!text) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleMicToggle = () => {
    setIsListening(!isListening);
    if (!isListening) {
      toast.info('Đang lắng nghe... (Tính năng giả lập)');
    }
  };

  const portalContent = (
    <>
      <AnimatePresence>
        {!isPanelOpen && result && (
          <motion.div
            key="side-toggle"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[110]"
          >
            <Button 
              onClick={() => setIsPanelOpen(true)}
              className="h-14 w-10 bg-sakura hover:bg-sakura-dark text-white rounded-l-2xl shadow-2xl border-y-2 border-l-2 border-white/20 flex items-center justify-center group transition-all"
            >
              <ChevronLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isPanelOpen || isLoading) && (
          <motion.div
            key="side-panel"
            initial={{ opacity: 0, x: 500 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 500 }}
            className="fixed top-0 right-0 h-full w-full lg:w-[500px] bg-white dark:bg-slate-950 border-l-2 border-sakura/20 shadow-[0_0_50px_rgba(0,0,0,0.15)] z-[120] flex flex-col"
          >
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-sakura flex items-center justify-center text-white shadow-lg">
                  <Sparkles className="h-5 w-5"/>
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-sakura">Sensei Analysis</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 tracking-widest leading-none">Global Overlay</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsPanelOpen(false)} className="rounded-full hover:bg-sakura/10 text-sakura">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide p-6 bg-slate-50/50 dark:bg-slate-900/10">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-6 p-8">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full border-4 border-sakura/10 border-t-sakura animate-spin" />
                    <BrainCircuit className="h-10 w-10 text-sakura absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"/>
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-lg text-sakura uppercase tracking-widest">Sensei is thinking...</p>
                    <p className="text-sm text-muted-foreground font-medium italic">Đang mổ xẻ cấu trúc bài viết...</p>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-8 pb-10">
                  {/* Summary Card */}
                  {result.overall_analysis && (
                    <Card className="border-2 border-sakura/10 shadow-soft bg-white/80 dark:bg-slate-900/80 rounded-2xl overflow-hidden p-5 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {result.overall_analysis.jlpt_level && (
                          <Badge className="bg-sakura text-white border-0 text-[10px] font-black">{result.overall_analysis.jlpt_level}</Badge>
                        )}
                        {result.overall_analysis.politeness_level && (
                          <Badge variant="outline" className="text-[10px] font-bold border-sakura/20 text-sakura uppercase">{result.overall_analysis.politeness_level}</Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed font-bold text-slate-700 dark:text-slate-200">
                        {result.overall_analysis.summary}
                      </p>
                    </Card>
                  )}

                  {/* Mode Toggle */}
                  <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border-2 border-sakura/10 shadow-sm w-full">
                    <Button 
                      variant={viewMode === 'list' ? "default" : "ghost"} 
                      size="sm" 
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "flex-1 h-9 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest",
                        viewMode === 'list' ? "bg-sakura text-white" : "text-muted-foreground hover:text-sakura"
                      )}
                    >
                      <LayoutList className="h-4 w-4" /> Danh sách
                    </Button>
                    <Button 
                      variant={viewMode === 'swipe' ? "default" : "ghost"} 
                      size="sm" 
                      onClick={() => {
                        setViewMode('swipe');
                        setCurrentSentenceIdx(0);
                      }}
                      className={cn(
                        "flex-1 h-9 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest",
                        viewMode === 'swipe' ? "bg-sakura text-white" : "text-muted-foreground hover:text-sakura"
                      )}
                    >
                      <GalleryHorizontalEnd className="h-4 w-4" /> Chế độ lướt
                    </Button>
                  </div>

                  {/* Results */}
                  <div className="space-y-4">
                    {/* Backward Compatibility for Old Grammar Analyses */}
                    {result.isCorrect !== undefined ? (
                      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-sakura/20 shadow-lg space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-full", result.isCorrect ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                            {result.isCorrect ? <CheckCircle2 className="h-6 w-6"/> : <AlertCircle className="h-6 w-6"/>}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{result.isCorrect ? "Câu của bạn rất tốt!" : "Sensei đã sửa lại câu cho bạn:"}</h3>
                            {!result.isCorrect && result.corrected && (
                              <p className="text-xl font-jp font-black text-sakura mt-1">{result.corrected}</p>
                            )}
                          </div>
                        </div>
                        {result.explanation && (
                          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-sm font-medium leading-relaxed">{result.explanation}</p>
                          </div>
                        )}
                        {result.rules && result.rules.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><BookOpen className="h-3 w-3"/> Ngữ pháp liên quan:</h4>
                            <ul className="list-disc leading-relaxed text-sm ml-5">
                              {result.rules.map((r: string, i: number) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : viewMode === 'list' ? (
                      <div className="space-y-6">
                        {result.sentences?.map((sentence, sIdx) => (
                          <motion.div key={sIdx}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-sakura/10 hover:border-sakura/30 shadow-sm transition-all space-y-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-2 flex-1">
                                <p className="text-xl font-jp font-black leading-snug">{sentence.japanese}</p>
                                <p className="text-xs text-muted-foreground italic font-bold">{sentence.vietnamese}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="text-sakura/40 hover:text-sakura shrink-0" onClick={() => speak(sentence.japanese)}>
                                <Volume2 className="h-4 w-4"/>
                              </Button>
                            </div>

                            {/* --- CONDITIONAL RENDERING BASED ON MODE --- */}
                            {selectedMode === 'grammar' && sentence.breakdown?.grammar_patterns && sentence.breakdown.grammar_patterns.length > 0 && (
                              <div className="pt-4 border-t border-sakura/5 space-y-3">
                                <p className="text-[10px] font-black text-sakura uppercase tracking-widest flex items-center gap-2">
                                  <Layers className="h-3 w-3" /> Cấu trúc ngữ pháp
                                </p>
                                {sentence.breakdown.grammar_patterns.map((gp, gpIdx) => (
                                  <div key={gpIdx} className="bg-sakura/5 rounded-xl p-3 border border-sakura/10">
                                    <p className="font-jp font-bold text-sm text-sakura">{gp.pattern}</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{gp.meaning}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{gp.usage}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {(selectedMode === 'vocab' || selectedMode === 'translation' || selectedMode === 'nuance') && sentence.breakdown?.words && (
                              <div className="pt-4 border-t border-sakura/5">
                                <div className="flex flex-wrap gap-2">
                                  {sentence.breakdown.words.map((w, wIdx) => (
                                    <div key={wIdx} className="group/word relative">
                                      <Badge variant="secondary" className="bg-sakura/5 text-sakura border-0 font-jp rounded-xl text-xs py-1 px-2.5 hover:bg-sakura hover:text-white transition-all cursor-help">
                                        {w.word}
                                      </Badge>
                                      {selectedMode === 'vocab' && (
                                        <div className="hidden group-hover/word:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white dark:bg-slate-800 border border-sakura/20 rounded-xl shadow-xl p-3 z-50">
                                          <p className="font-jp font-black text-sakura">{w.word} 【{w.reading}】</p>
                                          {w.hanviet && <p className="text-[10px] font-black text-muted-foreground uppercase">{w.hanviet}</p>}
                                          <p className="text-xs font-bold mt-1">{w.meaning}</p>
                                          <div className="mt-2 flex gap-1">
                                            <Badge className="text-[8px] bg-sakura/10 text-sakura border-0">{w.word_type}</Badge>
                                            {w.jlpt_level && <Badge className="text-[8px] bg-sakura text-white border-0">{w.jlpt_level}</Badge>}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}

                        {/* --- SUPPLEMENTARY VIEWS --- */}
                        {(selectedMode === 'nuance' || selectedMode === 'translation') && result.cultural_notes && result.cultural_notes.length > 0 && (
                          <Card className="border-2 border-sakura/5 bg-sakura/5 rounded-3xl overflow-hidden p-6 space-y-4">
                            <h4 className="text-xs font-black text-sakura uppercase tracking-widest flex items-center gap-2">
                              <Lightbulb className="h-4 w-4" /> Ghi chú sắc thái & văn hóa
                            </h4>
                            <ul className="space-y-3">
                              {result.cultural_notes.map((note, nIdx) => (
                                <li key={nIdx} className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed list-disc ml-4">
                                  {note}
                                </li>
                              ))}
                            </ul>
                          </Card>
                        )}
                      </div>
                    ) : (
                      result.sentences && result.sentences.length > 0 ? (
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentSentenceIdx}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-sakura/20 shadow-2xl min-h-[450px] flex flex-col justify-center gap-8 relative overflow-hidden"
                          >
                            <div className="space-y-4 relative z-10">
                              <p className="text-3xl font-jp font-black text-sakura leading-tight">
                                {result.sentences[currentSentenceIdx]?.japanese}
                              </p>
                              <p className="text-lg text-muted-foreground italic font-black">
                                {result.sentences[currentSentenceIdx]?.vietnamese}
                              </p>
                            </div>
                            <div className="h-px bg-sakura/10" />
                            <div className="flex flex-wrap gap-2 relative z-10">
                              {result.sentences[currentSentenceIdx]?.breakdown?.words?.map((w, wIdx) => (
                                <Badge key={wIdx} variant="secondary" className="bg-sakura/5 text-sakura border-0 p-3 rounded-2xl font-jp text-lg">
                                  {w.word}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-6 relative z-10">
                              <Button variant="outline" size="icon" onClick={() => setCurrentSentenceIdx(Math.max(0, currentSentenceIdx - 1))} disabled={currentSentenceIdx === 0} className="h-12 w-12 rounded-full border-sakura/10 text-sakura">
                                <ChevronLeft className="h-6 w-6"/>
                              </Button>
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{currentSentenceIdx + 1} / {result.sentences.length}</span>
                              <Button variant="outline" size="icon" onClick={() => setCurrentSentenceIdx(Math.min(result.sentences.length - 1, currentSentenceIdx + 1))} disabled={currentSentenceIdx === result.sentences.length - 1} className="h-12 w-12 rounded-full border-sakura/10 text-sakura">
                                <ChevronRight className="h-6 w-6"/>
                              </Button>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      ) : null
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
                  <BrainCircuit className="h-16 w-16 text-sakura mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Chưa có dữ liệu phân tích</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <div className="relative w-full">
      {mounted && typeof document !== 'undefined' && createPortal(portalContent, document.body)}

      <div className="p-6 sm:p-8 space-y-8">
        <div className="space-y-4">
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
            <BookOpen className="h-4 w-4 text-primary"/> Japanese Text Analysis
          </label>
          
          <div className="relative group">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Dán văn bản tiếng Nhật vào đây..."
              className="min-h-[200px] font-jp text-xl resize-none bg-background border-border rounded-2xl p-5 focus-visible:ring-primary/20 shadow-sm"
            />
            <div className="absolute bottom-4 right-4 text-primary/10 group-hover:text-primary/20 transition-all pointer-events-none">
              <Languages className="h-10 w-10"/>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
              <Lightbulb className="h-4 w-4 text-primary"/> Chọn chế độ phân tích:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {scenarios.map((tag) => (
                <button 
                  key={tag.id} 
                  onClick={() => {
                    setPrompt(tag.prompt);
                    setSelectedMode(tag.id);
                  }}
                  className={cn(
                    "text-[10px] px-3 py-3 rounded-xl border transition-all font-bold uppercase tracking-wider text-center flex items-center justify-center min-h-[50px]",
                    prompt === tag.prompt 
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                      : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
                  )}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
              <Sparkles className="h-4 w-4 text-primary"/> Gửi yêu cầu riêng:
            </label>
            <div className="relative space-y-3">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Yêu cầu cụ thể..."
                className="min-h-[110px] resize-none bg-background border-border rounded-xl p-4 focus-visible:ring-primary/20 text-sm font-medium"
              />
              <div className="flex items-center justify-between gap-3">
                <Button 
                  onClick={handleMicToggle} 
                  variant="outline" 
                  size="icon"
                  className={cn('h-10 w-10 rounded-xl border-border', isListening ? 'bg-red-500 text-white animate-pulse border-transparent' : 'text-muted-foreground hover:bg-primary/5 hover:text-primary')}
                >
                  {isListening ? <MicOff className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}
                </Button>
                <Button 
                  onClick={handleAnalyze} 
                  disabled={isLoading || !content.trim()}
                  className="flex-1 h-10 bg-primary text-white hover:bg-primary/90 rounded-xl shadow-md shadow-primary/10 font-black text-[10px] uppercase tracking-widest gap-2 active:scale-95 transition-all"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Send className="h-3.5 w-3.5"/>}
                  Phân tích
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HybridTutor;
