import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Volume2, Loader2, Zap, Database, Globe, Filter, Sparkles, History, Trash2, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigation } from '@/components/Navigation';
import { CreatePassageDialog } from '@/components/CreatePassageDialog';
import { WordLookupPanel } from '@/components/WordLookupPanel';
import { AnalysisHistory, type AnalysisItem } from '@/components/chat/AnalysisHistory';
import { AnalysisPanel } from '@/components/video/AnalysisPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  content_with_furigana: string | null;
  level: string;
  category: string | null;
  vocabulary_list: VocabItem[] | null;
  preloaded_vocabulary: PreloadedVocab[] | null;
  user_id: string | null;
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

type DisplayMode = 'kanji' | 'furigana' | 'kana';

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

  interface StructuredAnalysis {
    overall_analysis: {
      jlpt_level: string;
      politeness_level: string;
      text_type: string;
      summary: string;
    };
    sentences: SentenceAnalysis[];
    suggested_flashcards: SuggestedFlashcard[];
    grammar_summary: {
      particles_used: string[];
      verb_forms: string[];
      key_patterns: string[];
    };
    cultural_notes: string[];
  }

  const [structuredAnalysis, setStructuredAnalysis] = useState<StructuredAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRegeneratingFurigana, setIsRegeneratingFurigana] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleFixFurigana = async () => {
    if (!selectedPassage) return;
    
    setIsRegeneratingFurigana(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-reading', {
        body: { content: selectedPassage.content, level: selectedPassage.level }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (!data.content_with_furigana || !data.content_with_furigana.includes('<ruby>')) {
        throw new Error('AI vẫn không thể tạo Furigana. Thử lại sau.');
      }

      // Update in database
      const { error: updateError } = await supabase
        .from('reading_passages')
        .update({ 
          content_with_furigana: data.content_with_furigana,
          vocabulary_list: data.vocabulary_list || selectedPassage.vocabulary_list
        })
        .eq('id', selectedPassage.id);

      if (updateError) throw updateError;

      // Update local state
      const updatedPassage = { 
        ...selectedPassage, 
        content_with_furigana: data.content_with_furigana,
        vocabulary_list: data.vocabulary_list || selectedPassage.vocabulary_list
      };
      
      setSelectedPassage(updatedPassage);
      setPassages(prev => prev.map(p => p.id === updatedPassage.id ? updatedPassage : p));
      
      toast.success('Phục hồi Furigana thành công!');
    } catch (err: any) {
      console.error('Fix Furigana error:', err);
      toast.error(err.message || 'Không thể phục hồi Furigana');
    } finally {
      setIsRegeneratingFurigana(false);
    }
  };

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

      // Parse JSONB fields
      const parsed = accessibleData.map(p => ({
        ...p,
        vocabulary_list: Array.isArray(p.vocabulary_list) 
          ? (p.vocabulary_list as unknown as VocabItem[])
          : null,
        preloaded_vocabulary: Array.isArray(p.preloaded_vocabulary)
          ? (p.preloaded_vocabulary as unknown as PreloadedVocab[])
          : null
      }));

      // Sort by level
      const sorted = parsed.sort((a, b) => {
        return LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
      });

      setPassages(sorted);
    } catch (error: unknown) {
      console.error('Error fetching passages:', error);
      toast.error('Không thể tải bài đọc');
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
      
      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: { 
          prompt: "Hãy phân tích cực kỳ chi tiết bài đọc này cho người học tiếng Việt. Bao gồm: 1. Tóm tắt nội dung sâu sắc. 2. Phân tích ít nhất 3-5 câu quan trọng (dịch tự nhiên, bóc tách từ vựng chi tiết với Hán Việt, giải thích ngữ pháp kỹ lưỡng). 3. Tổng hợp ngữ pháp và lưu ý văn hóa.", 
          content: selectedPassage.content,
          saveToHistory: true
        },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });
      
      if (error) throw error;

      if (data.format === 'structured' && data.analysis) {
        setStructuredAnalysis(data.analysis);
      } else if (data.response) {
        setAnalysisContent(data.response);
      } else {
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

  // Convert furigana HTML to kana only
  const extractKanaOnly = (html: string): string => {
    return html
      .replace(/<ruby>([^<]+)<rt>([^<]+)<\/rt><\/ruby>/g, '$2')
      .replace(/<[^>]+>/g, '');
  };

  // Get display content based on mode
  const displayContent = useMemo(() => {
    if (!selectedPassage) return '';
    
    switch (displayMode) {
      case 'kanji':
        return selectedPassage.content;
      case 'furigana':
        return selectedPassage.content_with_furigana || selectedPassage.content;
      case 'kana':
        return selectedPassage.content_with_furigana 
          ? extractKanaOnly(selectedPassage.content_with_furigana)
          : selectedPassage.content;
      default:
        return selectedPassage.content;
    }
  }, [selectedPassage, displayMode]);

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
          className="font-jp text-xl leading-[2.5] cursor-pointer [&_ruby]:hover:bg-sakura/20 [&_ruby]:rounded [&_ruby]:px-1 [&_ruby]:transition-colors will-change-transform"
          dangerouslySetInnerHTML={{ __html: text }}
          onClick={handleWordClick}
        />
      );
    }

    const chars = text.split('');
    return (
      <div className="font-jp text-xl leading-[2.5] will-change-transform">
        {chars.map((char, idx) => (
          <ClickableChar
            key={`${idx}-${char}`}
            char={char}
            isSelected={selectedWord === char}
            onClick={() => lookupWord(char)}
          />
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
      <Navigation />

      <main className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-sakura animate-pulse-subtle" />
            <div>
              <h1 className="text-2xl font-display font-medium text-slate-900 dark:text-slate-100 italic">Luyện Đọc</h1>
              <p className="text-muted-foreground text-sm">
                Đọc hiểu tiếng Nhật • Sakura Classic Edition
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              Lịch sử
            </Button>
            <CreatePassageDialog onCreated={fetchPassages} />
          </div>
        </div>
        
        {/* History Panel (Expandable) */}
        {historyOpen && (
          <Card className="mb-6 border-sakura-light/30 bg-sakura-light/10 py-4 px-6 rounded-3xl backdrop-blur-sm">
            <AnalysisHistory onSelect={handleApplyHistory} />
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Passage List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="font-semibold text-lg">Danh sách bài đọc</h2>
            
            {/* Filters */}
            <div className="flex gap-2">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="flex-1 bg-background">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Tất cả Level</SelectItem>
                  {LEVEL_ORDER.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="flex-1 bg-white dark:bg-slate-950 rounded-xl border-sakura-light/50">
                  <SelectValue placeholder="Chủ đề" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-sakura-light/30 shadow-xl z-50 rounded-xl">
                  <SelectItem value="all">Tất cả chủ đề</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={passageType} onValueChange={(v) => {
              setPassageType(v as 'system' | 'personal');
              setWordData(null);
              setSelectedWord(null);
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-sakura-light/20 p-1 rounded-xl">
                <TabsTrigger value="system" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:text-sakura data-[state=active]:shadow-sm">📖 Hệ thống</TabsTrigger>
                <TabsTrigger value="personal" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:text-sakura data-[state=active]:shadow-sm">👤 Của tôi</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredPassages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Không có bài đọc phù hợp</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-2">
                {filteredPassages.map((passage) => (
                  <div key={passage.id}>
                    <Card
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-transparent hover:border-sakura-light/50 rounded-2xl overflow-hidden",
                        selectedPassage?.id === passage.id && "border-sakura-light ring-4 ring-sakura-light/20 bg-sakura-light/30 shadow-inner"
                      )}
                      onClick={() => {
                        setSelectedPassage(passage);
                        setWordData(null);
                        setSelectedWord(null);
                        setTranslatedText(null);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-jp font-bold text-slate-800 dark:text-slate-200">{passage.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {passage.category && (
                                <span className="text-xs text-muted-foreground">
                                  {passage.category}
                                </span>
                              )}
                              {passage.preloaded_vocabulary && passage.preloaded_vocabulary.length > 0 && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Database className="h-3 w-3" />
                                  {passage.preloaded_vocabulary.length} từ
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline">{passage.level}</Badge>
                            {(passageType === 'personal' || profile?.role === 'admin') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={(e) => deletePassage(passage.id, e)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content Area */}
          <motion.div className="lg:col-span-2 space-y-4">
            {selectedPassage ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Display Mode Tabs */}
                <div className="flex items-center justify-between">
                  <Tabs value={displayMode} onValueChange={(v) => setDisplayMode(v as DisplayMode)}>
                    <TabsList>
                      <TabsTrigger value="kanji">Kanji</TabsTrigger>
                      <TabsTrigger value="furigana">Furigana</TabsTrigger>
                      <TabsTrigger value="kana">Kana</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="flex gap-2">
                    {(!selectedPassage.content_with_furigana || !selectedPassage.content_with_furigana.includes('<ruby>')) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFixFurigana}
                        disabled={isRegeneratingFurigana}
                        className="gap-2 border-rose-100 text-rose-400 hover:bg-rose-50 rounded-full h-10 px-4 transition-all hover:shadow-sm"
                      >
                        {isRegeneratingFurigana ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Phục hồi Furigana
                      </Button>
                    )}
                    <Button
                      variant={translatedText ? "default" : "outline"}
                      size="sm"
                      onClick={handleTranslate}
                      disabled={isTranslating}
                      className={cn(
                        "gap-2 rounded-full h-10 px-6 transition-all",
                        translatedText 
                          ? "bg-sakura hover:bg-sakura-dark text-white shadow-md shadow-sakura/20 scale-105" 
                          : "border-sakura-light/50 text-sakura hover:bg-sakura-light/20"
                      )}
                    >
                      {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                      Dịch
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeepAnalysis}
                      className="gap-2 border-sakura-light/50 text-sakura-dark hover:bg-sakura-light/20 rounded-full h-10 px-4 transition-all"
                    >
                      <Sparkles className="h-4 w-4 animate-pulse-subtle" />
                      Phân tích sâu (AI)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => speak(selectedPassage.content)}
                      className="gap-2 rounded-full h-10 px-4 border-slate-100 hover:bg-slate-50 transition-all"
                    >
                      <Volume2 className="h-4 w-4" />
                      Nghe
                    </Button>
                  </div>
                </div>

                {/* Reading Content */}
                <Card className="shadow-card border-sakura-light/30 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm rounded-3xl overflow-hidden border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display font-medium text-2xl italic text-slate-900 dark:text-slate-100">
                        {selectedPassage.title}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge>{selectedPassage.level}</Badge>
                        {selectedPassage.category && (
                          <Badge variant="secondary">{selectedPassage.category}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={`${selectedPassage.id}-${displayMode}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="p-8 rounded-3xl bg-sakura-light/10 dark:bg-slate-900/40 border border-sakura-light/10 shadow-inner"
                      >
                        <div className="relative">
                          {memoizedContent}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                    {translatedText && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-5 rounded-lg bg-sakura/5 border border-sakura/20"
                      >
                        <h4 className="text-sm font-bold text-sakura mb-2 flex items-center gap-2">
                          <Globe className="h-4 w-4" /> Bản dịch (Translate API)
                        </h4>
                        <p className="text-foreground/90 leading-relaxed font-medium">{translatedText}</p>
                      </motion.div>
                    )}

                    {/* Vocabulary List */}
                    {selectedPassage.vocabulary_list && selectedPassage.vocabulary_list.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          Từ vựng trong bài
                          <Badge variant="outline" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" /> Click = tra từ tức thì
                          </Badge>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedPassage.vocabulary_list.map((vocab, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.02 }}
                              className="p-4 rounded-2xl bg-sakura-light/20 border border-sakura-light/20 cursor-pointer hover:bg-white dark:hover:bg-slate-900 hover:shadow-md transition-all group shadow-sm overflow-hidden"
                              onClick={() => lookupWord(vocab.word)}
                            >
                              <div className="flex items-baseline gap-2 mb-1">
                                <span 
                                  className="font-jp font-bold text-lg text-slate-800 dark:text-slate-200 group-hover:text-sakura transition-colors"
                                  dangerouslySetInnerHTML={{ __html: vocab.word }}
                                />
                                <span className="text-xs text-slate-400 font-jp italic">
                                  {vocab.reading}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{vocab.meaning}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

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
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Chọn một bài đọc để bắt đầu</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <AnalysisPanel
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        onToggle={() => setShowAnalysis(!showAnalysis)}
        isLoading={isAnalyzing}
        content={analysisContent}
        error={analysisError}
        structuredData={structuredAnalysis}
      />
    </div>
  );
};

// export default Reading;
