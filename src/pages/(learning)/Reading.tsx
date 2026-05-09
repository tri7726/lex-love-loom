import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Volume2, Loader2, Zap, Database, Globe, Filter, Sparkles, History, Trash2, User as UserIcon, PanelLeftClose, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigation } from '@/components/navigation/Navigation';
import { CreatePassageDialog } from '@/components/forms/CreatePassageDialog';
import { WordLookupPanel } from '@/components/search/WordLookupPanel';
import { AnalysisHistory, type AnalysisItem } from '@/components/chat/AnalysisHistory';
import { AnalysisPanel, type StructuredAnalysis } from '@/components/video/AnalysisPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useFurigana } from '@/contexts/FuriganaContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';

// Allow only ruby-related tags so user-supplied passages cannot inject scripts.
const sanitizeFurigana = (html: string) =>
  DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS: ['ruby', 'rt', 'rp', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

const JLPT_LEVELS: Record<string, number> = {
  'N5': 5,
  'N4': 4,
  'N3': 3,
  'N2': 2,
  'N1': 1,
  'all': 6
};

/**
 * Filters furigana based on user level and mode.
 * If mode is 'smart', it hides furigana for kanji at or below the user's level.
 * Example: User is N3 (3), it hides N5 (5), N4 (4), N3 (3).
 */
export const filterFurigana = (html: string, mode: string, userLevel: string): string => {
  if (mode === 'always') return html;
  if (mode === 'never') {
    return html.replace(/<ruby>(.*?)<rt>.*?<\/rt><\/ruby>/g, '$1');
  }
  
  // Smart mode
  const userLevelNum = JLPT_LEVELS[userLevel] || 5;
  
  return html.replace(/<ruby data-level="(N[1-5])">(.*?)<rt>.*?<\/rt><\/ruby>/g, (match, level, kanji) => {
    const kanjiLevelNum = JLPT_LEVELS[level] || 5;
    // If kanji level is >= user level (e.g. N5 >= N3), hide it.
    // Remember: N5 is 5, N1 is 1. So 5 >= 3 is true. 
    if (kanjiLevelNum >= userLevelNum) {
      return kanji;
    }
    return match;
  });
};

interface VocabItem {
  word: string;
  reading: string;
  meaning: string;
}

interface PreloadedVocab {
  word: string;
  reading: string;
  meaning: string;
  word_type?: string;
  examples?: Array<{ japanese: string; vietnamese: string }>;
  notes?: string;
}

interface ReadingPassage {
  id: string;
  title: string;
  content: string;
  content_with_furigana?: string | null;
  translation?: string | null;
  level: string;
  category?: string | null;
  topic?: string | null;
  image_url?: string | null;
  preloaded_vocabulary?: any[] | null;
  vocabulary_list?: any[] | null;
  vocabulary?: any[] | null;
  grammar?: any[] | null;
  questions?: Array<{
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  }> | null;
  user_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface WordData {
  word: string;
  reading: string;
  meaning: string;
  word_type?: string;
  examples?: Array<{ japanese: string; vietnamese: string }>;
  notes?: string;
  source?: string;
  cached?: boolean;
  translation?: string;
  vietnamese?: string;
}

type DisplayMode = 'kanji' | 'furigana';

const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'];

const SourceBadge = ({ source, cached }: { source?: string; cached?: boolean }) => {
  if (cached && source === 'preload') {
    return <Badge variant="outline" className="gap-1 text-xs"><Database className="h-3 w-3" /> Preload</Badge>;
  }
  if (cached) {
    return <Badge variant="outline" className="gap-1 text-xs"><Zap className="h-3 w-3" /> Cache</Badge>;
  }
  if (source === 'jisho') {
    return <Badge variant="outline" className="gap-1 text-xs"><Globe className="h-3 w-3" /> Jisho</Badge>;
  }
  return <Badge variant="secondary" className="gap-1 text-xs">AI</Badge>;
};

export const Reading = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { mode: globalFuriganaMode, userLevel } = useFurigana();
  const [passages, setPassages] = useState<ReadingPassage[]>([]);
  const [selectedPassage, setSelectedPassage] = useState<ReadingPassage | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('furigana');
  const passageId = searchParams.get('id');
  
  // Filter state
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [passageType, setPassageType] = useState<'system' | 'personal'>('system');
  
  // Word lookup state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Analysis state
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisContent, setAnalysisContent] = useState<string | null>(null);
  
  // Translation state
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Layout state
  const [showSidebar, setShowSidebar] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  interface WordBreakdown {
    word: string;
    reading: string;
    hanviet?: string;
    meaning: string;
    word_type: string;
    jlpt_level?: string;
  }

  interface GrammarPattern {
    pattern: string;
    meaning: string;
    usage: string;
  }

  interface SentenceAnalysis {
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

  const [structuredAnalysis, setStructuredAnalysis] = useState<StructuredAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reasoningMode, setReasoningMode] = useState<'fast' | 'standard' | 'deep'>(() => {
    if (typeof window === 'undefined') return 'standard';
    return (localStorage.getItem('analysis_reasoning_mode') as 'fast' | 'standard' | 'deep') || 'standard';
  });
  React.useEffect(() => {
    try { localStorage.setItem('analysis_reasoning_mode', reasoningMode); } catch { /* ignore */ }
  }, [reasoningMode]);

  // Fetch passages
  const fetchPassages = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all passages (System + Personal)
      // Note: In an ideal world, we would use Supabase RLS, but here we'll filter in JS for simplicity
      // and to show both "System" (user_id IS NULL) and "Personal" (user_id = current user)
      const { data, error } = await supabase
        .from('reading_passages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter: user_id is null (system) OR user_id matches current user.
      const accessibleData = (data || []).filter(p => !p.user_id || p.user_id === user?.id);

      // Parse JSONB fields and map to local names if needed
      const parsed: ReadingPassage[] = (accessibleData || []).map((p: any) => ({
        ...p,
        // Schema uses `furigana_content`; UI expects `content_with_furigana`
        content_with_furigana: p.content_with_furigana ?? p.furigana_content ?? null,
        vocabulary: Array.isArray(p.vocabulary) ? p.vocabulary : (Array.isArray(p.vocabulary_list) ? p.vocabulary_list : []),
        grammar: Array.isArray(p.grammar) ? p.grammar : [],
        questions: Array.isArray(p.questions) ? p.questions : []
      }));

      // Sort by level
      const sorted = parsed.sort((a, b) => {
        return LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
      });

      setPassages(sorted);

    } catch (error: unknown) {
      console.error('Error fetching passages:', error);
      toast.error('Không thể tải bài đọc', {
        description: 'Có thể do mạng yếu. Bấm Thử lại để tải lại.',
        action: { label: 'Thử lại', onClick: () => fetchPassages() },
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPassages();
  }, [fetchPassages]);

  // Handle auto-selection and URL parameter for specific passage
  useEffect(() => {
    if (loading || passages.length === 0) return;

    if (passageId) {
      const passage = passages.find(p => p.id === passageId);
      if (passage) {
        setSelectedPassage(passage);
        if (passage.category === 'news') {
          setPassageType('system');
        }
        return;
      }
    }

    // Default auto-select if nothing selected
    if (!selectedPassage) {
      const firstSystem = passages.find(p => !p.user_id);
      if (firstSystem) setSelectedPassage(firstSystem);
    }
  }, [passageId, passages, loading, selectedPassage]);

  const deletePassage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa bài đọc này không?')) return;

    try {
      const { error } = await supabase
        .from('reading_passages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Xóa bài đọc thành công');
      if (selectedPassage?.id === id) {
        setSelectedPassage(null);
      }
      fetchPassages();
    } catch (error: unknown) {
      console.error('Error deleting passage:', error);
      toast.error('Không thể xóa bài đọc');
    }
  };


  const handleApplyHistory = (item: AnalysisItem) => {
    setStructuredAnalysis(item.analysis as StructuredAnalysis);
    setShowAnalysis(true);
    setHistoryOpen(false);
  };

  // Get unique categories from passages
  const categories = useMemo(() => {
    const cats = passages.map(p => p.category).filter(Boolean) as string[];
    return [...new Set(cats)];
  }, [passages]);

  // Filtered passages
  const filteredPassages = useMemo(() => {
    return passages.filter(p => {
      const isSystem = !p.user_id;
      const isPersonal = p.user_id === user?.id;
      const isAdmin = profile?.role === 'admin';
      
      const matchType = (passageType === 'system' || (passageType === 'personal' && isAdmin)) ? (isSystem || isPersonal) : isPersonal;
      // Wait, let's simplify logic: if system tab, show system. if personal tab, show personal.
      // But user wants "mật khẩu 123123 là admin để đôi khi thêm các bài đọc cho mọi người"
      // So if admin is in "System" tab, they see system. 
      // If admin is in "Personal" tab, they see their own? 
      // Actually, the previous logic was:
      // matchType = passageType === 'system' ? isSystem : isPersonal;
      // Let's keep it simple for now and fix the scope.
      
      const matchTypeSimple = passageType === 'system' ? isSystem : isPersonal;
      const matchLevel = levelFilter === 'all' || p.level === levelFilter;
      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
      
      return matchType && matchLevel && matchCategory;
    });
  }, [passages, levelFilter, categoryFilter, passageType, user, profile]);

  const handleTranslate = async () => {
    if (!selectedPassage) return;
    
    if (translatedText) {
      setTranslatedText(null);
      return;
    }

    setIsTranslating(true);
    try {
      // Pre-process content: remove excessive spaces and newlines within segments
      // Japanese text shouldn't have spaces between words; these often come from segmenters
      const rawContent = selectedPassage.content;
      const cleanContent = rawContent.replace(/([ぁ-んァ-ン一-龠])\s+([ぁ-んァ-ン一-龠])/g, '$1$2').trim();
      
      const MAX_CHUNK_SIZE = 600; // Slightly larger but safer
      const chunks = [];
      let currentChunk = "";
      
      // Split by sentence boundaries (periods, exclamation, question marks, or double newlines)
      // We don't use 'g' with space at end anymore
      const parts = cleanContent.split(/([。！？\n]+)/);
      
      for (const part of parts) {
        if (!part) continue;
        if ((currentChunk + part).length > MAX_CHUNK_SIZE && currentChunk) {
          chunks.push(currentChunk);
          currentChunk = part;
        } else {
          currentChunk += part;
        }
      }
      if (currentChunk) chunks.push(currentChunk);

      const translatedChunks = await Promise.all(chunks.map(async (chunk) => {
        const trimmedChunk = chunk.trim();
        if (!trimmedChunk) return "";
        
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&q=${encodeURIComponent(trimmedChunk)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Translation API failed');
        const data = await res.json();
        
        if (data && data[0]) {
          return data[0].map((item: any) => item[0] || "").join('');
        }
        return "";
      }));
      
      setTranslatedText(translatedChunks.filter(Boolean).join(' '));
    } catch (err) {
      console.error(err);
      toast.error('Gặp lỗi khi dịch văn bản. Vui lòng thử lại.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDeepAnalysis = async () => {
    if (!selectedPassage) return;
    
    setShowAnalysis(true);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisContent(null);
    setStructuredAnalysis(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders = session ? { Authorization: `Bearer ${session.access_token}` } : {};

      // Pass 1: Overview (fast) — show something immediately
      const overviewPromise = supabase.functions.invoke('japanese-analysis', {
        body: {
          content: selectedPassage.content,
          pass: 'overview',
          reasoning_mode: reasoningMode,
          saveToHistory: false,
        },
        headers: authHeaders,
      }).then(({ data, error }) => {
        if (error || !data?.analysis) return;
        // Render partial overview as a minimal StructuredAnalysis so the panel renders
        setStructuredAnalysis(prev => prev ?? ({
          overall_analysis: {
            jlpt_level: data.analysis.overall_analysis?.jlpt_level || '?',
            politeness_level: data.analysis.overall_analysis?.politeness_level || '—',
            text_type: data.analysis.overall_analysis?.text_type || '—',
            register: data.analysis.overall_analysis?.register,
            dialect: data.analysis.overall_analysis?.dialect,
            summary: data.analysis.overall_analysis?.summary || '',
          },
          sentences: [],
          suggested_flashcards: (data.analysis.key_vocab_preview || []).map((v: { word: string; reading: string; meaning: string; jlpt_level?: string }) => ({
            word: v.word, reading: v.reading, meaning: v.meaning,
            example_sentence: '', example_translation: '',
            jlpt_level: v.jlpt_level || '', word_type: ''
          })),
          grammar_summary: { particles_used: [], verb_forms: [], key_patterns: [] },
          cultural_notes: data.analysis.cultural_notes || [],
        } as unknown as StructuredAnalysis));
      }).catch(err => console.warn('Overview pass failed:', err));

      // Pass 2: Deep (full structured) — replaces overview when ready
      const deepPromise = supabase.functions.invoke('japanese-analysis', {
        body: {
          prompt: `Hãy phân tích cực kỳ chi tiết bài đọc này cho người học tiếng Việt. Bao gồm: 1. Tóm tắt nội dung sâu sắc. 2. Phân tích ít nhất 3-5 câu quan trọng (dịch tự nhiên, bóc tách từ vựng chi tiết với Hán Việt, pitch_pattern L/H, giải thích ngữ pháp kỹ lưỡng). 3. Tổng hợp ngữ pháp và lưu ý văn hóa. 4. Phát hiện register & dialect.`,
          content: selectedPassage.content,
          pass: 'deep',
          reasoning_mode: reasoningMode,
          saveToHistory: true,
        },
        headers: authHeaders,
      });

      // Wait for overview to render UI quickly, then await deep
      await overviewPromise;
      const { data, error } = await deepPromise;

      if (error) throw error;

      if (data.format === 'structured' && data.analysis) {
        setStructuredAnalysis(data.analysis);
      } else if (data.response) {
        setAnalysisContent(data.response);
      } else if (!structuredAnalysis) {
        throw new Error('Invalid response format');
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze. Please try again.';
      setAnalysisError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Strip ruby/HTML tags from furigana HTML to recover plain kanji text
  const stripFuriganaHtml = (html: string): string => {
    return html
      // Keep base text inside <ruby>...<rt>...</rt></ruby>
      .replace(/<ruby>\s*([\s\S]*?)\s*<rt>[\s\S]*?<\/rt>\s*<\/ruby>/g, '$1')
      // Convert <br> to real newlines
      .replace(/<br\s*\/?>/gi, '\n')
      // Drop any remaining tags
      .replace(/<[^>]+>/g, '');
  };

  // Get display content based on mode (always returns a non-empty fallback)
  const displayContent = useMemo(() => {
    if (!selectedPassage) return '';

    const rawKanji = (selectedPassage.content && selectedPassage.content.trim())
      ? selectedPassage.content
      : (selectedPassage.content_with_furigana ? stripFuriganaHtml(selectedPassage.content_with_furigana) : '');

    if (displayMode === 'furigana') {
      const html = selectedPassage.content_with_furigana || rawKanji;
      return filterFurigana(html, globalFuriganaMode, userLevel);
    }
    // 'kanji' (default)
    return rawKanji;
  }, [selectedPassage, displayMode, globalFuriganaMode, userLevel]);

  // Text-to-speech
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  // Word lookup - check local first, then API
  const lookupWord = async (word: string) => {
    if (!word.trim()) return;
    
    setSelectedWord(word);
    setLookupLoading(true);
    setWordData(null);

    try {
      // Step 1: Check preloaded vocabulary in current passage
      if (selectedPassage?.preloaded_vocabulary) {
        const preloaded = selectedPassage.preloaded_vocabulary.find(
          v => v.word === word || v.reading === word
        );
        if (preloaded) {
          console.log('Found in preloaded vocabulary!');
          setWordData({ ...preloaded, source: 'preload', cached: true });
          setLookupLoading(false);
          return;
        }
      }

      // Step 2: Check vocabulary_list
      if (selectedPassage?.vocabulary_list) {
        const vocab = selectedPassage.vocabulary_list.find(
          v => v.word === word || v.reading === word
        );
        if (vocab) {
          console.log('Found in vocabulary list!');
          setWordData({ ...vocab, source: 'preload', cached: true });
          setLookupLoading(false);
          return;
        }
      }

      // Step 3: Call API (will check cache → Jisho → AI)
      console.log('Calling lookup API...');
      let finalData: WordData | null = null;
      
      try {
        const { data, error } = await supabase.functions.invoke('lookup-word', {
          body: { word, context: selectedPassage?.content }
        });
        
        if (!error && data) {
          finalData = data;
        }
      } catch (err) {
        console.warn('Supabase lookup-word failed, using fallback:', err);
      }
      
      // Step 4: Fallback if API fails or returns no meaning
      if (!finalData || (!finalData.meaning && !finalData.translation && !finalData.vietnamese)) {
        console.log('Using Translate API Fallback for word:', word);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&q=${encodeURIComponent(word)}`;
        const res = await fetch(url);
        
        if (res.ok) {
          const tData = await res.json();
          const translation = tData[0].map((item: string[]) => item[0]).join('');
          
          finalData = {
            ...finalData,
            word: finalData?.word || word,
            reading: finalData?.reading || word,
            meaning: translation,
            source: 'Translate API',
            cached: false
          } as WordData;
        } else {
          throw new Error('Both primary and fallback APIs failed');
        }
      }

      setWordData(finalData);
    } catch (error: unknown) {
      console.error('Error looking up word:', error);
      toast.error('Không thể tra từ do lỗi mạng hoặc API.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Word Lookup Panel handles saving to custom folders now

  // Handle word click
  const handleWordClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const word = target.textContent?.trim();
    if (word && word.length > 0) {
      lookupWord(word);
    }
  };

  // Memoized character component for better performance
  const ClickableChar = React.memo(({ char, isSelected, onClick }: { char: string, isSelected: boolean, onClick: () => void }) => (
    <span
      className={cn(
        "cursor-pointer hover:bg-sakura/20 rounded transition-colors duration-150",
        isSelected && "bg-sakura/30"
      )}
      onClick={onClick}
    >
      {char}
    </span>
  ));

  // Render clickable text - Memoized
  const renderClickableText = useCallback((text: string, isHtml: boolean) => {
    if (isHtml && displayMode === 'furigana') {
      return (
        <div
          className="reading-content font-jp text-base sm:text-xl md:text-2xl cursor-pointer [&_ruby]:hover:bg-sakura/20 [&_ruby]:rounded [&_ruby]:px-0.5 [&_ruby]:transition-colors will-change-transform"
          style={{ lineHeight: '2.6', wordBreak: 'keep-all' }}
          dangerouslySetInnerHTML={{ __html: sanitizeFurigana(text) }}
          onClick={handleWordClick}
        />
      );
    }

    // Kanji mode: preserve line breaks while keeping per-character click
    const lines = text.split('\n');
    return (
      <div className="font-jp text-base sm:text-xl md:text-2xl leading-relaxed will-change-transform">
        {lines.map((line, lineIdx) => (
          <div key={`l-${lineIdx}`} className="block">
            {line.length === 0 ? (
              <span>&nbsp;</span>
            ) : (
              line.split('').map((char, idx) => (
                <ClickableChar
                  key={`${lineIdx}-${idx}-${char}`}
                  char={char}
                  isSelected={selectedWord === char}
                  onClick={() => lookupWord(char)}
                />
              ))
            )}
          </div>
        ))}
      </div>
    );
  }, [displayMode, selectedWord, handleWordClick, lookupWord]);

  const memoizedContent = useMemo(() => {
    return renderClickableText(
      displayContent,
      displayMode === 'furigana' && !!selectedPassage?.content_with_furigana
    );
  }, [renderClickableText, displayContent, displayMode, selectedPassage]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-[1.5rem] bg-sakura/5 flex items-center justify-center border border-sakura-light/20 shadow-soft transition-transform hover:scale-105">
              <BookOpen className="h-9 w-9 text-sakura" />
            </div>
            <div>
              <h1 className="text-4xl font-display font-black text-foreground italic tracking-tighter">Luyện Đọc</h1>
              <p className="text-muted-foreground font-medium text-sm">
                Đọc hiểu tiếng Nhật • <span className="text-sakura/60 font-black italic">Sakura Classic Edition</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-12 px-6 rounded-2xl border-border/40 text-foreground/70 font-black gap-3 hover:bg-muted/30 transition-all uppercase text-[10px] tracking-widest"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="h-4 w-4" />
              Lịch sử
            </Button>
            
            <Button 
              className="h-12 px-8 rounded-2xl bg-white border border-border/40 text-foreground font-black gap-3 hover:bg-muted/10 shadow-sm transition-all uppercase text-[10px] tracking-widest"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Tạo bài đọc mới
            </Button>
          </div>
        </div>
        
        {/* History Panel (Expandable) */}
        {historyOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <Card className="border-sakura-light/30 bg-sakura-light/10 p-6 rounded-[2rem] backdrop-blur-sm relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 rounded-full" 
                onClick={() => setHistoryOpen(false)}
              >
                <Plus className="h-4 w-4 rotate-45" />
              </Button>
              <AnalysisHistory onSelect={handleApplyHistory} />
            </Card>
          </motion.div>
        )}

        {/* Top toolbar: filters + passage selector (full-width layout) */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={passageType} onValueChange={(v) => setPassageType(v as 'system' | 'personal')}>
              <TabsList className="bg-muted/30 p-1 rounded-xl h-11">
                <TabsTrigger value="system" className="text-[11px] font-black uppercase tracking-widest rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:text-sakura data-[state=active]:shadow-sm">📖 Hệ thống</TabsTrigger>
                <TabsTrigger value="personal" className="text-[11px] font-black uppercase tracking-widest rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:text-sakura data-[state=active]:shadow-sm">👤 Của tôi</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="h-11 w-[160px] bg-white border-border/40 rounded-xl font-bold text-xs shadow-sm">
                <SelectValue placeholder="Tất cả Level" />
              </SelectTrigger>
              <SelectContent className="rounded-xl z-50">
                <SelectItem value="all">Tất cả Level</SelectItem>
                {LEVEL_ORDER.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 w-[180px] bg-white border-border/40 rounded-xl font-bold text-xs shadow-sm">
                <SelectValue placeholder="Tất cả chủ đề" />
              </SelectTrigger>
              <SelectContent className="rounded-xl z-50">
                <SelectItem value="all">Tất cả chủ đề</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedPassage?.id ?? ''}
              onValueChange={(id) => {
                const p = filteredPassages.find(x => x.id === id);
                if (p) {
                  setSelectedPassage(p);
                  setWordData(null);
                  setSelectedWord(null);
                  setTranslatedText(null);
                }
              }}
            >
              <SelectTrigger className="h-11 flex-1 min-w-[260px] bg-white border-border/40 rounded-xl font-bold text-xs shadow-sm">
                <SelectValue placeholder={loading ? 'Đang tải...' : 'Chọn bài đọc'} />
              </SelectTrigger>
              <SelectContent className="rounded-xl z-50 max-h-[60vh]">
                {filteredPassages.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">Không có bài đọc phù hợp</div>
                ) : filteredPassages.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-bold">{p.title}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">{p.level}{p.category ? ` • ${p.category}` : ''}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPassage && (passageType === 'personal' || profile?.role === 'admin') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 rounded-xl"
                onClick={(e) => deletePassage(selectedPassage.id, e)}
                title="Xóa bài đọc"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1">
          {/* Content Area (full width) */}
          <motion.div
            layout
            className="space-y-4"
          >
            {selectedPassage ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <Card className="shadow-[0_30px_80px_-20px_rgba(244,114,182,0.18),0_10px_30px_-10px_rgba(0,0,0,0.05)] rounded-[1.75rem] sm:rounded-[2.5rem] md:rounded-[3rem] bg-gradient-to-br from-white via-white to-sakura-light/10 overflow-hidden border border-sakura/15 ring-1 ring-sakura/5">
                  <CardHeader className="p-4 sm:p-6 md:p-10 pb-4 sm:pb-6 border-b border-sakura/10 bg-gradient-to-br from-sakura-light/15 via-white/40 to-transparent">
                    {/* Top Row: Tabs & Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 sm:mb-8">
                      <Tabs value={displayMode} onValueChange={(v) => setDisplayMode(v as DisplayMode)} className="w-full sm:max-w-xs">
                        <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur border border-sakura/20 rounded-2xl p-1 shadow-sm h-11 sm:h-12">
                          <TabsTrigger value="kanji" className="rounded-xl font-bold text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-sakura data-[state=active]:to-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Kanji</TabsTrigger>
                          <TabsTrigger value="furigana" className="rounded-xl font-bold text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-sakura data-[state=active]:to-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Furigana</TabsTrigger>
                        </TabsList>
                      </Tabs>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleTranslate}
                          disabled={isTranslating}
                          className="gap-1.5 rounded-full h-10 sm:h-11 px-3 sm:px-5 text-xs sm:text-sm transition-all text-sakura hover:bg-sakura/10 bg-sakura-light/10"
                        >
                          {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                          <span className="hidden xs:inline">Dịch</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDeepAnalysis}
                          className="gap-1.5 text-sakura hover:bg-sakura/10 bg-sakura-light/10 rounded-full h-10 sm:h-11 px-3 sm:px-5 text-xs sm:text-sm transition-all"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span className="hidden sm:inline">Phân tích sâu</span>
                          <span className="sm:hidden">AI</span>
                        </Button>
                        <div className="inline-flex items-center gap-0.5 rounded-full border border-sakura/20 bg-white/60 p-0.5 shadow-sm" title="Sensei mode">
                          {([
                            { v: 'fast', label: '速', tip: 'Nhanh — model nhẹ' },
                            { v: 'standard', label: '標', tip: 'Chuẩn — cân bằng' },
                            { v: 'deep', label: '深', tip: 'Sâu — reasoning' },
                          ] as const).map(opt => (
                            <button
                              key={opt.v}
                              type="button"
                              title={opt.tip}
                              onClick={() => setReasoningMode(opt.v)}
                              className={cn(
                                'h-7 min-w-7 px-2 rounded-full text-[11px] font-bold transition-all',
                                reasoningMode === opt.v
                                  ? 'bg-gradient-to-br from-sakura to-sakura-dark text-white shadow'
                                  : 'text-sakura/70 hover:bg-sakura/10'
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {selectedPassage.questions && selectedPassage.questions.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowQuiz(!showQuiz);
                              setQuizFinished(false);
                              setCurrentQuestion(0);
                              setScore(0);
                              setSelectedAnswer(null);
                              setIsCorrect(null);
                            }}
                            className={cn(
                              "gap-1.5 rounded-full h-10 sm:h-11 px-3 sm:px-5 text-xs sm:text-sm transition-all",
                              showQuiz ? "bg-primary text-white hover:bg-primary/90" : "text-sakura hover:bg-sakura/10 bg-sakura-light/10"
                            )}
                          >
                            <Zap className="h-4 w-4" />
                            {showQuiz ? "Quay lại" : "Quiz"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speak(selectedPassage.content)}
                          className="gap-1.5 rounded-full h-10 sm:h-11 px-3 sm:px-5 text-xs sm:text-sm text-foreground/80 hover:bg-muted bg-muted/40 transition-all"
                        >
                          <Volume2 className="h-4 w-4" />
                          <span className="hidden xs:inline">Nghe</span>
                        </Button>
                      </div>
                    </div>

                    {/* Bottom Row: Title & Badges */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <h2 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-foreground italic break-words">
                        {selectedPassage.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-sakura text-white border-none rounded-full px-3 sm:px-5 py-1 sm:py-1.5 font-black shadow-sm text-[10px] tracking-widest uppercase">{selectedPassage.level}</Badge>
                        {selectedPassage.category && (
                          <Badge variant="secondary" className="bg-sakura-light/20 text-sakura border-none rounded-full px-3 sm:px-5 py-1 sm:py-1.5 font-bold shadow-sm text-[10px] sm:text-[11px]">{selectedPassage.category}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-3 sm:p-5 md:p-8 pt-4 bg-gradient-to-b from-transparent to-sakura-light/5">
                    {/* The Reading Box or Quiz Box */}
                    <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] border border-sakura/15 shadow-[0_15px_40px_-12px_rgba(244,114,182,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] p-5 sm:p-8 md:p-12 relative overflow-hidden">
                      {/* Decorative corner accents */}
                      <div aria-hidden className="absolute -top-16 -right-16 w-40 sm:w-48 h-40 sm:h-48 rounded-full bg-gradient-to-br from-sakura/10 to-transparent blur-2xl pointer-events-none" />
                      <div aria-hidden className="absolute -bottom-20 -left-20 w-48 sm:w-56 h-48 sm:h-56 rounded-full bg-gradient-to-tr from-primary/10 to-transparent blur-2xl pointer-events-none" />
                      <div aria-hidden className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-sakura/40 to-transparent" />
                      <AnimatePresence mode="wait">
                        {!showQuiz ? (
                          <motion.div 
                            key={`${selectedPassage.id}-${displayMode}`}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.2 }}
                            className="min-h-[180px] sm:min-h-[240px] relative z-10"
                          >
                            <div className="relative text-foreground/80 font-jp tracking-wide">
                              {memoizedContent}
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="quiz-view"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="min-h-[400px]"
                          >
                            {!quizFinished ? (
                              <div className="space-y-8">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Câu {currentQuestion + 1} / {selectedPassage.questions?.length}</span>
                                  <Badge className="bg-sakura/10 text-sakura border-none">Điểm: {score}</Badge>
                                </div>
                                
                                <h3 className="text-2xl font-bold text-foreground mb-8">
                                  {selectedPassage.questions?.[currentQuestion].question}
                                </h3>

                                <div className="grid grid-cols-1 gap-4">
                                  {selectedPassage.questions?.[currentQuestion].options.map((option, idx) => (
                                    <Button
                                      key={idx}
                                      variant="outline"
                                      disabled={selectedAnswer !== null}
                                      className={cn(
                                        "h-16 justify-start px-8 rounded-2xl text-lg font-medium transition-all border-2",
                                        selectedAnswer === idx && isCorrect === true && "border-green-500 bg-green-50 text-green-700",
                                        selectedAnswer === idx && isCorrect === false && "border-red-500 bg-red-50 text-red-700",
                                        selectedAnswer !== null && idx === selectedPassage.questions?.[currentQuestion].answer && isCorrect === false && "border-green-500 bg-green-50",
                                        selectedAnswer === null && "hover:border-sakura hover:bg-sakura/5"
                                      )}
                                      onClick={() => {
                                        setSelectedAnswer(idx);
                                        const correct = idx === selectedPassage.questions?.[currentQuestion].answer;
                                        setIsCorrect(correct);
                                        if (correct) setScore(s => s + 10);
                                      }}
                                    >
                                      {option}
                                    </Button>
                                  ))}
                                </div>

                                {selectedAnswer !== null && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-8 p-6 rounded-2xl bg-muted/30 border border-border/40"
                                  >
                                    <p className="text-sm font-bold mb-2 flex items-center gap-2">
                                      {isCorrect ? <Sparkles className="h-4 w-4 text-yellow-500" /> : <div className="h-4 w-4 rounded-full bg-red-500" />}
                                      Giải thích:
                                    </p>
                                    <p className="text-sm text-muted-foreground">{selectedPassage.questions?.[currentQuestion].explanation}</p>
                                    
                                    <Button 
                                      className="mt-6 w-full rounded-xl h-12 font-bold"
                                      onClick={() => {
                                        if (currentQuestion + 1 < (selectedPassage.questions?.length || 0)) {
                                          setCurrentQuestion(currentQuestion + 1);
                                          setSelectedAnswer(null);
                                          setIsCorrect(null);
                                        } else {
                                          setQuizFinished(true);
                                        }
                                      }}
                                    >
                                      {currentQuestion + 1 < (selectedPassage.questions?.length || 0) ? "Câu tiếp theo" : "Hoàn thành"}
                                    </Button>
                                  </motion.div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
                                <div className="h-24 w-24 rounded-full bg-sakura/10 flex items-center justify-center mb-4">
                                  <Sparkles className="h-12 w-12 text-sakura" />
                                </div>
                                <h3 className="text-4xl font-black italic italic tracking-tighter">Hoàn thành!</h3>
                                <p className="text-xl font-medium text-muted-foreground">Bạn đã đạt được <span className="text-sakura font-black">{score}</span> điểm</p>
                                <Button 
                                  className="rounded-2xl h-14 px-10 font-bold text-lg shadow-lg shadow-sakura/20"
                                  onClick={() => setShowQuiz(false)}
                                >
                                  Quay lại bài đọc
                                </Button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {translatedText && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 p-8 rounded-[2rem] bg-sakura-light/5 border border-sakura-light/20"
                      >
                        <h4 className="text-xs font-black text-sakura mb-3 flex items-center gap-2 uppercase tracking-widest">
                          <Globe className="h-4 w-4" /> Bản dịch
                        </h4>
                        <p className="text-foreground/90 leading-relaxed font-medium text-lg">{translatedText}</p>
                      </motion.div>
                    )}

                    {/* Vocabulary List - MATCHED UI */}
                    {!showQuiz && selectedPassage.vocabulary && selectedPassage.vocabulary.length > 0 && (
                      <div className="mt-16 space-y-8">
                        <div className="flex items-center gap-4 px-2">
                          <h3 className="text-2xl font-display font-black text-foreground">
                            Từ vựng trong bài
                          </h3>
                          <Badge variant="outline" className="text-[10px] font-bold bg-white border-border/50 text-muted-foreground/60 px-3 py-1 rounded-full shadow-none gap-2">
                            <Sparkles className="h-3 w-3" /> Click – tra từ tức thì
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {selectedPassage.vocabulary.map((vocab: any, idx: number) => (
                            <motion.div
                              key={idx}
                              whileHover={{ y: -2 }}
                              className="notranslate p-8 rounded-[1.8rem] border border-border/30 cursor-pointer transition-all hover:border-sakura/20 hover:shadow-sm bg-slate-50/40 group"
                              onClick={() => lookupWord(vocab.word)}
                            >
                              <div className="flex flex-col gap-3">
                                <div className="flex items-baseline gap-3">
                                  <span className="font-jp font-black text-2xl text-foreground group-hover:text-sakura transition-colors">
                                    {vocab.word}
                                  </span>
                                  <span className="text-sm text-muted-foreground/50 font-jp font-bold">
                                    {vocab.reading}
                                  </span>
                                </div>
                                <p className="text-lg text-foreground/70 font-medium">{vocab.meaning}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grammar List */}
                    {!showQuiz && selectedPassage.grammar && selectedPassage.grammar.length > 0 && (
                      <div className="mt-16 space-y-8">
                        <div className="flex items-center gap-4 px-2">
                          <h3 className="text-2xl font-display font-black text-foreground">
                            Ngữ pháp cần lưu ý
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-5">
                          {selectedPassage.grammar.map((gram: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-8 rounded-[1.8rem] border border-border/30 bg-sakura-light/5"
                            >
                              <div className="flex flex-col gap-2">
                                <span className="font-bold text-xl text-sakura">
                                  {gram.pattern}
                                </span>
                                <p className="text-lg text-foreground/80">{gram.meaning}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  {/* Word Lookup Panel */}
                {(lookupLoading || wordData) && (
                  <div className="mt-6">
                    <WordLookupPanel
                      wordData={wordData}
                      loading={lookupLoading}
                      onClose={() => {
                        setWordData(null);
                        setSelectedWord(null);
                      }}
                      onSpeak={speak}
                    />
                  </div>
                )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-64 text-muted-foreground bg-white/50 rounded-[3rem] border border-dashed border-border/40"
              >
                <p className="font-medium">Chọn một bài đọc để bắt đầu</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      <CreatePassageDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
        onCreated={fetchPassages} 
      />

      <AnalysisPanel
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        onToggle={() => setShowAnalysis(!showAnalysis)}
        isLoading={isAnalyzing}
        content={analysisContent}
        error={analysisError}
        structuredData={structuredAnalysis}
        onRetry={handleDeepAnalysis}
        sourceText={selectedPassage?.content}
        onRewrite={async (mode, text) => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data, error } = await supabase.functions.invoke('japanese-analysis', {
              body: { task: 'rewrite', rewrite_mode: mode, content: text, reasoning_mode: reasoningMode, saveToHistory: false },
              headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
            });
            if (error) throw error;
            return data?.result ?? null;
          } catch (e) {
            console.error('rewrite error', e);
            toast.error('Không thể tạo bản viết lại. Thử lại sau nhé.');
            return null;
          }
        }}
      />
    </div>
  );
};

// export default Reading;
export default Reading;
