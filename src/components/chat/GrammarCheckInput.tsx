import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, AlertCircle, Loader2, Sparkles, RefreshCcw, Trash2,
  Mic, MicOff, Volume2, Info, BookOpen, Quote, Save, Send,
  GraduationCap, Star, Target, TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAI } from '@/contexts/AIContext';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTTS } from '@/hooks/useTTS';
import { useProfile } from '@/hooks/useProfile';
import { GRAMMAR_SAVED_KEY, GRAMMAR_SAVED_EVENT, loadSavedExercises } from './GrammarHistory';
import { supabase } from '@/integrations/supabase/client';
import { Languages, ChevronDown, ChevronUp, GitCompareArrows } from 'lucide-react';
import GrammarDiff from '@/components/grammar/GrammarDiff';
import GrammarDeepDive from '@/components/grammar/GrammarDeepDive';
import BatchCheckResults, { type BatchLineResult } from '@/components/grammar/BatchCheckResults';
import MistakeReviewMode from '@/components/grammar/MistakeReviewMode';
import RewriteComparison from '@/components/grammar/RewriteComparison';
import ErrorAnalytics from '@/components/analytics/ErrorAnalytics';
import GrammarQuizDrills from '@/components/grammar/GrammarQuizDrills';
import LevelAssessment from '@/components/grammar/LevelAssessment';
import WritingAssistant from '@/components/chat/WritingAssistant';

/* ──────── Types ──────── */
interface GrammarError {
  position: number;
  original: string;
  corrected: string;
  type: 'particle_mistake' | 'verb_conjugation' | 'word_choice' | 'politeness' | 'spelling' | 'structure';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  explanation: string;
}

interface GrammarRule {
  pattern: string;
  jlpt: string;
  meaning: string;
}

interface GrammarSuggestion {
  text: string;
  reason: string;
  nuance: string;
}

export interface GrammarResult {
  isCorrect: boolean;
  corrected: string;
  corrected_formal?: string;
  corrected_casual?: string;
  corrected_natural?: string;
  errors?: GrammarError[];
  explanation: string;
  rules: string[];
  rules_detail?: GrammarRule[];
  suggestions: string[];
  suggestions_detail?: GrammarSuggestion[];
}

export interface AnalysisSentence {
  japanese: string;
  vietnamese: string;
  words: Array<{
    word: string;
    reading: string;
    hanviet: string | null;
    meaning: string;
    word_type: string;
    jlpt_level: string;
  }>;
  grammar_patterns: Array<{
    pattern: string;
    meaning: string;
    usage?: string;
    similar_examples?: string[];
  }>;
  structure?: {
    subject: string;
    predicate: string;
    object: string;
  };
}

export interface AnalysisFlashcard {
  word: string;
  reading: string;
  hanviet: string | null;
  meaning: string;
  example_sentence: string;
  example_translation: string;
  jlpt_level: string;
  word_type: string;
}

export interface AnalysisResult {
  morphology: Array<{ token: string; pos: string; reading: string; base: string }>;
  jlpt_patterns: string[];
  particle_breakdown: string[];
  nuance_notes: string[];
  summary: string;
  overall_analysis: {
    jlpt_level: string;
    politeness_level: string;
    text_type: string;
  } | null;
  sentences: AnalysisSentence[];
  suggested_flashcards: AnalysisFlashcard[];
}

export type GrammarMode = 'check' | 'analysis' | 'batch' | 'compare';

export interface GrammarCheckInputProps {
  initialValue?: string;
  className?: string;
  onClear?: () => void;
  onMistakeLogged?: (text: string, corrected: string, explanation: string) => void;
  defaultMode?: GrammarMode;
}

/* ──────── Highlight Japanese text ──────── */
const HighlightJP: React.FC<{text: string}> = ({ text }) => {
  if (!text) return null;
  // Match 「」 or specific JP grammar patterns
  const parts = text.split(/(「[^」]*」)/g);
  return (
    <span className="leading-relaxed">
      {parts.map((p, i) =>
        /^「/.test(p)
          ? <span key={i} className="font-jp font-bold text-sakura bg-sakura/10 px-1.5 py-0.5 rounded-md mx-0.5 shadow-sm border border-sakura/5 inline-block">{p}</span>
          : <span key={i} className="opacity-90">{p}</span>
      )}
    </span>
  );
};

/** Parse "1. … 2. … n. …" into numbered items */
const parseExplanation = (text: string): {num: number; content: string}[] => {
  if (!text) return [];
  return text.split(/(?=\d+\.\s)/)
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(chunk => {
      const m = chunk.match(/^(\d+)\.\s+([\s\S]+)/);
      return m ? [{ num: parseInt(m[1]), content: m[2].trim() }] : [];
    });
};

/* ──────── Main Component ──────── */
export const GrammarCheckInput: React.FC<GrammarCheckInputProps> = ({
  initialValue = '',
  className,
  onClear,
  onMistakeLogged,
  defaultMode = 'check',
}) => {
  const [text, setText] = useState(initialValue);
  const [mode, setMode] = useState<GrammarMode>(defaultMode);
  const { checkGrammar: aiCheckGrammar, isAnalyzing: isLoading } = useAI();
  const [result, setResult] = useState<GrammarResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [activeDeepDiveRule, setActiveDeepDiveRule] = useState<GrammarRule | null>(null);
  const [politenessContext, setPolitenessContext] = useState<string>('auto');
  const [batchResults, setBatchResults] = useState<BatchLineResult[]>([]);
  const [isBatchChecking, setIsBatchChecking] = useState(false);
  const [showMistakeReview, setShowMistakeReview] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showQuizDrills, setShowQuizDrills] = useState(false);
  const [showLevelAssessment, setShowLevelAssessment] = useState(false);
  const [writingAssistantEnabled, setWritingAssistantEnabled] = useState(false);
  const { toast } = useToast();
  const { profile } = useProfile();
  const { speak } = useTTS();
  const { isListening, startListening, stopListening } = useSpeechToText({
    onResult: (transcript) => setText(transcript)
  });

  const checkGrammar = useCallback(async (textToCheck: string, context?: string) => {
    if (!textToCheck.trim() || textToCheck.length < 2) {
      setResult(null);
      return;
    }

    try {
      const promptStr = context && context !== 'auto'
        ? `Context/Setting: ${context}. Please adjust the politeness level accordingly.`
        : undefined;
      const data = await aiCheckGrammar(textToCheck, promptStr);
      
      if (data) {
        const grammarResult = data.format === 'grammar' ? data.result : data;
        setResult(grammarResult);
        // Auto-log mistakes to RAG knowledge base
        if (!grammarResult.isCorrect && grammarResult.corrected) {
          onMistakeLogged?.(textToCheck, grammarResult.corrected, grammarResult.explanation);
        }
      }
    } catch (error) {
      console.error('Grammar check failed:', error);
      toast({ 
        title: 'Lỗi Sensei', 
        description: 'Sensei đang bận, vui lòng thử lại sau.', 
        variant: 'destructive' 
      });
    }
  }, [toast, aiCheckGrammar, onMistakeLogged]);

  // Removed automatic debounce as per user request for manual "Gửi" button
  useEffect(() => {
    if (text === initialValue && !result) return;
    if (!text.trim()) setResult(null);
  }, [text, initialValue, result]);

  const handleClear = () => { setText(''); setResult(null); setAnalysisResult(null); setBatchResults([]); if (onClear) onClear(); };

  /** Phân tích chuyên sâu — gọi edge function và map response */
  const runAnalysis = useCallback(async (textToAnalyze: string) => {
    if (!textToAnalyze.trim() || textToAnalyze.length < 2) return;
    setIsAnalysisLoading(true);
    setAnalysisResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: { content: textToAnalyze, mode: 'analysis' },
      });
      if (error) throw error;
      // Edge fn returns { format: 'structured', analysis: StructuredAnalysis }
      const analysis = data?.format === 'structured' ? data.analysis : (data?.result ?? data);
      // Map StructuredAnalysis fields to AnalysisResult shape
      const allWords = analysis?.sentences?.flatMap((s: any) => s.breakdown?.words ?? []) ?? [];
      setAnalysisResult({
        morphology: allWords.slice(0, 15).map((w: any) => ({
          token: w.word,
          pos: w.word_type || 'unknown',
          reading: w.reading || '',
          base: w.word,
        })),
        jlpt_patterns: analysis?.grammar_summary?.key_patterns ?? [],
        particle_breakdown: analysis?.grammar_summary?.particles_used ?? [],
        nuance_notes: analysis?.cultural_notes ?? [],
        summary: analysis?.overall_analysis?.summary ?? analysis?.explanation ?? '',
        overall_analysis: analysis?.overall_analysis ? {
          jlpt_level: analysis.overall_analysis.jlpt_level || '',
          politeness_level: analysis.overall_analysis.politeness_level || '',
          text_type: analysis.overall_analysis.text_type || '',
        } : null,
        sentences: analysis?.sentences?.map((s: any) => ({
          japanese: s.japanese || '',
          vietnamese: s.vietnamese || '',
          words: s.breakdown?.words?.map((w: any) => ({
            word: w.word || '',
            reading: w.reading || '',
            hanviet: w.hanviet || null,
            meaning: w.meaning || '',
            word_type: w.word_type || '',
            jlpt_level: w.jlpt_level || '',
          })) ?? [],
          grammar_patterns: s.breakdown?.grammar_patterns?.map((g: any) => ({
            pattern: g.pattern || '',
            meaning: g.meaning || '',
            usage: g.usage || '',
            similar_examples: g.similar_examples || [],
          })) ?? [],
          structure: s.structure ? {
            subject: s.structure.subject || '',
            predicate: s.structure.predicate || '',
            object: s.structure.object || '',
          } : undefined,
        })) ?? [],
        suggested_flashcards: analysis?.suggested_flashcards?.map((f: any) => ({
          word: f.word || '',
          reading: f.reading || '',
          hanviet: f.hanviet || null,
          meaning: f.meaning || '',
          example_sentence: f.example_sentence || '',
          example_translation: f.example_translation || '',
          jlpt_level: f.jlpt_level || '',
          word_type: f.word_type || '',
        })) ?? [],
      });
      setShowAnalysisPanel(true);
    } catch {
      toast({ title: 'Lỗi phân tích', description: 'Không thể phân tích chuyên sâu lúc này.', variant: 'destructive' });
    } finally {
      setIsAnalysisLoading(false);
    }
  }, [toast]);

  /** Batch check — split by lines, check each sequentially */
  const runBatchCheck = useCallback(async (textToCheck: string) => {
    const lines = textToCheck.split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, 10);
    if (lines.length === 0) return;

    setIsBatchChecking(true);
    const initial: BatchLineResult[] = lines.map((line, i) => ({
      line,
      lineNumber: i + 1,
      status: 'pending' as const,
    }));
    setBatchResults(initial);

    for (let i = 0; i < lines.length; i++) {
      setBatchResults(prev => prev.map((r, j) => j === i ? { ...r, status: 'checking' as const } : r));
      try {
        const data = await aiCheckGrammar(lines[i]);
        if (data) {
          const result = data.format === 'grammar' ? data.result : data;
          setBatchResults(prev => prev.map((r, j) => j === i ? {
            ...r,
            status: result.isCorrect ? ('correct' as const) : ('incorrect' as const),
            result,
          } : r));
        } else {
          setBatchResults(prev => prev.map((r, j) => j === i ? { ...r, status: 'error' as const } : r));
        }
      } catch {
        setBatchResults(prev => prev.map((r, j) => j === i ? { ...r, status: 'error' as const } : r));
      }
      // Small delay between calls to avoid rate limiting
      if (i < lines.length - 1) await new Promise(r => setTimeout(r, 400));
    }
    setIsBatchChecking(false);
  }, [aiCheckGrammar]);

  /** Save to localStorage and notify GrammarHistory via custom event */
  const handleSave = () => {
    if (!result || !text.trim()) return;
    const prev = loadSavedExercises();
    const entry = { id: Date.now(), text: text.trim(), result, savedAt: new Date().toISOString() };
    const updated = [entry, ...prev].slice(0, 30);
    try { localStorage.setItem(GRAMMAR_SAVED_KEY, JSON.stringify(updated)); } catch (e) { console.error('Error saving grammar exercise:', e); }
    window.dispatchEvent(new Event(GRAMMAR_SAVED_EVENT));
    toast({ title: '✅ Đã lưu bài!', description: `"${text.trim().slice(0, 30)}${text.length > 30 ? '...' : ''}"` });
  };

  const explanationItems = result ? parseExplanation(result.explanation) : [];
  const hasNumberedItems = explanationItems.length > 1;

  return (
    <div className={cn('space-y-4', className)}>

      {/* ── Input ── */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-sakura/20 to-sakura-light/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative">
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (result) setResult(null); // Clear old results when typing new text
            }}
            placeholder="Nhập hoặc nói câu tiếng Nhật để kiểm tra..."
            className="min-h-[140px] pr-16 font-jp text-lg resize-none bg-white/80 backdrop-blur-sm border-sakura/20 rounded-2xl p-5 sm:p-6 focus-visible:ring-sakura/30 shadow-card transition-all"
          />
          <div className="absolute right-4 top-4 flex flex-col gap-2.5">
            <Button onClick={() => isListening ? stopListening() : startListening()}
              variant="outline" size="icon"
              className={cn('h-10 w-10 rounded-xl border-border/50 shadow-sm transition-all active:scale-95',
                isListening ? 'bg-destructive text-white border-transparent animate-pulse' : 'bg-white/80 text-sakura hover:bg-sakura/10 hover:border-sakura/30')}>
              {isListening ? <MicOff className="h-4.5 w-4.5"/> : <Mic className="h-4.5 w-4.5"/>}
            </Button>
            {text.length > 0 && (
              <Button variant="outline" size="icon" onClick={handleClear}
                className="h-10 w-10 rounded-xl bg-white/80 border-border/50 shadow-sm hover:text-destructive text-muted-foreground hover:bg-destructive/5 active:scale-95">
                <Trash2 className="h-4 w-4"/>
              </Button>
            )}
          </div>
        </div>
        
        {/* ── Writing Assistant ── */}
        <WritingAssistant text={text} enabled={writingAssistantEnabled && mode === 'check'} />

        {/* ── Mode toggle + Action buttons ── */}
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">

          {/* Mode selector */}
          <div className="flex items-center gap-1 bg-muted/40 rounded-full p-1">
            <button
              onClick={() => { setMode('check'); setAnalysisResult(null); setBatchResults([]); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all',
                mode === 'check' ? 'bg-white shadow-sm text-sakura' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="h-3 w-3" /> Kiểm tra
            </button>
            <button
              onClick={() => { setMode('analysis'); setResult(null); setBatchResults([]); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all',
                mode === 'analysis' ? 'bg-white shadow-sm text-indigo-500' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Languages className="h-3 w-3" /> Phân tích
            </button>
            <button
              onClick={() => { setMode('batch'); setResult(null); setAnalysisResult(null); setBatchResults([]); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all',
                mode === 'batch' ? 'bg-white shadow-sm text-teal-500' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <GitCompareArrows className="h-3 w-3" /> Batch
            </button>
            <button
              onClick={() => { setMode('compare'); setResult(null); setAnalysisResult(null); setBatchResults([]); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all',
                mode === 'compare' ? 'bg-white shadow-sm text-violet-500' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <GitCompareArrows className="h-3 w-3" /> So sánh
            </button>
          </div>

          {/* Politeness Context Selector (check mode only) */}
          {mode === 'check' && (
            <div className="flex items-center gap-1 bg-muted/40 rounded-full p-1">
              {[
                { value: 'auto', label: 'Auto' },
                { value: 'casual friend', label: 'Casual' },
                { value: 'polite coworker', label: 'Polite' },
                { value: 'formal keigo', label: 'Formal' },
              ].map((ctx) => (
                <button
                  key={ctx.value}
                  onClick={() => setPolitenessContext(ctx.value)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all',
                    politenessContext === ctx.value
                      ? 'bg-white shadow-sm text-sakura'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {ctx.label}
                </button>
              ))}
              <span className="w-px h-5 bg-border/50 mx-1" />
              <button
                onClick={() => setWritingAssistantEnabled(v => !v)}
                className={cn(
                  'px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1',
                  writingAssistantEnabled ? 'bg-white shadow-sm text-sakura' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Sparkles className="h-3 w-3" /> {writingAssistantEnabled ? 'Assist ON' : 'Assist OFF'}
              </button>
            </div>
          )}

          {/* Action button — hidden in compare mode (RewriteComparison has its own submit) */}
          {mode !== 'compare' && (
            <Button
              onClick={() => mode === 'check' ? checkGrammar(text, politenessContext) : mode === 'batch' ? runBatchCheck(text) : runAnalysis(text)}
              disabled={(mode === 'check' ? isLoading : mode === 'analysis' ? isAnalysisLoading : isBatchChecking) || !text.trim()}
              className={cn(
                'rounded-full px-8 h-11 font-black uppercase tracking-[0.15em] gap-2.5 shadow-soft transition-all hover:translate-y-[-2px] active:translate-y-[1px]',
                mode === 'check'
                  ? 'bg-sakura hover:bg-sakura-dark text-white'
                  : mode === 'batch'
                  ? 'bg-teal-500 hover:bg-teal-600 text-white'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              )}
            >
              {(isLoading || isAnalysisLoading || isBatchChecking) ? (
                <Loader2 className="h-4 w-4 animate-spin"/>
              ) : mode === 'check' ? (
                <><Send className="h-4 w-4" /><span>Gửi Sensei</span></>
              ) : mode === 'batch' ? (
                <><GitCompareArrows className="h-4 w-4" /><span>Check Batch</span></>
              ) : (
                <><Languages className="h-4 w-4" /><span>Phân tích</span></>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── Result card ── */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <Card className={cn(
              'border-none rounded-[2rem] overflow-hidden shadow-elevated relative',
              result.isCorrect ? 'bg-gradient-to-br from-green-50/80 to-green-100/80'
                               : 'bg-white/60 backdrop-blur-xl border border-white/20'
            )}>
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-sakura/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
              
              <CardContent className="p-6 sm:p-8 space-y-8 relative z-10">

                {/* Header Section */}
                <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-sakura/10">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                      className={cn('h-12 w-12 rounded-2xl flex items-center justify-center shadow-soft',
                        result.isCorrect ? 'bg-green-500 text-white' : 'bg-sakura text-white')}>
                      {result.isCorrect ? <CheckCircle2 className="h-6 w-6"/> : <Sparkles className="h-6 w-6"/>}
                    </motion.div>
                    <div>
                      <h3 className="font-bold text-xl tracking-tight text-foreground">
                        {result.isCorrect ? '✨ Tuyệt vời!' : '📝 Lời khuyên của Sensei'}
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-70">Analysis by Sensei AI</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    {!result.isCorrect && (
                      <>
                        <Button onClick={() => setShowMistakeReview(v => !v)} variant="outline" size="sm"
                          className={cn(
                            'rounded-full px-4 text-xs gap-2 h-9 transition-colors',
                            showMistakeReview ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'border-indigo-200/50 hover:bg-indigo-50'
                          )}>
                          <Target className="h-3.5 w-3.5"/>Tìm lỗi
                        </Button>
                        <Button onClick={() => setText(result.corrected)} variant="outline" size="sm"
                          className="rounded-full px-4 text-xs gap-2 border-sakura/30 h-9 hover:bg-sakura/5 transition-colors">
                          <RefreshCcw className="h-3.5 w-3.5"/>Tự động sửa
                        </Button>
                      </>
                    )}
                    <Button onClick={() => setShowQuizDrills(v => !v)} variant="outline" size="sm"
                      className={cn(
                        'rounded-full px-4 text-xs gap-2 h-9 transition-colors',
                        showQuizDrills ? 'bg-violet-100 text-violet-700 border-violet-200' : 'border-indigo-200/50 hover:bg-violet-50'
                      )}>
                      <Target className="h-3.5 w-3.5"/>Luyện tập
                    </Button>
                    <Button onClick={() => setShowLevelAssessment(v => !v)} variant="outline" size="sm"
                      className={cn(
                        'rounded-full px-4 text-xs gap-2 h-9 transition-colors',
                        showLevelAssessment ? 'bg-amber-100 text-amber-700 border-amber-200' : 'border-indigo-200/50 hover:bg-amber-50'
                      )}>
                      <GraduationCap className="h-3.5 w-3.5"/>Trình độ
                    </Button>
                    <Button onClick={() => setShowAnalytics(v => !v)} variant="outline" size="sm"
                      className={cn(
                        'rounded-full px-4 text-xs gap-2 h-9 transition-colors',
                        showAnalytics ? 'bg-purple-100 text-purple-700 border-purple-200' : 'border-indigo-200/50 hover:bg-purple-50'
                      )}>
                      <TrendingUp className="h-3.5 w-3.5"/>Thống kê
                    </Button>
                    <Button onClick={handleSave} variant="default" size="sm"
                      className="rounded-full px-4 text-xs gap-2 bg-sakura/10 text-sakura hover:bg-sakura/20 border-none h-9 shadow-sm">
                      <Save className="h-3.5 w-3.5"/>Lưu vào kho
                    </Button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Corrected Sentence & Suggestions */}
                  <div className="lg:col-span-12 space-y-6">
                    {!result.isCorrect && result.corrected && (
                      <>
                        {/* Primary correction */}
                        <motion.div
                          initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                          className="relative rounded-[1.5rem] bg-gradient-to-br from-sakura to-sakura-dark p-[1px] shadow-lg overflow-hidden group">
                          <div className="bg-white/95 p-6 rounded-[1.45rem] h-full">
                            <div className="flex justify-between items-start mb-4">
                              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-sakura/60 bg-sakura/5 px-3 py-1 rounded-full">Câu đúng từ Sensei</span>
                              <Button onClick={() => speak(result.corrected)} variant="ghost" size="icon"
                                className="h-10 w-10 rounded-full text-sakura hover:bg-sakura/10 hover:scale-110 active:scale-95 transition-all">
                                <Volume2 className="h-5 w-5"/>
                              </Button>
                            </div>
                            <p className="font-jp text-2xl sm:text-3xl font-bold text-foreground leading-relaxed">
                              {result.corrected}
                            </p>
                          </div>
                        </motion.div>

                        {/* Multi-level variants */}
                        {(result.corrected_formal || result.corrected_casual || result.corrected_natural) && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                          >
                            {result.corrected_formal && (
                              <div className="p-4 rounded-2xl border border-indigo-100/50 bg-indigo-50/20 space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Formal</span>
                                <p className="font-jp text-sm font-bold text-foreground">{result.corrected_formal}</p>
                              </div>
                            )}
                            {result.corrected_casual && (
                              <div className="p-4 rounded-2xl border border-amber-100/50 bg-amber-50/20 space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Casual</span>
                                <p className="font-jp text-sm font-bold text-foreground">{result.corrected_casual}</p>
                              </div>
                            )}
                            {result.corrected_natural && (
                              <div className="p-4 rounded-2xl border border-emerald-100/50 bg-emerald-50/20 space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Natural</span>
                                <p className="font-jp text-sm font-bold text-foreground">{result.corrected_natural}</p>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* Side-by-side diff */}
                        {result.errors && result.errors.length > 0 && (
                          <GrammarDiff
                            original={text}
                            corrected={result.corrected}
                            errors={result.errors as any}
                          />
                        )}

                        {/* Mistake Review Mode */}
                        {showMistakeReview && result.errors && result.errors.length > 0 && (
                          <MistakeReviewMode
                            originalText={text}
                            errors={result.errors as any}
                            onClose={() => setShowMistakeReview(false)}
                          />
                        )}

                        {/* Error Analytics */}
                        {showAnalytics && (
                          <ErrorAnalytics />
                        )}

                        {/* Grammar Quiz Drills */}
                        {showQuizDrills && (
                          <GrammarQuizDrills />
                        )}

                        {/* Level Assessment */}
                        {showLevelAssessment && (
                          <LevelAssessment />
                        )}
                      </>
                    )}

                    {/* Quick Analysis Overview */}
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                      className="space-y-4">
                      <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
                        <Info className="h-4 w-4 text-sakura"/> Giải thích chi tiết
                      </h4>
                      {hasNumberedItems ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {explanationItems.map(({ num, content }, idx) => (
                            <motion.div 
                              key={num}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + idx * 0.1 }}
                              className="flex gap-4 p-5 rounded-2xl bg-sakura-light/30 border border-sakura/5 hover:bg-sakura-light/50 transition-colors">
                              <span className="flex-shrink-0 h-7 w-7 rounded-xl bg-sakura text-white text-xs font-black flex items-center justify-center shadow-sm">
                                {num}
                              </span>
                              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
                                <HighlightJP text={content}/>
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-base leading-relaxed text-foreground/90 bg-sakura-light/30 p-6 rounded-2xl border border-sakura/5">
                          <HighlightJP text={result.explanation || 'Sensei đang suy nghĩ...'}/>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* Word-level Errors */}
                  {!result.isCorrect && result.errors && result.errors.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="space-y-3"
                    >
                      <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-rose-600">
                        <AlertCircle className="h-4 w-4"/> Phân tích lỗi ({result.errors.length})
                      </h4>
                      <div className="space-y-3">
                        {result.errors.map((err, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.05 }}
                            className="p-5 rounded-2xl bg-white/70 border border-rose-100/60 space-y-3"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn(
                                'text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border-none',
                                err.type === 'particle_mistake' && 'bg-purple-100 text-purple-700',
                                err.type === 'verb_conjugation' && 'bg-blue-100 text-blue-700',
                                err.type === 'word_choice' && 'bg-orange-100 text-orange-700',
                                err.type === 'politeness' && 'bg-pink-100 text-pink-700',
                                err.type === 'spelling' && 'bg-red-100 text-red-700',
                                err.type === 'structure' && 'bg-teal-100 text-teal-700',
                              )}>
                                {err.type === 'particle_mistake' ? 'Trợ từ' :
                                 err.type === 'verb_conjugation' ? 'Chia động từ' :
                                 err.type === 'word_choice' ? 'Từ vựng' :
                                 err.type === 'politeness' ? 'Lịch sự' :
                                 err.type === 'spelling' ? 'Chính tả' : 'Cấu trúc'}
                              </Badge>
                              <Badge className={cn(
                                'text-[9px] font-bold px-2 py-0.5 rounded-full border-none',
                                err.difficulty === 'beginner' && 'bg-green-100 text-green-700',
                                err.difficulty === 'intermediate' && 'bg-yellow-100 text-yellow-700',
                                err.difficulty === 'advanced' && 'bg-red-100 text-red-700',
                              )}>
                                {err.difficulty === 'beginner' ? 'Cơ bản' :
                                 err.difficulty === 'intermediate' ? 'Trung cấp' : 'Nâng cao'}
                              </Badge>
                            </div>
                            <div className="flex items-baseline gap-3 font-jp">
                              <span className="text-rose-500 line-through text-base">{err.original}</span>
                              <span className="text-muted-foreground/40">→</span>
                              <span className="text-green-600 font-bold text-base">{err.corrected}</span>
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed">{err.explanation}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Knowledge Cards */}
                  <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {/* Rules with JLPT */}
                    {((result.rules_detail && result.rules_detail.length > 0) || (result.rules?.length > 0)) && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="p-6 rounded-[1.5rem] bg-indigo-50/30 border border-indigo-100/50 space-y-4">
                        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600">
                          <BookOpen className="h-4 w-4"/> Kiến thức trọng tâm
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {(result.rules_detail || result.rules).map((rule, i) => {
                            if (typeof rule === 'string') {
                              return (
                                <Badge key={i} variant="secondary"
                                  className="bg-white text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border-none">
                                  {rule}
                                </Badge>
                              );
                            }
                            const r = rule as GrammarRule;
                            return (
                              <Badge key={i} variant="secondary"
                                onClick={() => setActiveDeepDiveRule(prev => prev?.pattern === r.pattern ? null : r)}
                                className={cn(
                                  'bg-white text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border-none inline-flex items-center gap-2 cursor-pointer transition-all',
                                  activeDeepDiveRule?.pattern === r.pattern && 'ring-2 ring-indigo-400 ring-offset-1'
                                )}>
                                {r.pattern}
                                <span className={cn(
                                  'text-[8px] font-black px-1.5 py-0.5 rounded-full',
                                  r.jlpt === 'N5' && 'bg-green-100 text-green-600',
                                  r.jlpt === 'N4' && 'bg-blue-100 text-blue-600',
                                  r.jlpt === 'N3' && 'bg-yellow-100 text-yellow-600',
                                  r.jlpt === 'N2' && 'bg-orange-100 text-orange-600',
                                  r.jlpt === 'N1' && 'bg-red-100 text-red-600',
                                )}>{r.jlpt}</span>
                              </Badge>
                            );
                          })}
                        </div>

                        {/* Grammar Deep Dive */}
                        {activeDeepDiveRule && (
                          <GrammarDeepDive
                            rule={activeDeepDiveRule}
                            userSentence={text}
                            isOpen={true}
                            onToggle={() => setActiveDeepDiveRule(null)}
                          />
                        )}
                      </motion.div>
                    )}

                    {/* Suggestions with explanations */}
                    {((result.suggestions_detail && result.suggestions_detail.length > 0) || (result.suggestions?.length > 0)) && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        className="p-6 rounded-[1.5rem] bg-amber-50/30 border border-amber-100/50 space-y-4">
                        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">
                          <Quote className="h-4 w-4"/> Biến thể tự nhiên
                        </h4>
                        <div className="space-y-2.5">
                          {(result.suggestions_detail || result.suggestions.map(s => ({ text: s }))).map((s, i) => {
                            if (typeof s === 'string') {
                              return (
                                <div key={i} onClick={() => speak(s)}
                                  className="flex items-center justify-between gap-3 text-sm bg-white/80 hover:bg-amber-50 p-3.5 rounded-xl cursor-pointer group/s transition-all shadow-sm">
                                  <span className="font-jp font-bold text-foreground pr-4">{s}</span>
                                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 opacity-60 group-hover/s:opacity-100 transition-opacity">
                                    <Volume2 className="h-4 w-4"/>
                                  </div>
                                </div>
                              );
                            }
                            const sug = s as GrammarSuggestion;
                            return (
                              <div key={i}
                                className="p-4 rounded-xl bg-white/80 hover:bg-amber-50/50 transition-all shadow-sm space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-jp font-bold text-foreground text-sm" onClick={() => speak(sug.text)}>
                                    {sug.text}
                                  </span>
                                  <Button onClick={() => speak(sug.text)} variant="ghost" size="icon"
                                    className="h-8 w-8 rounded-full text-amber-600 hover:bg-amber-100 shrink-0">
                                    <Volume2 className="h-4 w-4"/>
                                  </Button>
                                </div>
                                {sug.reason && (
                                  <p className="text-xs text-foreground/70">{sug.reason}</p>
                                )}
                                {sug.nuance && (
                                  <p className="text-[10px] text-muted-foreground/60 italic">{sug.nuance}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>

                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Analysis Result Panel ── */}
      <AnimatePresence>
        {analysisResult && mode === 'analysis' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
          >
            <Card className="border border-indigo-100/60 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-50/40 to-violet-50/30 shadow-soft">
              <CardContent className="p-6 space-y-5">

                {/* Header with overall analysis */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                      <Languages className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-indigo-700">Phân tích chuyên sâu</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {analysisResult.overall_analysis?.jlpt_level && (
                          <span className="text-[9px] font-black text-indigo-500 bg-indigo-100/60 px-2 py-0.5 rounded-full">
                            {analysisResult.overall_analysis.jlpt_level}
                          </span>
                        )}
                        {analysisResult.overall_analysis?.politeness_level && (
                          <span className="text-[9px] font-black text-purple-500 bg-purple-100/60 px-2 py-0.5 rounded-full">
                            {analysisResult.overall_analysis.politeness_level}
                          </span>
                        )}
                        {analysisResult.overall_analysis?.text_type && (
                          <span className="text-[9px] font-black text-teal-500 bg-teal-100/60 px-2 py-0.5 rounded-full">
                            {analysisResult.overall_analysis.text_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAnalysisPanel(v => !v)}
                    className="rounded-full p-1.5 hover:bg-indigo-100 text-indigo-400 transition shrink-0"
                  >
                    {showAnalysisPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {/* Summary */}
                {analysisResult.summary && (
                  <div className="text-sm leading-relaxed text-foreground/80 bg-white/70 rounded-2xl p-4 border border-indigo-100/40">
                    {analysisResult.summary}
                  </div>
                )}

                <AnimatePresence>
                  {showAnalysisPanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-6 overflow-hidden"
                    >
                      {/* ── Sentence-by-sentence breakdown ── */}
                      {analysisResult.sentences.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" /> Phân tích câu
                          </h4>
                          {analysisResult.sentences.map((s, si) => (
                            <div key={si} className="bg-white/80 rounded-2xl border border-indigo-100/50 p-5 space-y-4">
                              {/* JP + VN */}
                              <div>
                                <p className="font-jp text-lg font-bold text-foreground leading-relaxed">{s.japanese}</p>
                                {s.vietnamese && (
                                  <p className="text-xs text-muted-foreground/80 mt-1 italic">{s.vietnamese}</p>
                                )}
                              </div>

                              {/* Sentence Structure Breakdown */}
                              {s.structure && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2">
                                  <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/30">
                                    <p className="text-[8px] font-black uppercase text-indigo-500 mb-1">Chủ ngữ (主語)</p>
                                    <p className="font-jp text-xs font-bold">{s.structure.subject || '—'}</p>
                                  </div>
                                  <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/30">
                                    <p className="text-[8px] font-black uppercase text-rose-500 mb-1">Vị ngữ (述語)</p>
                                    <p className="font-jp text-xs font-bold">{s.structure.predicate || '—'}</p>
                                  </div>
                                  <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/30">
                                    <p className="text-[8px] font-black uppercase text-amber-600 mb-1">Tân ngữ (目的語)</p>
                                    <p className="font-jp text-xs font-bold">{s.structure.object || '—'}</p>
                                  </div>
                                </div>
                              )}

                              {/* Word cards */}
                              {s.words.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {s.words.map((w, wi) => (
                                    <div key={wi}
                                      className="text-center bg-white rounded-xl border border-indigo-100/50 px-3 py-2 min-w-[64px] shadow-sm hover:shadow-md transition-shadow cursor-default group"
                                    >
                                      <p className="font-jp text-sm font-bold text-foreground">{w.word}</p>
                                      {w.reading && <p className="text-[9px] text-indigo-400 font-medium">{w.reading}</p>}
                                      {w.hanviet && <p className="text-[8px] text-muted-foreground/60">{w.hanviet}</p>}
                                      <div className="flex items-center justify-center gap-1 mt-0.5">
                                        {w.jlpt_level && (
                                          <span className={cn(
                                            'text-[7px] font-black px-1 py-0.5 rounded',
                                            w.jlpt_level === 'N5' && 'bg-green-100 text-green-600',
                                            w.jlpt_level === 'N4' && 'bg-blue-100 text-blue-600',
                                            w.jlpt_level === 'N3' && 'bg-yellow-100 text-yellow-600',
                                            w.jlpt_level === 'N2' && 'bg-orange-100 text-orange-600',
                                            w.jlpt_level === 'N1' && 'bg-red-100 text-red-600',
                                          )}>{w.jlpt_level}</span>
                                        )}
                                      </div>
                                      <p className="text-[8px] text-foreground/60 mt-0.5 leading-tight max-w-[80px]">{w.meaning}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Grammar patterns */}
                              {s.grammar_patterns.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-violet-500">Grammar patterns</p>
                                  <div className="grid gap-2">
                                    {s.grammar_patterns.map((g, gi) => (
                                      <div key={gi} className="bg-violet-50/40 rounded-xl border border-violet-100/60 p-3.5">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-jp font-bold text-sm text-violet-800">{g.pattern}</span>
                                          <span className="text-[10px] text-violet-600/70">—</span>
                                          <span className="text-[11px] text-foreground/80">{g.meaning}</span>
                                        </div>
                                        {g.usage && (
                                          <p className="text-[11px] text-foreground/60 leading-relaxed">{g.usage}</p>
                                        )}
                                        {g.similar_examples && g.similar_examples.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            <p className="text-[8px] font-black uppercase text-violet-400">Ví dụ tương tự</p>
                                            {g.similar_examples.map((ex, exi) => (
                                              <p key={exi} className="font-jp text-[10px] text-foreground/70">• {ex}</p>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ── Suggested Flashcards ── */}
                      {analysisResult.suggested_flashcards.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5" /> Gợi ý flashcard
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {analysisResult.suggested_flashcards.map((f, fi) => (
                              <div key={fi}
                                className="bg-white/80 rounded-xl border border-amber-100/60 p-4 space-y-2 hover:shadow-sm transition-shadow"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-jp font-bold text-base text-foreground">{f.word}</span>
                                      {f.jlpt_level && (
                                        <span className={cn(
                                          'text-[8px] font-black px-1.5 py-0.5 rounded-full',
                                          f.jlpt_level === 'N5' && 'bg-green-100 text-green-600',
                                          f.jlpt_level === 'N4' && 'bg-blue-100 text-blue-600',
                                          f.jlpt_level === 'N3' && 'bg-yellow-100 text-yellow-600',
                                          f.jlpt_level === 'N2' && 'bg-orange-100 text-orange-600',
                                          f.jlpt_level === 'N1' && 'bg-red-100 text-red-600',
                                        )}>{f.jlpt_level}</span>
                                      )}
                                    </div>
                                    {f.reading && <p className="text-xs text-indigo-400">{f.reading}</p>}
                                    {f.hanviet && <p className="text-[10px] text-muted-foreground/60">{f.hanviet}</p>}
                                  </div>
                                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full capitalize shrink-0">{f.word_type}</span>
                                </div>
                                <p className="text-xs text-foreground/70">{f.meaning}</p>
                                {f.example_sentence && (
                                  <div className="bg-amber-50/50 rounded-lg p-2.5 space-y-0.5">
                                    <p className="font-jp text-[11px] text-foreground/80">{f.example_sentence}</p>
                                    {f.example_translation && (
                                      <p className="text-[10px] text-muted-foreground/70 italic">{f.example_translation}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── Particles + Verb Forms + Key Patterns — compact ── */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {analysisResult.particle_breakdown.length > 0 && (
                          <div className="bg-white/70 rounded-xl border border-amber-100/50 p-3.5 space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Trợ từ</p>
                            <div className="flex flex-wrap gap-1">
                              {analysisResult.particle_breakdown.map((p, i) => (
                                <span key={i} className="font-jp text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {analysisResult.morphology.length > 0 && (
                          <div className="bg-white/70 rounded-xl border border-indigo-100/50 p-3.5 space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Từ loại</p>
                            <div className="flex flex-wrap gap-1">
                              {[...new Set(analysisResult.morphology.map(m => m.pos))].map((pos, i) => (
                                <span key={i} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">{pos}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {analysisResult.jlpt_patterns.length > 0 && (
                          <div className="bg-white/70 rounded-xl border border-violet-100/50 p-3.5 space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-violet-500">Key Patterns</p>
                            <div className="flex flex-wrap gap-1">
                              {analysisResult.jlpt_patterns.map((p, i) => (
                                <span key={i} className="font-jp text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Cultural / Nuance notes ── */}
                      {analysisResult.nuance_notes.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5" /> Sắc thái &amp; Văn hóa
                          </h4>
                          <div className="bg-white/70 rounded-2xl border border-emerald-100/50 p-4 space-y-2">
                            {analysisResult.nuance_notes.map((n, i) => (
                              <p key={i} className="text-sm text-foreground/70 flex gap-2 leading-relaxed">
                                <span className="text-emerald-400 shrink-0 mt-0.5">›</span>{n}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Batch Results ── */}
      {mode === 'batch' && batchResults.length > 0 && (
        <BatchCheckResults results={batchResults} />
      )}

      {/* ── Compare Mode ── */}
      {mode === 'compare' && (
        <RewriteComparison />
      )}
    </div>
  );
};
