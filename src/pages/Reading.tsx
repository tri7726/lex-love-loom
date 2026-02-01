import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Volume2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import Navigation from '@/components/Navigation';
import { CreatePassageDialog } from '@/components/CreatePassageDialog';
import { WordLookupPanel } from '@/components/WordLookupPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VocabItem {
  word: string;
  reading: string;
  meaning: string;
}

interface ReadingPassage {
  id: string;
  title: string;
  content: string;
  content_with_furigana: string | null;
  level: string;
  category: string | null;
  vocabulary_list: VocabItem[] | null;
}

interface WordData {
  word: string;
  reading: string;
  meaning: string;
  word_type?: string;
  examples?: Array<{ japanese: string; vietnamese: string }>;
  notes?: string;
}

type DisplayMode = 'kanji' | 'furigana' | 'kana';

const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'];

const Reading = () => {
  const { user } = useAuth();
  const [passages, setPassages] = useState<ReadingPassage[]>([]);
  const [selectedPassage, setSelectedPassage] = useState<ReadingPassage | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('furigana');
  const [loading, setLoading] = useState(true);
  
  // Word lookup state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Fetch passages
  useEffect(() => {
    fetchPassages();
  }, []);

  const fetchPassages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reading_passages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Sort by level
      const sorted = (data || []).sort((a, b) => {
        return LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
      });

      // Parse vocabulary_list from JSONB
      const parsed = sorted.map(p => ({
        ...p,
        vocabulary_list: Array.isArray(p.vocabulary_list) 
          ? (p.vocabulary_list as unknown as VocabItem[])
          : null
      }));

      setPassages(parsed);
      if (parsed.length > 0 && !selectedPassage) {
        setSelectedPassage(parsed[0]);
      }
    } catch (error: any) {
      console.error('Error fetching passages:', error);
      toast.error('Không thể tải bài đọc');
    } finally {
      setLoading(false);
    }
  };

  // Convert furigana HTML to kana only
  const extractKanaOnly = (html: string): string => {
    // Replace ruby tags with just the rt content
    return html
      .replace(/<ruby>([^<]+)<rt>([^<]+)<\/rt><\/ruby>/g, '$2')
      .replace(/<[^>]+>/g, ''); // Remove any remaining HTML tags
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

  // Word lookup
  const lookupWord = async (word: string) => {
    if (!word.trim()) return;
    
    setSelectedWord(word);
    setLookupLoading(true);
    setWordData(null);

    try {
      const { data, error } = await supabase.functions.invoke('lookup-word', {
        body: { word, context: selectedPassage?.content }
      });

      if (error) throw error;
      setWordData(data);
    } catch (error: any) {
      console.error('Error looking up word:', error);
      toast.error('Không thể tra từ');
    } finally {
      setLookupLoading(false);
    }
  };

  // Save vocabulary
  const saveVocabulary = async () => {
    if (!user || !wordData) {
      toast.error('Vui lòng đăng nhập để lưu từ vựng');
      return;
    }

    try {
      const { error } = await supabase
        .from('vocabulary')
        .insert({
          user_id: user.id,
          kanji: wordData.word,
          reading: wordData.reading,
          meaning: wordData.meaning,
        });

      if (error) throw error;
      toast.success('Đã lưu từ vựng!');
    } catch (error: any) {
      console.error('Error saving vocabulary:', error);
      toast.error('Không thể lưu từ vựng');
    }
  };

  // Handle word click
  const handleWordClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const word = target.textContent?.trim();
    if (word && word.length > 0) {
      lookupWord(word);
    }
  };

  // Render clickable text
  const renderClickableText = (text: string, isHtml: boolean) => {
    if (isHtml && displayMode === 'furigana') {
      return (
        <div 
          className="font-jp text-xl leading-loose cursor-pointer [&_ruby]:hover:bg-sakura/20 [&_ruby]:rounded [&_ruby]:px-1 [&_ruby]:transition-colors"
          dangerouslySetInnerHTML={{ __html: text }}
          onClick={handleWordClick}
        />
      );
    }

    // Split into characters/words for kanji and kana modes
    const chars = text.split('');
    return (
      <div className="font-jp text-xl leading-loose">
        {chars.map((char, idx) => (
          <span
            key={idx}
            className={`cursor-pointer hover:bg-sakura/20 rounded transition-colors ${
              selectedWord === char ? 'bg-sakura/30' : ''
            }`}
            onClick={() => lookupWord(char)}
          >
            {char}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-sakura" />
            <div>
              <h1 className="text-2xl font-display font-bold">Luyện Đọc</h1>
              <p className="text-muted-foreground text-sm">Đọc hiểu tiếng Nhật với hỗ trợ AI</p>
            </div>
          </div>
          <CreatePassageDialog onCreated={fetchPassages} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Passage List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="font-semibold text-lg">Danh sách bài đọc</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {passages.map((passage) => (
                  <motion.div
                    key={passage.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedPassage?.id === passage.id
                          ? 'border-sakura ring-2 ring-sakura/20'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedPassage(passage);
                        setWordData(null);
                        setSelectedWord(null);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-jp font-medium">{passage.title}</p>
                            {passage.category && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {passage.category}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">{passage.level}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-2 space-y-4">
            {selectedPassage ? (
              <motion.div
                key={selectedPassage.id}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speak(selectedPassage.content)}
                    className="gap-2"
                  >
                    <Volume2 className="h-4 w-4" />
                    Nghe
                  </Button>
                </div>

                {/* Reading Content */}
                <Card className="shadow-elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-jp text-xl">
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
                  <CardContent>
                    <div className="p-6 rounded-lg bg-muted/30">
                      {renderClickableText(
                        displayContent,
                        displayMode === 'furigana' && !!selectedPassage.content_with_furigana
                      )}
                    </div>

                    {/* Vocabulary List */}
                    {selectedPassage.vocabulary_list && selectedPassage.vocabulary_list.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold mb-3">Từ vựng trong bài</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedPassage.vocabulary_list.map((vocab, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-sakura/10 transition-colors"
                              onClick={() => lookupWord(vocab.word)}
                            >
                              <div className="flex items-baseline gap-2">
                                <span className="font-jp font-medium">{vocab.word}</span>
                                <span className="text-sm text-muted-foreground font-jp">
                                  {vocab.reading}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{vocab.meaning}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Word Lookup Panel */}
                <WordLookupPanel
                  wordData={wordData}
                  loading={lookupLoading}
                  onClose={() => {
                    setWordData(null);
                    setSelectedWord(null);
                  }}
                  onSave={saveVocabulary}
                  onSpeak={speak}
                />
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Chọn một bài đọc để bắt đầu</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reading;
