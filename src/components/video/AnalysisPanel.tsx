import React, { useState, useEffect } from 'react';
import { prefetchPitchDataset } from '@/lib/pitchAccent';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, BookOpen, MessageSquare, GraduationCap, Lightbulb, Plus, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Volume2, Copy, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Target, Send, RefreshCw } from 'lucide-react';
import { AnalysisErrorBoundary } from '@/components/video/AnalysisErrorBoundary';
import { SenseiRewriteTools } from '@/components/video/SenseiRewriteTools';
import PitchAccent from '@/components/video/PitchAccent';
import WordEtymology from '@/components/video/WordEtymology';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import { useFlashcardCreation } from '@/hooks/useFlashcardCreation';
import { FolderSelectionDialog } from '@/components/flashcards/FolderSelectionDialog';
import { cn } from '@/lib/utils';
import { useAI } from '@/contexts/AIContext';
import GrammarDiff from '@/components/grammar/GrammarDiff';
import GrammarDeepDive from '@/components/grammar/GrammarDeepDive';
import MistakeReviewMode from '@/components/grammar/MistakeReviewMode';

// Type definitions matching the backend response
interface WordBreakdown {
  word: string;
  reading: string;
  hanviet?: string;
  meaning: string;
  word_type: string;
  jlpt_level?: string;
  pitch_pattern?: string;
  pos?: string;
}

interface GrammarPattern {
  pattern: string;
  meaning: string;
  usage: string;
  jlpt_level?: string;
  common_mistakes?: string[];
  register?: string;
  similar_patterns?: string[];
}

export interface SentenceAnalysis {
  japanese: string;
  vietnamese: string;
  breakdown: {
    words: WordBreakdown[];
    grammar_patterns: GrammarPattern[];
  };
}

interface SuggestedFlashcard {
  word: string;
  reading: string;
  hanviet?: string;
  meaning: string;
  example_sentence: string;
  example_translation: string;
  jlpt_level?: string;
  word_type?: string;
  notes?: string;
}

export interface StructuredAnalysis {
  overall_analysis: {
    jlpt_level: string;
    politeness_level: string;
    text_type: string;
    summary: string;
    register?: string;
    dialect?: string;
  };
  sentences: SentenceAnalysis[];
  suggested_flashcards: SuggestedFlashcard[];
  grammar_summary: {
    particles_used: string[];
    verb_forms: string[];
    key_patterns: GrammarSummaryPattern[];
  };
  cultural_notes: string[];
}

export interface RewriteVariant {
  label: string;
  japanese: string;
  reading?: string;
  vietnamese?: string;
  nuance?: string;
}
export interface RewriteResult {
  original: string;
  variants: RewriteVariant[];
  recommendation?: string;
}

interface GrammarSummaryPattern {
  pattern: string;
  jlpt_level?: string;
  meaning?: string;
  frequency?: string;
  common_mistakes?: string[];
}

interface AnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  content: string | null;
  error: string | null;
  structuredData?: StructuredAnalysis | null;
  onToggle?: () => void;
  onOpen?: () => void;
  segmentId?: string;
  japaneseText?: string;
  vietnameseText?: string;
  videoId?: string;
  isBookmarked?: boolean;
  onBookmark?: () => void;
  onRemoveBookmark?: () => void;
  onRetry?: () => void;
  /** Source text used for rewrite/compare actions (defaults to japaneseText) */
  sourceText?: string;
  /** Hook to call edge function with `rewrite_mode` and return RewriteResult */
  onRewrite?: (mode: 'politeness' | 'jlpt', text: string) => Promise<RewriteResult | null>;
}

/** Lightweight runtime validation for structured AI data. */
function validateStructuredAnalysis(data: unknown): data is StructuredAnalysis {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<StructuredAnalysis>;
  if (!d.overall_analysis || typeof d.overall_analysis !== 'object') return false;
  if (typeof d.overall_analysis.summary !== 'string') return false;
  if (!Array.isArray(d.sentences)) return false;
  return true;
}

const JLPT_COLORS: Record<string, string> = {
  'N5': 'bg-green-500/20 text-green-700',
  'N4': 'bg-blue-500/20 text-blue-700',
  'N3': 'bg-yellow-500/20 text-yellow-700',
  'N2': 'bg-orange-500/20 text-orange-700',
  'N1': 'bg-red-500/20 text-red-700',
};

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  isOpen,
  onClose,
  isLoading,
  content,
  error,
  structuredData,
  onToggle,
  onOpen,
  segmentId,
  japaneseText,
  vietnameseText,
  videoId,
  isBookmarked,
  onBookmark,
  onRemoveBookmark,
  onRetry,
  sourceText,
  onRewrite,
}) => {
  const { toast } = useToast();
  const { checkGrammar } = useAI();
  const [activeTab, setActiveTab] = useState('overview');
  const [loadingElapsed, setLoadingElapsed] = useState(0);
  useEffect(() => { prefetchPitchDataset(); }, []);

  // Sentence-level grammar check state
  const [checkingSentence, setCheckingSentence] = useState<number | null>(null);
  const [sentenceCheckResults, setSentenceCheckResults] = useState<Record<number, any>>({});
  const [showSentenceMistakeReview, setShowSentenceMistakeReview] = useState<Record<number, boolean>>({});

  // Grammar tab deep dive state
  const [grammarTabDeepDive, setGrammarTabDeepDive] = useState<string | null>(null);

  // Auto-pause video when analysis opens
  React.useEffect(() => {
    if (isOpen) {
      onOpen?.();
    }
  }, [isOpen, onOpen]);

  // Loading timeout tracker
  React.useEffect(() => {
    if (!isLoading) {
      setLoadingElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading]);
  
  // Flashcard creation state
  const { createFlashcard, createFlashcards, isCreating } = useFlashcardCreation();

  // TTS
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: '✅ Đã copy!', description: 'Đã sao chép vào clipboard.' });
    } catch {
      toast({ title: 'Lỗi copy', description: 'Không thể sao chép.', variant: 'destructive' });
    }
  };

  // Grammar pattern expand state
  const [expandedPatterns, setExpandedPatterns] = useState<Record<string, boolean>>({});
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [pendingFlashcard, setPendingFlashcard] = useState<SuggestedFlashcard | null>(null);
  const [pendingBulkAdd, setPendingBulkAdd] = useState(false);

  const handleAddFlashcard = (flashcard: SuggestedFlashcard) => {
    setPendingFlashcard(flashcard);
    setPendingBulkAdd(false);
    setShowFolderDialog(true);
  };

  const handleAddAllFlashcards = () => {
    if (!structuredData?.suggested_flashcards) return;
    
    setPendingFlashcard(null);
    setPendingBulkAdd(true);
    setShowFolderDialog(true);
  };

  const handleFolderSelected = async (folderId: string) => {
    setShowFolderDialog(false);
    
    if (pendingBulkAdd && structuredData) {
      await createFlashcards(structuredData.suggested_flashcards, folderId);
    } else if (pendingFlashcard) {
      await createFlashcard(pendingFlashcard, folderId);
    }
    
    setPendingFlashcard(null);
    setPendingBulkAdd(false);
  };

  // If we have structured data, show enhanced view
  const isValidStructured = validateStructuredAnalysis(structuredData);
  const isStructured = isValidStructured;
  const hasInvalidStructured = structuredData !== null && structuredData !== undefined && !isValidStructured;

  /** Check grammar for a specific sentence from the breakdown */
  const checkSentenceGrammar = async (sentenceIndex: number, text: string) => {
    setCheckingSentence(sentenceIndex);
    try {
      const data = await checkGrammar(text);
      if (data) {
        const result = data.format === 'grammar' ? data.result : data;
        setSentenceCheckResults(prev => ({ ...prev, [sentenceIndex]: result }));
      }
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể kiểm tra ngữ pháp.', variant: 'destructive' });
    } finally {
      setCheckingSentence(null);
    }
  };

  /** Aggregate unique grammar patterns from all sentences */
  const aggregatedPatterns = React.useMemo(() => {
    if (!structuredData?.sentences) return [];
    const patternMap = new Map<string, { pattern: string; meaning: string; usage: string }>();
    structuredData.sentences.forEach(s => {
      s.breakdown?.grammar_patterns?.forEach(gp => {
        if (!patternMap.has(gp.pattern)) {
          patternMap.set(gp.pattern, gp);
        }
      });
    });
    return Array.from(patternMap.values());
  }, [structuredData]);

  return (
    <AnimatePresence>
      {/* Floating Toggle Button (Handle) */}
      <motion.div
        initial={false}
        animate={{ 
          x: isOpen ? -500 : 0, // Stay at the edge of the panel when open, or screen edge when closed
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-1/2 right-0 -translate-y-1/2 z-[60]"
      >
        <Button
          variant="secondary"
          size="icon"
          className="h-12 w-8 rounded-l-xl rounded-r-none border-y border-l shadow-xl bg-background hover:bg-muted group transition-all"
          onClick={onToggle || onClose}
          title={isOpen ? "Ẩn bảng phân tích" : "Hiện bảng phân tích"}
        >
          {isOpen ? (
            <ChevronRight className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          )}
        </Button>
      </motion.div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed top-0 right-0 h-full w-full sm:w-[560px] bg-background border-l shadow-2xl z-50 flex flex-col"
        >
          <div className="p-6 border-b flex items-center justify-between bg-background/80 backdrop-blur-md">
            <h3 className="text-2xl font-display font-medium text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sakura animate-pulse-subtle" />
              AI Analysis
            </h3>
            <div className="flex items-center gap-1">
              {/* Bookmark button */}
              {segmentId && japaneseText && onBookmark && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full h-9 w-9 transition-all",
                    isBookmarked
                      ? "text-sakura hover:bg-sakura/10"
                      : "text-muted-foreground hover:text-sakura hover:bg-sakura/10"
                  )}
                  onClick={() => isBookmarked ? onRemoveBookmark?.() : onBookmark()}
                  title={isBookmarked ? "Bỏ lưu câu" : "Lưu câu này"}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-sakura-light/20">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {/* Timeout warning */}
                {loadingElapsed > 10 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-amber-50 border border-amber-200/50 text-amber-700 text-xs text-center"
                  >
                    Phản hồi AI đang lâu hơn dự kiến...
                  </motion.div>
                )}

                {/* Tab skeleton */}
                <div className="flex gap-2 mb-8">
                  <div className="h-9 w-24 bg-muted rounded-xl animate-pulse" />
                  <div className="h-9 w-28 bg-muted/50 rounded-xl animate-pulse" />
                  <div className="h-9 w-24 bg-muted/30 rounded-xl animate-pulse" />
                  <div className="h-9 w-20 bg-muted/20 rounded-xl animate-pulse" />
                </div>

                {/* Overview skeleton */}
                <div className="space-y-3">
                  <div className="h-8 bg-muted rounded-xl animate-pulse w-1/3" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted/50 rounded-lg animate-pulse w-full" />
                    <div className="h-4 bg-muted/50 rounded-lg animate-pulse w-3/4" />
                    <div className="h-4 bg-muted/50 rounded-lg animate-pulse w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-24 bg-muted/30 rounded-2xl animate-pulse" />
                  <div className="h-24 bg-muted/30 rounded-2xl animate-pulse" />
                </div>
                {/* Sentence breakdown skeleton */}
                <div className="h-6 bg-muted/40 rounded-xl animate-pulse w-1/4 mt-6" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-32 bg-muted/20 rounded-2xl animate-pulse" />
                  <div className="h-32 bg-muted/20 rounded-2xl animate-pulse" />
                  <div className="h-32 bg-muted/20 rounded-2xl animate-pulse" />
                  <div className="h-32 bg-muted/20 rounded-2xl animate-pulse" />
                </div>

                {loadingElapsed > 15 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-50 border border-red-200/50 text-red-600 text-xs text-center"
                  >
                    Đang mất nhiều thời gian hơn bình thường. Vui lòng thử lại sau.
                  </motion.div>
                )}
              </div>
            ) : error ? (
              <div className="p-5 m-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="leading-relaxed">{error}</p>
                </div>
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    size="sm"
                    className="bg-sakura hover:bg-sakura/90 text-white rounded-xl"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Thử lại phân tích
                  </Button>
                )}
              </div>
            ) : hasInvalidStructured ? (
              <div className="p-5 m-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Dữ liệu phân tích chưa đầy đủ</p>
                    <p className="text-amber-700/90 text-xs leading-relaxed">
                      AI trả về thiếu một số trường bắt buộc (overall_analysis hoặc sentences). Hãy thử phân tích lại nhé.
                    </p>
                  </div>
                </div>
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    size="sm"
                    className="bg-sakura hover:bg-sakura/90 text-white rounded-xl"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Thử lại phân tích
                  </Button>
                )}
              </div>
            ) : isStructured ? (
              <AnalysisErrorBoundary onRetry={onRetry}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
                <TabsList className="flex w-full bg-sakura-light/30 p-1 mb-8 rounded-2xl border border-sakura-light/50">
                  <TabsTrigger value="overview" className="flex-1 py-2 text-xs font-medium rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-muted data-[state=active]:text-sakura data-[state=active]:shadow-sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="breakdown" className="flex-1 py-2 text-xs font-medium rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-muted data-[state=active]:text-sakura data-[state=active]:shadow-sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Breakdown
                  </TabsTrigger>
                  <TabsTrigger value="grammar" className="flex-1 py-2 text-xs font-medium rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-muted data-[state=active]:text-sakura data-[state=active]:shadow-sm">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Grammar
                  </TabsTrigger>
                  <TabsTrigger value="flashcards" className="flex-1 py-2 text-xs font-medium rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-muted data-[state=active]:text-sakura data-[state=active]:shadow-sm">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Cards
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border-border/50 shadow-sm bg-card rounded-3xl overflow-hidden">
                      <CardContent className="p-8 space-y-8">
                        <div>
                          <h2 className="text-2xl font-display font-medium text-foreground mb-6">Overall Analysis</h2>

                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-muted-foreground w-24">JLPT Level:</span>
                              <Badge className={cn("px-3 py-1 rounded-full font-bold", JLPT_COLORS[structuredData.overall_analysis.jlpt_level] || 'bg-sakura-light/20 text-foreground/70')}>
                                {structuredData.overall_analysis.jlpt_level}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-muted-foreground w-24">Politeness:</span>
                              <Badge variant="secondary" className="px-3 py-1 rounded-full bg-sakura-light/20 text-foreground/80 border-none font-medium">
                                {structuredData.overall_analysis.politeness_level}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-muted-foreground w-24">Type:</span>
                              <Badge variant="secondary" className="px-3 py-1 rounded-full bg-sakura-light/50 text-sakura-dark border-none font-medium">
                                {structuredData.overall_analysis.text_type}
                              </Badge>
                            </div>
                            {structuredData.overall_analysis.register && (
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-muted-foreground w-24">Register:</span>
                                <Badge variant="secondary" className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border-none font-medium capitalize">
                                  {structuredData.overall_analysis.register}
                                </Badge>
                              </div>
                            )}
                            {structuredData.overall_analysis.dialect && structuredData.overall_analysis.dialect !== 'standard' && (
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-muted-foreground w-24">Dialect:</span>
                                <Badge variant="secondary" className="px-3 py-1 rounded-full bg-violet-100 text-violet-800 border-none font-medium">
                                  {structuredData.overall_analysis.dialect}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-6 bg-cream/50 rounded-2xl text-base leading-relaxed text-foreground/80 border border-border/50/50">
                          {structuredData.overall_analysis.summary}
                        </div>

                        {/* Sensei Tools: Compare politeness & Rewrite by JLPT */}
                        {onRewrite && (sourceText || japaneseText) && (
                          <SenseiRewriteTools
                            text={(sourceText || japaneseText) as string}
                            onRewrite={onRewrite}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {structuredData.cultural_notes && structuredData.cultural_notes.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="mt-6"
                    >
                      <h3 className="text-xl font-display font-medium text-foreground mb-6 px-2">Cultural Notes</h3>
                      <div className="space-y-4">
                        {structuredData.cultural_notes.map((note, idx) => (
                          <div key={idx} className="flex gap-4 group">
                            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sakura flex-shrink-0" />
                            <p className="text-sm leading-relaxed text-foreground/70">
                              {note}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </TabsContent>

                {/* Breakdown Tab */}
                <TabsContent value="breakdown" className="space-y-12">
                  {(structuredData.sentences ?? []).map((sentence, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="mb-12 last:mb-0"
                    >
                      <div className="px-2 mb-6">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xl font-jp text-foreground leading-relaxed flex-1">
                            {sentence.japanese}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0 pt-1">
                            <button
                              onClick={() => speak(sentence.japanese)}
                              className="h-8 w-8 rounded-full hover:bg-sakura/10 flex items-center justify-center text-muted-foreground hover:text-sakura transition-colors"
                              title="Đọc câu này"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => copyToClipboard(sentence.japanese)}
                              className="h-8 w-8 rounded-full hover:bg-sakura/10 flex items-center justify-center text-muted-foreground hover:text-sakura transition-colors"
                              title="Copy câu gốc"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <p className="text-sm text-muted-foreground flex-1">
                            {sentence.vietnamese}
                          </p>
                          <button
                            onClick={() => copyToClipboard(sentence.vietnamese)}
                            className="h-7 w-7 rounded-full hover:bg-sakura/10 flex items-center justify-center text-muted-foreground/50 hover:text-sakura transition-colors shrink-0"
                            title="Copy bản dịch"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {(sentence.breakdown?.words ?? []).map((word, widx) => (
                          <motion.div 
                            key={widx} 
                            whileHover={{ scale: 1.02 }}
                            className="bg-sakura-light/10 dark:bg-sakura-light/5 p-4 rounded-2xl border border-sakura-light/20 hover:bg-white dark:hover:bg-muted/50 transition-all shadow-sm hover:shadow-md cursor-default group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-jp text-lg font-bold text-foreground group-hover:text-sakura transition-colors">
                                  {word.word}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); speak(word.word); }}
                                  className="h-7 w-7 rounded-full hover:bg-sakura/20 flex items-center justify-center text-muted-foreground/40 hover:text-sakura transition-all opacity-0 group-hover:opacity-100"
                                  title="Đọc từ này"
                                >
                                  <Volume2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {word.jlpt_level && (
                                <Badge variant="secondary" className="text-[10px] rounded-full bg-white dark:bg-muted text-muted-foreground font-bold">
                                  {word.jlpt_level}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs font-jp text-muted-foreground/70 mb-2">{word.reading}</div>
                            {(word.word || word.reading) && (
                              <div className="mb-2">
                                <PitchAccent
                                  word={word.word}
                                  reading={word.reading}
                                  pattern={word.pitch_pattern}
                                />
                              </div>
                            )}
                            {word.hanviet && (
                              <div className="text-[11px] text-sakura-dark/80 font-bold mb-2 uppercase tracking-wide">
                                Hán Việt: {word.hanviet}
                              </div>
                            )}
                            <p className="text-sm text-foreground/70">
                              {word.meaning}
                            </p>
                            {/[\u4e00-\u9faf]/.test(word.word) && (
                              <WordEtymology word={word.word} contextSentence={sentence.japanese} />
                            )}
                          </motion.div>
                        ))}
                      </div>

                      {sentence.breakdown?.grammar_patterns && sentence.breakdown.grammar_patterns.length > 0 && (
                        <div className="px-2 space-y-4">
                          <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">Grammar in sentence</h5>
                          <div className="space-y-3">
                            {(sentence.breakdown.grammar_patterns ?? []).map((pattern, pidx) => {
                              const patternKey = `${idx}-${pidx}`;
                              const isExpanded = expandedPatterns[patternKey];
                              return (
                                <div key={pidx} className="border border-border/30 rounded-2xl overflow-hidden">
                                  <button
                                    onClick={() => setExpandedPatterns(prev => ({ ...prev, [patternKey]: !prev[patternKey] }))}
                                    className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="h-2 w-2 rounded-full bg-sakura-light/40 shrink-0" />
                                      <div>
                                        <div className="font-bold font-jp text-foreground text-sm">
                                          {pattern.pattern}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {pattern.meaning}
                                        </div>
                                      </div>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                  </button>
                                  {isExpanded && pattern.usage && (
                                    <div className="px-4 pb-4 pt-0">
                                      <div className="text-[12px] text-foreground/70 leading-relaxed bg-muted/30 rounded-xl p-3">
                                        {pattern.usage}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Check Grammar per sentence */}
                      <div className="px-2 mt-4">
                        <div className="flex items-center gap-2">
                          {checkingSentence === idx ? (
                            <Button disabled size="sm" variant="outline" className="rounded-full text-xs h-8 gap-1.5">
                              <Loader2 className="h-3 w-3 animate-spin" /> Đang kiểm tra...
                            </Button>
                          ) : sentenceCheckResults[idx] ? (
                            <div className="w-full space-y-3">
                              {sentenceCheckResults[idx].isCorrect ? (
                                <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                                  <CheckCircle className="h-3.5 w-3.5" /> Câu này không có lỗi ngữ pháp
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <GrammarDiff
                                    original={sentence.japanese}
                                    corrected={sentenceCheckResults[idx].corrected}
                                    errors={sentenceCheckResults[idx].errors as any}
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button
                                      onClick={() => setShowSentenceMistakeReview(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                      variant="outline"
                                      size="sm"
                                      className={cn(
                                        'rounded-full text-xs gap-1.5 h-7',
                                        showSentenceMistakeReview[idx] ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'border-indigo-200/50'
                                      )}
                                    >
                                      <Target className="h-3 w-3" /> {showSentenceMistakeReview[idx] ? 'Ẩn' : 'Tìm lỗi'}
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        setSentenceCheckResults(prev => { const n = { ...prev }; delete n[idx]; return n; });
                                        setShowSentenceMistakeReview(prev => { const n = { ...prev }; delete n[idx]; return n; });
                                      }}
                                      variant="ghost"
                                      size="sm"
                                      className="rounded-full text-xs h-7 text-muted-foreground/50"
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                  {showSentenceMistakeReview[idx] && sentenceCheckResults[idx].errors?.length > 0 && (
                                    <MistakeReviewMode
                                      originalText={sentence.japanese}
                                      errors={sentenceCheckResults[idx].errors as any}
                                      onClose={() => setShowSentenceMistakeReview(prev => ({ ...prev, [idx]: false }))}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Button
                              onClick={() => checkSentenceGrammar(idx, sentence.japanese)}
                              variant="outline"
                              size="sm"
                              className="rounded-full text-xs h-8 gap-1.5 border-indigo-200/50 hover:border-indigo-300"
                            >
                              <Send className="h-3 w-3" /> Check grammar
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>

                {/* Grammar Summary Tab — Upgraded */}
                <TabsContent value="grammar" className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border-border/50 shadow-sm bg-card rounded-3xl overflow-hidden">
                      <CardContent className="p-6 space-y-8">
                        {/* JLPT Distribution */}
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 mb-4 flex items-center gap-2">
                            <GraduationCap className="h-3.5 w-3.5" /> JLPT Distribution
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {['N5','N4','N3','N2','N1'].map(lv => {
                              const count = (() => {
                                const lvlMap: Record<string, string> = structuredData?.sentences?.reduce<Record<string, string>>((acc, s) => {
                                  s.breakdown.words?.forEach(w => { if (w.jlpt_level) acc[w.word] = w.jlpt_level; });
                                  return acc;
                                }, {}) || {};
                                return Object.values(lvlMap).filter(v => v === lv).length;
                              })();
                              if (count === 0 && lv !== structuredData.overall_analysis.jlpt_level) return null;
                              return (
                                <Badge key={lv} className={cn(
                                  'px-3 py-1.5 rounded-full text-[10px] font-bold border-none',
                                  lv === 'N5' && 'bg-green-100 text-green-700',
                                  lv === 'N4' && 'bg-blue-100 text-blue-700',
                                  lv === 'N3' && 'bg-yellow-100 text-yellow-700',
                                  lv === 'N2' && 'bg-orange-100 text-orange-700',
                                  lv === 'N1' && 'bg-red-100 text-red-700',
                                )}>
                                  {lv} <span className="ml-1 opacity-60">({count} từ)</span>
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        {/* Particles */}
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">Particles Used</h4>
                          <div className="flex flex-wrap gap-2">
                            {(structuredData.grammar_summary?.particles_used ?? []).map((particle, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="font-jp text-base px-3 py-1 bg-sakura-light/20 text-foreground/80 border-none rounded-full font-bold"
                              >
                                {typeof particle === 'string' ? particle : (particle as any).particle || (particle as any).name || JSON.stringify(particle)}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Verb Forms */}
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">Verb Forms</h4>
                          <div className="flex flex-wrap gap-2">
                            {(structuredData.grammar_summary?.verb_forms ?? []).map((form, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="px-3 py-1 bg-orange-100/50 text-orange-700 border-none rounded-full text-xs font-medium"
                              >
                                {typeof form === 'string' ? form : (form as any).form || (form as any).name || JSON.stringify(form)}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Key Patterns — Rich cards with deep dive + enriched data */}
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 mb-4 flex items-center gap-2">
                            <Lightbulb className="h-3.5 w-3.5" /> Grammar Patterns ({aggregatedPatterns.length || (structuredData.grammar_summary?.key_patterns?.length ?? 0)})
                          </h4>

                          {/* Helper: get display name for a pattern */}
                          {(() => {
                            // Priority: aggregatedPatterns (from sentence breakdowns) > key_patterns (from grammar_summary)
                            const patterns = aggregatedPatterns.length > 0
                              ? aggregatedPatterns
                              : (structuredData.grammar_summary?.key_patterns ?? []).map(p => ({
                                  pattern: typeof p === 'string' ? p : (p as GrammarSummaryPattern).pattern,
                                  meaning: typeof p === 'string' ? '' : (p as GrammarSummaryPattern).meaning || '',
                                  jlpt_level: typeof p === 'string' ? structuredData.overall_analysis?.jlpt_level : (p as GrammarSummaryPattern).jlpt_level,
                                  usage: '',
                                  register: undefined as string | undefined,
                                  common_mistakes: typeof p === 'string' ? undefined : (p as GrammarSummaryPattern).common_mistakes,
                                  similar_patterns: undefined,
                                }));

                            return (
                              <div className="space-y-2">
                                {patterns.map((pattern, idx) => {
                                  const isActive = grammarTabDeepDive === pattern.pattern;
                                  return (
                                    <div key={idx}>
                                      <button
                                        onClick={() => setGrammarTabDeepDive(isActive ? null : pattern.pattern)}
                                        className={cn(
                                          'w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all text-left',
                                          isActive
                                            ? 'bg-indigo-50/80 border-indigo-200 shadow-sm'
                                            : 'bg-white/80 border-border/40 hover:border-indigo-100 hover:shadow-sm'
                                        )}
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="h-2 w-2 rounded-full bg-sakura shrink-0" />
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-jp font-bold text-sm text-foreground">{pattern.pattern}</span>
                                              <Badge className={cn(
                                                'text-[8px] font-black px-1.5 py-0 rounded-full border-none',
                                                ((pattern as any).jlpt_level || structuredData.overall_analysis.jlpt_level) === 'N5' && 'bg-green-100 text-green-600',
                                                ((pattern as any).jlpt_level || structuredData.overall_analysis.jlpt_level) === 'N4' && 'bg-blue-100 text-blue-600',
                                                ((pattern as any).jlpt_level || structuredData.overall_analysis.jlpt_level) === 'N3' && 'bg-yellow-100 text-yellow-600',
                                                ((pattern as any).jlpt_level || structuredData.overall_analysis.jlpt_level) === 'N2' && 'bg-orange-100 text-orange-600',
                                                ((pattern as any).jlpt_level || structuredData.overall_analysis.jlpt_level) === 'N1' && 'bg-red-100 text-red-600',
                                              )}>
                                                {(pattern as any).jlpt_level || structuredData.overall_analysis.jlpt_level || 'N?'}
                                              </Badge>
                                              {(pattern as any).register && (
                                                <Badge className="text-[7px] px-1.5 py-0 rounded-full border-none bg-violet-100 text-violet-600">
                                                  {(pattern as any).register}
                                                </Badge>
                                              )}
                                              {(pattern as any).frequency && (
                                                <Badge className={cn(
                                                  'text-[7px] px-1.5 py-0 rounded-full border-none',
                                                  (pattern as any).frequency === 'high' && 'bg-emerald-100 text-emerald-600',
                                                  (pattern as any).frequency === 'medium' && 'bg-amber-100 text-amber-600',
                                                  (pattern as any).frequency === 'low' && 'bg-gray-100 text-gray-600',
                                                )}>
                                                  {(pattern as any).frequency}
                                                </Badge>
                                              )}
                                            </div>
                                            {pattern.meaning && (
                                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{pattern.meaning}</p>
                                            )}
                                          </div>
                                        </div>
                                        {isActive ? (
                                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        ) : (
                                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        )}
                                      </button>
                                      {isActive && (
                                        <div className="mt-2 ml-4 space-y-3">
                                          {/* Usage */}
                                          {(pattern as any).usage && (
                                            <div className="text-xs text-foreground/70 leading-relaxed bg-muted/30 rounded-xl p-3">
                                              {(pattern as any).usage}
                                            </div>
                                          )}

                                          {/* Common mistakes */}
                                          {(pattern as any).common_mistakes?.length > 0 && (
                                            <div className="space-y-1.5">
                                              <p className="text-[9px] font-black uppercase tracking-wider text-rose-500">Lỗi thường gặp</p>
                                              {(pattern as any).common_mistakes.map((m: string, mi: number) => (
                                                <div key={mi} className="flex items-start gap-2 text-xs text-rose-600/80">
                                                  <span className="text-rose-300 mt-0.5">›</span>
                                                  <span>{m}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          {/* Similar patterns */}
                                          {(pattern as any).similar_patterns?.length > 0 && (
                                            <div className="space-y-1.5">
                                              <p className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Dễ nhầm lẫn với</p>
                                              <div className="flex flex-wrap gap-1.5">
                                                {(pattern as any).similar_patterns.map((sp: string, si: number) => (
                                                  <span key={si} className="font-jp text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                                                    {sp}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Deep dive */}
                                          <GrammarDeepDive
                                            rule={{
                                              pattern: pattern.pattern,
                                              jlpt: (pattern as any).jlpt_level || structuredData.overall_analysis.jlpt_level || 'N?',
                                              meaning: pattern.meaning,
                                            }}
                                            userSentence={structuredData.sentences.find(s =>
                                              s.breakdown.grammar_patterns?.some(gp => gp.pattern === pattern.pattern)
                                            )?.japanese || structuredData.sentences[0]?.japanese || ''}
                                            isOpen={true}
                                            onToggle={() => setGrammarTabDeepDive(null)}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                        {/* Grammar tips section */}
                        {(structuredData.grammar_summary?.key_patterns?.length ?? 0) > 0 && aggregatedPatterns.length === 0 && (
                          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/50 space-y-2">
                            <div className="flex items-center gap-2 text-amber-700">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">Mẹo học</span>
                            </div>
                            <p className="text-xs text-amber-700/70 leading-relaxed">
                              Bài đọc này sử dụng {structuredData.grammar_summary?.key_patterns?.length ?? 0} cấu trúc ngữ pháp chính.
                              Hãy click vào từng pattern để xem giải thích chi tiết và ví dụ.
                            </p>
                          </div>
                        )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                {/* Suggested Flashcards Tab */}
                <TabsContent value="flashcards" className="space-y-8">
                  <div className="flex justify-between items-center px-2 mb-4">
                    <h4 className="text-xl font-display font-medium text-foreground">
                      Suggested Flashcards
                    </h4>
                    <Button size="sm" onClick={handleAddAllFlashcards} variant="ghost" className="text-xs font-bold text-sakura hover:bg-sakura-light/50 rounded-full">
                      Add All
                    </Button>
                  </div>

                  <div className="space-y-6 pb-4">
                    {structuredData.suggested_flashcards.map((flashcard, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all bg-card rounded-3xl overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="space-y-1">
                                <div className="text-2xl font-jp text-foreground font-bold group-hover:text-sakura transition-colors">{flashcard.word}</div>
                                <div className="text-sm text-muted-foreground/70 font-jp">{flashcard.reading}</div>
                                {flashcard.hanviet && (
                                  <div className="text-[11px] text-sakura-dark font-bold uppercase tracking-wider">
                                    Hán Việt: {flashcard.hanviet}
                                  </div>
                                )}
                              </div>
                              {flashcard.jlpt_level && (
                                <Badge variant="secondary" className="text-[10px] rounded-full bg-sakura-light/20 text-muted-foreground font-bold">
                                  {flashcard.jlpt_level}
                                </Badge>
                              )}
                            </div>

                            <div className="p-4 bg-cream/50 rounded-2xl text-base text-foreground/80 mb-6 font-medium">
                              {flashcard.meaning}
                            </div>

                            <div className="space-y-2 px-2">
                              <div className="text-sm font-jp text-foreground/80 leading-relaxed font-medium">{flashcard.example_sentence}</div>
                              <div className="text-xs text-muted-foreground/70 italic">{flashcard.example_translation}</div>
                            </div>

                            <Button
                              size="sm"
                              variant="default"
                              className="w-full mt-8 bg-sakura hover:bg-sakura-dark text-white font-bold text-xs h-10 rounded-full shadow-sm"
                              onClick={() => handleAddFlashcard(flashcard)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Save to Deck
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
              </AnalysisErrorBoundary>
            ) : content ? (
              // Fallback to markdown for non-structured responses
              <div className="p-6 prose prose-sm max-w-none">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-sm mt-10 p-6">
                Ask about the current segment to get detailed cultural and grammatical explanations.
              </div>
            )}
          </ScrollArea>
        </motion.div>
      )}
      
      {/* Folder Selection Dialog */}
      <FolderSelectionDialog
        open={showFolderDialog}
        onClose={() => {
          setShowFolderDialog(false);
          setPendingFlashcard(null);
          setPendingBulkAdd(false);
        }}
        onSelectFolder={handleFolderSelected}
        title={pendingBulkAdd ? "Add All Flashcards" : "Add Flashcard"}
      />
    </AnimatePresence>
  );
};

export default AnalysisPanel;
