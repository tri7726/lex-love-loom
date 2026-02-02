import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  BookOpen,
  Volume2,
  VolumeX,
  CheckCircle,
  XCircle,
  Lightbulb,
  Bookmark,
  Loader2,
  Languages,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Navigation from '@/components/Navigation';
import KanaKeyboard from '@/components/KanaKeyboard';
import KanjiSuggestions from '@/components/KanjiSuggestions';
import KanjiStrokeOrder from '@/components/KanjiStrokeOrder';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTTS } from '@/hooks/useTTS';
import { useKanaInput, KanaMode } from '@/hooks/useKanaInput';
import { useKanjiLookup } from '@/hooks/useKanjiLookup';
import { useWordHistory } from '@/hooks/useWordHistory';
import { compareStrings, calculateScore, DiffResult } from '@/lib/stringComparison';

interface VideoSource {
  id: string;
  youtube_id: string;
  title: string;
}

interface Segment {
  id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  japanese_text: string;
  vietnamese_text: string | null;
  grammar_notes: Array<{ point: string; explanation: string }>;
  vocabulary: Array<{ word: string; reading: string; meaning: string }>;
}

interface DictationPlayerProps {
  video: VideoSource;
  onBack: () => void;
}

interface KanjiSuggestion {
  kanji: string;
  reading: string;
  meaning: string;
  source?: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const DictationPlayer: React.FC<DictationPlayerProps> = ({ video, onBack }) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [hasChecked, setHasChecked] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult[]>([]);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completedSegments, setCompletedSegments] = useState<Set<number>>(new Set());
  const [showStrokeOrder, setShowStrokeOrder] = useState<KanjiSuggestion | null>(null);
  
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { speak, stop, isSpeaking, isSupported, rate, setRate } = useTTS({ lang: 'ja-JP' });
  const { mode: kanaMode, cycleMode, processInput, resetBuffer, getKanjiSuggestions } = useKanaInput();
  const { suggestions: apiSuggestions, isLoading: isLookupLoading, lookupKanji, clearSuggestions } = useKanjiLookup();
  const { saveWord } = useWordHistory();
  
  // Combine local and API suggestions
  const localSuggestions = getKanjiSuggestions(userInput);
  const allSuggestions: KanjiSuggestion[] = [
    ...localSuggestions.map(s => ({ ...s, source: 'local' })),
    ...apiSuggestions.filter(api => !localSuggestions.some(local => local.kanji === api.kanji)),
  ];

  // Lookup from API when local suggestions are empty
  useEffect(() => {
    if (userInput.length >= 2 && localSuggestions.length === 0 && !hasChecked) {
      lookupKanji(userInput);
    } else if (userInput.length < 2) {
      clearSuggestions();
    }
  }, [userInput, localSuggestions.length, hasChecked]);

  const handleKanjiSelect = (kanji: string) => {
    setUserInput(kanji);
    inputRef.current?.focus();
  };

  const handleViewStrokeOrder = (suggestion: KanjiSuggestion) => {
    setShowStrokeOrder(suggestion);
  };

  const handleSaveFromStrokeOrder = (word: { word: string; reading: string; meaning: string }) => {
    saveWord(word);
    setShowStrokeOrder(null);
  };

  const currentSegment = segments[currentIndex];
  const progress = segments.length > 0 
    ? (completedSegments.size / segments.length) * 100 
    : 0;

  // Fetch segments
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const { data, error } = await supabase
          .from('video_segments')
          .select('*')
          .eq('video_id', video.id)
          .order('segment_index');

        if (error) throw error;
        
        // Transform the data to match our interface
        const transformedData = (data || []).map(seg => ({
          id: seg.id,
          segment_index: seg.segment_index,
          start_time: seg.start_time,
          end_time: seg.end_time,
          japanese_text: seg.japanese_text,
          vietnamese_text: seg.vietnamese_text,
          grammar_notes: (Array.isArray(seg.grammar_notes) 
            ? seg.grammar_notes 
            : []) as Array<{ point: string; explanation: string }>,
          vocabulary: (Array.isArray(seg.vocabulary) 
            ? seg.vocabulary 
            : []) as Array<{ word: string; reading: string; meaning: string }>,
        }));
        
        setSegments(transformedData);
      } catch (error) {
        console.error('Error fetching segments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSegments();
  }, [video.id]);

  // Initialize YouTube player
  useEffect(() => {
    let ytPlayer: any = null;
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted || !playerContainerRef.current || !window.YT?.Player) return;

      // Make sure the container element exists
      const container = document.getElementById('youtube-player');
      if (!container) return;

      try {
        ytPlayer = new window.YT.Player('youtube-player', {
          videoId: video.youtube_id,
          playerVars: {
            controls: 1,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (isMounted) {
                setPlayer(ytPlayer);
                setPlayerReady(true);
                console.log('YouTube player ready');
              }
            },
            onStateChange: (event: any) => {
              if (isMounted) {
                setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
            },
          },
        });
      } catch (err) {
        console.error('Error initializing YouTube player:', err);
      }
    };

    const loadYouTubeAPI = () => {
      if (window.YT?.Player) {
        initPlayer();
      } else if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
        window.onYouTubeIframeAPIReady = initPlayer;
      } else {
        // Script is loading, wait for it
        const checkReady = setInterval(() => {
          if (window.YT?.Player) {
            clearInterval(checkReady);
            initPlayer();
          }
        }, 100);
        
        // Clear interval after 10 seconds to prevent memory leak
        setTimeout(() => clearInterval(checkReady), 10000);
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(loadYouTubeAPI, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (ytPlayer?.destroy) {
        try {
          ytPlayer.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
      }
    };
  }, [video.youtube_id]);

  const playCurrentSegment = () => {
    if (!player || !currentSegment) return;
    
    player.seekTo(currentSegment.start_time, true);
    player.playVideo();
    
    // Auto-pause at end
    const duration = (currentSegment.end_time - currentSegment.start_time) * 1000;
    setTimeout(() => {
      const currentTime = player.getCurrentTime?.() || 0;
      if (currentTime >= currentSegment.start_time - 0.5 && 
          currentTime <= currentSegment.end_time + 1) {
        player.pauseVideo();
        inputRef.current?.focus();
      }
    }, duration + 200);
  };

  const handleCheck = () => {
    if (!currentSegment || !userInput.trim()) return;

    const diff = compareStrings(userInput, currentSegment.japanese_text);
    const segmentScore = calculateScore(userInput, currentSegment.japanese_text);
    
    setDiffResult(diff);
    setScore(segmentScore);
    setHasChecked(true);

    if (segmentScore >= 90) {
      setCompletedSegments(prev => new Set([...prev, currentIndex]));
      toast({
        title: '素晴らしい！',
        description: `Điểm: ${segmentScore}% - Tuyệt vời!`,
      });
    }

    // Save progress to database
    saveProgress(segmentScore);
  };

  const saveProgress = async (segmentScore: number) => {
    if (!user || !currentSegment) return;

    try {
      await supabase.from('user_video_progress').upsert({
        user_id: user.id,
        segment_id: currentSegment.id,
        user_input: userInput,
        score: segmentScore,
        status: segmentScore >= 90 ? 'mastered' : 'learning',
        last_practiced_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,segment_id',
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < segments.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetState();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      resetState();
    }
  };

  const resetState = () => {
    setUserInput('');
    setHasChecked(false);
    setDiffResult([]);
    setScore(0);
    setShowHint(false);
    setShowGrammar(false);
    setShowAnswer(false);
    resetBuffer();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const processedValue = processInput(newValue, userInput);
    setUserInput(processedValue);
  };

  const getKanaModeLabel = (mode: KanaMode): string => {
    switch (mode) {
      case 'hiragana': return 'あ';
      case 'katakana': return 'ア';
      default: return 'A';
    }
  };

  const getKanaModeTooltip = (mode: KanaMode): string => {
    switch (mode) {
      case 'hiragana': return 'Chế độ Hiragana - gõ romaji để chuyển thành ひらがな';
      case 'katakana': return 'Chế độ Katakana - gõ romaji để chuyển thành カタカナ';
      default: return 'Chế độ bình thường - gõ trực tiếp';
    }
  };

  const handleKanaKeyPress = (char: string) => {
    setUserInput(prev => prev + char);
    inputRef.current?.focus();
  };

  const handleRetry = () => {
    resetState();
    inputRef.current?.focus();
  };


  const saveVocabulary = async (word: { word: string; reading: string; meaning: string }) => {
    if (!user || !currentSegment) return;

    try {
      await supabase.from('saved_vocabulary').upsert({
        user_id: user.id,
        word: word.word,
        reading: word.reading,
        meaning: word.meaning,
        example_sentence: currentSegment.japanese_text,
        source_segment_id: currentSegment.id,
      }, {
        onConflict: 'user_id,word',
      });
      
      toast({
        title: 'Đã lưu!',
        description: `"${word.word}" đã được thêm vào sổ từ vựng`,
      });
    } catch (error) {
      console.error('Error saving vocabulary:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold line-clamp-1">{video.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Câu {currentIndex + 1} / {segments.length}</span>
              <Progress value={progress} className="w-24 h-2" />
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <Card className="shadow-card overflow-hidden">
          <div className="aspect-video bg-black" ref={playerContainerRef}>
            <div id="youtube-player" className="w-full h-full" />
          </div>
        </Card>

        {currentSegment && (
          <>
            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <Button
                size="lg"
                className="gap-2 px-6"
                onClick={playCurrentSegment}
                disabled={!playerReady}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                Phát đoạn này
              </Button>

              {isSupported && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => isSpeaking ? stop() : speak(currentSegment.japanese_text)}
                >
                  {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={currentIndex === segments.length - 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Input Area */}
            <Card className="shadow-card">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Nhập những gì bạn nghe được:
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        ref={inputRef}
                        value={userInput}
                        onChange={handleInputChange}
                        placeholder={kanaMode === 'off' ? 'Gõ tiếng Nhật tại đây...' : 'Gõ romaji (ví dụ: konnichiwa → こんにちは)...'}
                        className="flex-1 font-jp text-lg pr-12"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !hasChecked) {
                            handleCheck();
                          }
                        }}
                        disabled={hasChecked}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 font-jp text-base"
                            onClick={cycleMode}
                            disabled={hasChecked}
                          >
                            {getKanaModeLabel(kanaMode)}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getKanaModeTooltip(kanaMode)}</p>
                          <p className="text-xs text-muted-foreground">Nhấn để đổi chế độ</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {!hasChecked ? (
                      <Button onClick={handleCheck} disabled={!userInput.trim()}>
                        Kiểm tra
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={handleRetry}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Thử lại
                      </Button>
                    )}
                  </div>
                  {kanaMode !== 'off' && (
                    <p className="text-xs text-muted-foreground">
                      💡 Gõ romaji để chuyển thành {kanaMode === 'hiragana' ? 'Hiragana' : 'Katakana'} (ví dụ: ka → {kanaMode === 'hiragana' ? 'か' : 'カ'})
                    </p>
                  )}
                  
                  {/* Kanji Suggestions */}
                  {!hasChecked && (allSuggestions.length > 0 || isLookupLoading) && (
                    <KanjiSuggestions 
                      suggestions={allSuggestions} 
                      onSelect={handleKanjiSelect}
                      onViewStrokeOrder={handleViewStrokeOrder}
                      isLoading={isLookupLoading}
                    />
                  )}
                  
                  {/* Kana Keyboard */}
                  {!hasChecked && (
                    <KanaKeyboard onKeyPress={handleKanaKeyPress} />
                  )}
                </div>

                {/* Result Display */}
                <AnimatePresence>
                  {hasChecked && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-3"
                    >
                      {/* Score */}
                      <div className="flex items-center gap-3">
                        {score >= 90 ? (
                          <CheckCircle className="h-6 w-6 text-matcha" />
                        ) : (
                          <XCircle className="h-6 w-6 text-destructive" />
                        )}
                        <span className="text-lg font-semibold">
                          Điểm: {score}%
                        </span>
                        {score >= 90 && (
                          <Badge className="bg-matcha text-white">Hoàn thành!</Badge>
                        )}
                      </div>

                      {/* Diff Display */}
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Kết quả của bạn:</p>
                        <p className="font-jp text-lg">
                          {diffResult.map((item, i) => (
                            <span
                              key={i}
                              className={item.correct 
                                ? 'text-matcha' 
                                : 'text-destructive bg-destructive/10 px-0.5 rounded'
                              }
                            >
                              {item.char}
                            </span>
                          ))}
                        </p>
                      </div>

                      {/* Correct Answer */}
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Đáp án đúng:</p>
                        <p className="font-jp text-lg">{currentSegment.japanese_text}</p>
                        {currentSegment.vietnamese_text && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {currentSegment.vietnamese_text}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hint Buttons */}
                {!hasChecked && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHint(!showHint)}
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      {showHint ? 'Ẩn gợi ý' : 'Gợi ý dịch'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAnswer(!showAnswer)}
                    >
                      {showAnswer ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {showAnswer ? 'Ẩn đáp án' : 'Xem đáp án'}
                    </Button>
                  </div>
                )}

                {/* Hints */}
                <AnimatePresence>
                  {showHint && currentSegment.vietnamese_text && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-gold/10 rounded-lg"
                    >
                      <p className="text-sm font-medium text-gold-foreground">
                        💡 Gợi ý: {currentSegment.vietnamese_text}
                      </p>
                    </motion.div>
                  )}

                  {showAnswer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-muted rounded-lg"
                    >
                      <p className="font-jp text-lg">{currentSegment.japanese_text}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Grammar & Vocabulary */}
            {(currentSegment.grammar_notes.length > 0 || currentSegment.vocabulary.length > 0) && (
              <Card className="shadow-card">
                <CardContent className="p-4 space-y-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => setShowGrammar(!showGrammar)}
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Từ vựng & Ngữ pháp
                    </span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${showGrammar ? 'rotate-90' : ''}`} />
                  </Button>

                  <AnimatePresence>
                    {showGrammar && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        {/* Vocabulary */}
                        {currentSegment.vocabulary.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Từ vựng:</h4>
                            <div className="flex flex-wrap gap-2">
                              {currentSegment.vocabulary.map((vocab, i) => (
                                <Tooltip key={i}>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="secondary"
                                      className="cursor-pointer hover:bg-primary/20"
                                      onClick={() => saveVocabulary(vocab)}
                                    >
                                      <span className="font-jp">{vocab.word}</span>
                                      {vocab.reading && (
                                        <span className="text-xs ml-1 opacity-70">
                                          ({vocab.reading})
                                        </span>
                                      )}
                                      <Bookmark className="h-3 w-3 ml-1" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{vocab.meaning}</p>
                                    <p className="text-xs text-muted-foreground">Click để lưu</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Grammar Notes */}
                        {currentSegment.grammar_notes.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Ngữ pháp:</h4>
                            <div className="space-y-2">
                              {currentSegment.grammar_notes.map((note, i) => (
                                <div
                                  key={i}
                                  className="p-2 bg-muted rounded text-sm"
                                >
                                  <span className="font-jp font-medium">{note.point}</span>
                                  <span className="mx-2">-</span>
                                  <span className="text-muted-foreground">{note.explanation}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Câu trước
              </Button>
              <Button
                onClick={handleNext}
                disabled={currentIndex === segments.length - 1}
              >
                Câu tiếp
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {segments.length === 0 && !loading && (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Video này chưa có dữ liệu phụ đề được xử lý.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Stroke Order Modal */}
      <AnimatePresence>
        {showStrokeOrder && (
          <KanjiStrokeOrder
            kanji={showStrokeOrder.kanji}
            reading={showStrokeOrder.reading}
            meaning={showStrokeOrder.meaning}
            onClose={() => setShowStrokeOrder(null)}
            onSaveToVocabulary={handleSaveFromStrokeOrder}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DictationPlayer;
