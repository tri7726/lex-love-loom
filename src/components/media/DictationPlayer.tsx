import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import YouTube, { YouTubeProps } from 'react-youtube';
import {
  ArrowLeft,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ChevronUp,
  Play,
  Monitor,
  MonitorOff,
  HelpCircle,
  Keyboard,
  Repeat,
  Gauge,
  BookOpen,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/navigation/Navigation';
import { VideoLearningTabs, VideoTab } from '@/components/video/VideoLearningTabs';
import { SubtitlePanel } from '@/components/video/SubtitlePanel';
import { AnalysisPanel, type StructuredAnalysis } from '@/components/video/AnalysisPanel';
import { VideoMode } from '@/components/video/VideoMode';
import { DictationMode } from '@/components/video/DictationMode';
import { SpeakingMode } from '@/components/video/SpeakingMode';
import { VideoQuizMode } from '@/components/video/VideoQuizMode';
import { SummaryMode } from '@/components/video/SummaryMode';
import { GrammarSensei } from '@/components/grammar/GrammarSensei';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWordHistory } from '@/hooks/useWordHistory';
import { useXP } from '@/hooks/useXP';
import { useConfetti } from '@/hooks/useConfetti';
import { useToast } from '@/hooks/use-toast';
import { useSentenceBookmark } from '@/hooks/useSentenceBookmark';
import { cn } from '@/lib/utils';
import { detectMatchingGrammarPoints, type GrammarPoint } from '@/data/grammar-db';

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

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  question_type?: string;
  difficulty?: string;
}

interface YouTubePlayerInstance {
  getCurrentTime?: () => number;
  seekTo: (time: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setPlaybackRate?: (rate: number) => void;
  getPlaybackRate?: () => number;
}

interface DictationPlayerProps {
  video: VideoSource;
  onBack: () => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

export const DictationPlayer: React.FC<DictationPlayerProps> = ({ video, onBack }) => {
  // Core state
  const [segments, setSegments] = useState<Segment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Tab & UI state
  const [activeTab, setActiveTab] = useState<VideoTab>('video');
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false);
  const [isPlayerCollapsed, setIsPlayerCollapsed] = useState(false);
  const [showSensei, setShowSensei] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  // YouTube player state  
  const [player, setPlayer] = useState<YouTubePlayerInstance | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Playback controls
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loopSegment, setLoopSegment] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  
  // Progress tracking
  const [completedSegments, setCompletedSegments] = useState<Set<number>>(new Set());
  const [speakingCompletedSegments, setSpeakingCompletedSegments] = useState<Set<number>>(new Set());
  const [segmentScores, setSegmentScores] = useState<Map<number, number>>(new Map());
  const [speakingScores, setSpeakingScores] = useState<Map<number, number>>(new Map());
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number } | undefined>();

  // Analysis state
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisContent, setAnalysisContent] = useState<string | null>(null);
  const [structuredAnalysis, setStructuredAnalysis] = useState<StructuredAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const lastAnalysisTime = useRef(0);
  
  // Display settings
  const [showFurigana, setShowFurigana] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [isVideoHidden, setIsVideoHidden] = useState(false);

  const timeUpdateRef = useRef<number | null>(null);
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();
  const { awardXP } = useXP();
  const { fire } = useConfetti();
  const { toast } = useToast();
  const { saveWord, isWordSaved } = useWordHistory();
  const { saveSentence, removeSentence, isSentenceSaved } = useSentenceBookmark();

  const currentSegment = segments[currentIndex];
  const matchedGrammarPoints = useMemo(() => {
    if (!currentSegment) return [];
    return detectMatchingGrammarPoints(currentSegment.japanese_text);
  }, [currentSegment]);
  const savedWords = useMemo(() => {
    if (!currentSegment) return new Set<string>();
    return new Set(currentSegment.vocabulary.filter(v => isWordSaved(v.word)).map(v => v.word));
  }, [currentSegment, isWordSaved]);
  const handleSaveWord = useCallback((vocab: { word: string; reading: string; meaning: string }) => {
    saveWord({
      word: vocab.word,
      reading: vocab.reading,
      meaning: vocab.meaning,
      example_sentence: currentSegment?.japanese_text,
    });
  }, [saveWord, currentSegment]);
  const progress = segments.length > 0 
    ? (completedSegments.size / segments.length) * 100 
    : 0;

  // Fetch segments & questions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: segmentsData, error: segmentsError } = await supabase
          .from('video_segments')
          .select('*')
          .eq('video_id', video.id)
          .order('segment_index');

        if (segmentsError) throw segmentsError;
        
        const transformedSegments = (segmentsData || []).map(seg => ({
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
        
        setSegments(transformedSegments);

        const { data: questionsData, error: questionsError } = await (supabase as any)
          .from('video_questions')
          .select('*')
          .eq('video_id', video.id);

        if (!questionsError && questionsData) {
          const transformedQuestions = (questionsData as any[]).map(q => ({
            id: q.id,
            question_text: q.question_text,
            options: Array.isArray(q.options) ? q.options as string[] : [],
            correct_answer: q.correct_answer,
            explanation: q.explanation || undefined,
            question_type: q.question_type || 'comprehension',
            difficulty: q.difficulty || 'medium',
          }));
          setQuestions(transformedQuestions);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [video.id]);

  // Track current time for subtitle sync
  useEffect(() => {
    if (playerReady && player) {
      timeUpdateRef.current = setInterval(() => {
        const time = player.getCurrentTime?.() || 0;
        setCurrentTime(time);
      }, 200) as unknown as number;
    }

    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
    };
  }, [playerReady, player]);

  // Apply playback speed when it changes (only when player is ready)
  useEffect(() => {
    if (playerReady && player && player.setPlaybackRate) {
      try {
        player.setPlaybackRate(playbackSpeed);
      } catch (_e) {
        // YouTube iframe may not be fully initialized for postMessage yet
      }
    }
  }, [playerReady, player, playbackSpeed]);

  // Loop segment logic
  useEffect(() => {
    if (!loopSegment || !player || !currentSegment || !isPlaying) return;

    const checkLoop = () => {
      const time = player.getCurrentTime?.() || 0;
      if (time >= currentSegment.end_time - 0.2) {
        player.seekTo(currentSegment.start_time, true);
        player.playVideo();
      }
    };

    const interval = setInterval(checkLoop, 200);
    return () => clearInterval(interval);
  }, [loopSegment, player, currentSegment, isPlaying]);

  // Auto-advance to next segment when playback finishes
  useEffect(() => {
    if (!autoAdvance || !player || !currentSegment || !isPlaying || loopSegment) return;

    const checkAutoAdvance = () => {
      const time = player.getCurrentTime?.() || 0;
      if (time >= currentSegment.end_time - 0.1 && currentIndex < segments.length - 1) {
        setCurrentIndex(prev => prev + 1);
        // Will auto-play next segment
        setTimeout(() => {
          const nextSeg = segments[currentIndex + 1];
          if (nextSeg && player) {
            player.seekTo(nextSeg.start_time, true);
            player.playVideo();
          }
        }, 300);
      }
    };

    const interval = setInterval(checkAutoAdvance, 200);
    return () => clearInterval(interval);
  }, [autoAdvance, player, currentSegment, isPlaying, loopSegment, currentIndex, segments]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Only capture Space in dictation/speaking mode for play
        if (e.code === 'Space' && (activeTab === 'dictation' || activeTab === 'pronunciation')) {
          // Let the mode handle it
          return;
        }
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          playCurrentSegment();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault();
            setCurrentIndex(prev => Math.max(0, prev - 1));
          }
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault();
            setCurrentIndex(prev => Math.min(segments.length - 1, prev + 1));
          }
          break;
        case 'KeyF':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setShowFurigana(prev => !prev);
          }
          break;
        case 'KeyT':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setShowTranslation(prev => !prev);
          }
          break;
        case 'KeyL':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setLoopSegment(prev => !prev);
          }
          break;
        case 'BracketLeft':
          e.preventDefault();
          setPlaybackSpeed(prev => {
            const idx = PLAYBACK_SPEEDS.indexOf(prev);
            return idx > 0 ? PLAYBACK_SPEEDS[idx - 1] : prev;
          });
          break;
        case 'BracketRight':
          e.preventDefault();
          setPlaybackSpeed(prev => {
            const idx = PLAYBACK_SPEEDS.indexOf(prev);
            return idx < PLAYBACK_SPEEDS.length - 1 ? PLAYBACK_SPEEDS[idx + 1] : prev;
          });
          break;
        case 'Escape':
          if (showAnalysis) {
            setShowAnalysis(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, segments.length, showAnalysis]);

  const handleAnalyzeSegment = useCallback(async (index: number) => {
    const segment = segments[index];
    if (!segment) return;

    // Client cooldown: 3s between analysis requests
    const now = Date.now();
    if (now - lastAnalysisTime.current < 3000) {
      toast({ title: "Vui lòng đợi một chút", description: "Phân tích đang được xử lý..." });
      return;
    }
    lastAnalysisTime.current = now;

    setShowAnalysis(true);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisContent(null);
    setStructuredAnalysis(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: {
          prompt: `Phân tích chi tiết câu tiếng Nhật này.
YÊU CẦU ĐẶC BIỆT VỀ NGỮ PHÁP:
- Với mỗi grammar_pattern, hãy thêm: jlpt_level (N5-N1), common_mistakes (lỗi thường gặp), register (spoken/written/both), similar_patterns (cấu trúc dễ nhầm lẫn)
- Trong grammar_summary, key_patterns là mảng object với: pattern, jlpt_level, meaning, frequency (high/medium/low), common_mistakes`,
          content: segment.japanese_text
        }
      });
      
      if (error) throw error;

      if (data.format === 'structured' && data.analysis) {
        setStructuredAnalysis(data.analysis);
      } else if (data.response) {
        setAnalysisContent(data.response);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error(err);
      setAnalysisError('Failed to analyze. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [segments]);

  // Play current segment
  const playCurrentSegment = useCallback(() => {
    const segment = segments[currentIndex];
    if (!player || !segment) return;
    
    player.seekTo(segment.start_time, true);
    player.playVideo();
    
    if (!loopSegment && !autoAdvance) {
      const duration = (segment.end_time - segment.start_time) * 1000 / playbackSpeed;
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = setTimeout(() => {
        const time = player.getCurrentTime?.() || 0;
        if (time >= segment.start_time - 0.5 && time <= segment.end_time + 1) {
          player.pauseVideo();
        }
      }, duration + 200);
    }
  }, [player, segments, currentIndex, loopSegment, autoAdvance, playbackSpeed]);

  const handleSegmentClick = useCallback((index: number) => {
    setCurrentIndex(index);
    if (player && segments[index]) {
      player.seekTo(segments[index].start_time, true);
      player.playVideo();
    }
  }, [player, segments]);

  const handleDictationComplete = useCallback((score: number) => {
    setSegmentScores(prev => new Map(prev).set(currentIndex, score));
    
    if (score >= 90) {
      setCompletedSegments(prev => new Set([...prev, currentIndex]));
      awardXP('quiz', 10, { segment_id: currentSegment?.id, type: 'dictation' });
      if (score === 100) fire('sakura');
    }

    if (user && currentSegment) {
      supabase.from('user_video_progress').upsert({
        user_id: user.id,
        segment_id: currentSegment.id,
        score,
        status: score >= 90 ? 'mastered' : 'learning',
        last_practiced_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,segment_id',
      }).then(({ error }) => {
        if (error) console.error('Error saving progress:', error);
      });
    }
  }, [currentIndex, user, currentSegment, awardXP, fire]);

  const handleSpeakingComplete = useCallback((score: number) => {
    setSpeakingScores(prev => new Map(prev).set(currentIndex, score));
    
    if (score >= 70) {
      setSpeakingCompletedSegments(prev => new Set([...prev, currentIndex]));
    }
  }, [currentIndex]);

  const handleQuizComplete = useCallback((correct: number, total: number) => {
    setQuizScore({ correct, total });
  }, []);

  const handleGenerateQuiz = async () => {
    if (!video || questions.length > 0) return;
    
    setLoading(true);
    const fullText = segments.map(s => s.japanese_text).join('\n');
    
    if (!fullText.trim()) {
      toast({ 
        title: 'Thiếu dữ liệu', 
        description: 'Video này chưa có nội dung phụ đề để tạo bài tập.', 
        variant: 'destructive' 
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-video-quiz', {
        body: { 
          video_id: video.id, 
          title: video.title,
          full_text: fullText.substring(0, 10000)
        }
      });

      if (error) throw new Error(error.message || 'Lỗi kết nối tới server');
      if (data.success === false) throw new Error(data.error || 'Server xử lý thất bại');
      if (data.error) throw new Error(`AI: ${data.error}`);

      if (data.success) {
        if (data.count === 0) {
          toast({ title: 'Không có câu hỏi', description: 'AI không thể tạo câu hỏi phù hợp.', variant: 'default' });
          return;
        }

        const { data: qData, error: fetchQError } = await (supabase as any)
          .from('video_questions')
          .select('*')
          .eq('video_id', video.id);
        
        if (fetchQError) throw fetchQError;

        if (qData) {
          setQuestions((qData as any[]).map(q => ({
            id: q.id,
            question_text: q.question_text,
            options: Array.isArray(q.options) ? q.options as string[] : [],
            correct_answer: q.correct_answer,
            explanation: q.explanation || undefined,
            question_type: q.question_type || 'comprehension',
            difficulty: q.difficulty || 'medium',
          })));
        }
        
        toast({ title: 'Thành công', description: `Đã tạo ${data.count} câu hỏi!` });
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      toast({ title: 'Lỗi tạo bài tập', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    setPlayer(event.target);
    setPlayerReady(true);
    // Apply initial speed (wrapped in case YouTube iframe isn't fully ready)
    try {
      event.target.setPlaybackRate?.(playbackSpeed);
    } catch (_e) {
      // YouTube iframe may not be fully initialized for postMessage yet
    }
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    setIsPlaying(event.data === 1);
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      origin: window.location.origin,
    },
  };
  
  const allVocabulary = segments.reduce((acc, seg) => {
    seg.vocabulary.forEach(v => {
      if (!acc.some(existing => existing.word === v.word)) {
        acc.push(v);
      }
    });
    return acc;
  }, [] as Array<{ word: string; reading: string; meaning: string }>);

  const savedVocabularyCount = useMemo(() => {
    return allVocabulary.filter(v => isWordSaved(v.word)).length;
  }, [allVocabulary, isWordSaved]);

  const allSavedWords = useMemo(() => {
    return new Set(allVocabulary.filter(v => isWordSaved(v.word)).map(v => v.word));
  }, [allVocabulary, isWordSaved]);

  const cycleSpeed = () => {
    setPlaybackSpeed(prev => {
      const idx = PLAYBACK_SPEEDS.indexOf(prev);
      return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'immersive':
        return (
          <SubtitlePanel
            segments={segments}
            currentIndex={currentIndex}
            currentTime={currentTime}
            completedSegments={completedSegments}
            onSegmentClick={handleSegmentClick}
            onExplain={handleAnalyzeSegment}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
            isEmbedded={true}
            grammarNotes={currentSegment?.grammar_notes || []}
            matchedGrammarPoints={matchedGrammarPoints}
            onSaveWord={handleSaveWord}
            savedWords={allSavedWords}
          />
        );

      case 'video':
        return (
          <VideoMode
            currentSegment={currentSegment}
            currentIndex={currentIndex}
            totalSegments={segments.length}
            isPlaying={isPlaying}
            onPlaySegment={playCurrentSegment}
            onPrev={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            onNext={() => setCurrentIndex(prev => Math.min(segments.length - 1, prev + 1))}
            onShowAnalysis={() => handleAnalyzeSegment(currentIndex)}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
            onToggleFurigana={() => setShowFurigana(!showFurigana)}
            onToggleTranslation={() => setShowTranslation(!showTranslation)}
            autoAdvance={autoAdvance}
            onToggleAutoAdvance={() => setAutoAdvance(!autoAdvance)}
            matchedGrammarPoints={matchedGrammarPoints}
            savedWords={savedWords}
            onSaveWord={handleSaveWord}
          />
        );

      case 'dictation':
        return (
          <DictationMode
            segments={segments}
            currentIndex={currentIndex}
            completedSegments={completedSegments}
            onIndexChange={setCurrentIndex}
            onPlaySegment={playCurrentSegment}
            onComplete={handleDictationComplete}
            playerReady={playerReady}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
            grammarNotes={currentSegment?.grammar_notes || []}
            matchedGrammarPoints={matchedGrammarPoints}
            savedWords={savedWords}
            onSaveWord={handleSaveWord}
          />
        );
      
      case 'pronunciation':
        return (
          <SpeakingMode
            segments={segments}
            currentIndex={currentIndex}
            completedSegments={speakingCompletedSegments}
            onIndexChange={setCurrentIndex}
            onPlaySegment={playCurrentSegment}
            onComplete={handleSpeakingComplete}
            playerReady={playerReady}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
          />
        );
      
      case 'quiz':
        return (
          <VideoQuizMode
            questions={questions as any}
            onComplete={handleQuizComplete}
            onGenerateQuiz={handleGenerateQuiz}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
            allVocabulary={allVocabulary}
          />
        );

      case 'vocabulary':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Từ vựng trong video</h2>
              <Badge variant="outline" className="text-xs gap-1">
                <BookOpen className="h-3 w-3" />
                {savedVocabularyCount}/{allVocabulary.length} đã lưu
              </Badge>
            </div>
            {allVocabulary.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground bg-muted/30 rounded-2xl border-2 border-dashed">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Video này chưa có từ vựng nào được trích xuất</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allVocabulary.map((v, i) => {
                  const isSaved = savedWords.has(v.word);
                  return (
                    <motion.div
                      key={v.word}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                        isSaved
                          ? "bg-sakura/[0.03] border-sakura/20"
                          : "bg-card border-border/40 hover:border-sakura/20"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-jp font-bold text-lg">{v.word}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.reading} — {v.meaning}
                        </p>
                      </div>
                      <Button
                        variant={isSaved ? "outline" : "default"}
                        size="sm"
                        className={cn(
                          "shrink-0 rounded-xl gap-1.5 text-xs h-9",
                          isSaved
                            ? "border-sakura/20 text-sakura"
                            : "bg-sakura hover:bg-sakura/90"
                        )}
                        onClick={() => !isSaved && handleSaveWord(v)}
                        disabled={isSaved}
                      >
                        {isSaved ? (
                          <><CheckCircle className="h-3.5 w-3.5" /> Đã lưu</>
                        ) : (
                          <><BookOpen className="h-3.5 w-3.5" /> Lưu</>
                        )}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'summary':
        return (
          <SummaryMode
            segments={segments}
            completedSegments={completedSegments}
            segmentScores={segmentScores}
            speakingCompletedSegments={speakingCompletedSegments}
            speakingScores={speakingScores}
            quizScore={quizScore}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
            totalVocabulary={allVocabulary.length}
            savedVocabularyCount={savedVocabularyCount}
          />
        );

      default:
        return null;
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
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden overscroll-none">
      {/* Global Tab Navigation */}
      <div className="bg-background border-b z-40">
        <VideoLearningTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          quizCount={questions.length}
          segmentsCount={segments.length}
        />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        
        {/* Left Column: Video + Controls */}
        <div className={cn(
          "w-full lg:w-[60%] flex flex-col border-r bg-muted/5",
          "lg:overflow-y-auto",
          activeTab === 'immersive' ? "lg:basis-[60%]" : "lg:basis-[45%] lg:max-w-[45%]",
          activeTab === 'video' ? "sticky top-0 z-30 lg:relative lg:top-auto" : ""
        )}>
          <div className="p-4">
            <div className="flex flex-col gap-4">
              {/* Header: Title & Back */}
              <div className="flex items-center gap-3 px-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onBack} 
                  className="h-9 w-9 rounded-full bg-muted/20 hover:bg-muted"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-base font-bold truncate leading-tight">{video.title}</h1>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
                    Đang phát nội dung
                  </p>
                </div>
              </div>

              {/* Video Player Section */}
              {!isVideoHidden && (
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-primary ring-1 ring-muted-foreground/10 group">
                  <YouTube
                    videoId={video.youtube_id}
                    opts={opts}
                    onReady={onPlayerReady}
                    onStateChange={onPlayerStateChange}
                    className="w-full h-full"
                    iframeClassName="w-full h-full"
                  />
                </div>
              )}

              {/* Playback Controls Card */}
              <Card className="p-4 rounded-2xl shadow-sm bg-background border border-muted-foreground/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Điều khiển</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] gap-1 text-muted-foreground"
                    onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
                  >
                    <Keyboard className="h-3 w-3" />
                    Phím tắt
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className={cn(
                      "h-10 text-xs gap-2 rounded-xl border-none transition-all",
                      isVideoHidden ? "bg-matcha/20 text-matcha" : "bg-muted/50 hover:bg-muted"
                    )}
                    onClick={() => setIsVideoHidden(!isVideoHidden)}
                  >
                    {isVideoHidden ? <Monitor className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
                    {isVideoHidden ? "Hiện video" : "Ẩn video"}
                  </Button>
                  
                  {/* Speed control */}
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className={cn(
                      "h-10 text-xs gap-2 rounded-xl border-none transition-all",
                      playbackSpeed !== 1 ? "bg-sakura/15 text-sakura" : "bg-muted/50 hover:bg-muted"
                    )}
                    onClick={cycleSpeed}
                  >
                    <Gauge className="h-4 w-4" />
                    {playbackSpeed}x
                  </Button>

                  {/* Loop toggle */}
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className={cn(
                      "h-10 text-xs gap-2 rounded-xl border-none transition-all",
                      loopSegment ? "bg-gold/15 text-gold" : "bg-muted/50 hover:bg-muted"
                    )}
                    onClick={() => setLoopSegment(!loopSegment)}
                  >
                    <Repeat className="h-4 w-4" />
                    {loopSegment ? "Lặp: ON" : "Lặp đoạn"}
                  </Button>

                  {/* Auto advance */}
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className={cn(
                      "h-10 text-xs gap-2 rounded-xl border-none transition-all",
                      autoAdvance ? "bg-matcha/15 text-matcha" : "bg-muted/50 hover:bg-muted"
                    )}
                    onClick={() => setAutoAdvance(!autoAdvance)}
                  >
                    <Play className="h-4 w-4" />
                    {autoAdvance ? "Tự chuyển: ON" : "Tự chuyển"}
                  </Button>

                  {/* Hỏi Sensei */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-10 text-xs gap-2 rounded-xl border-none transition-all bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20"
                    onClick={() => setShowSensei(true)}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Hỏi Sensei
                  </Button>
                </div>

                {/* Keyboard shortcuts help */}
                <AnimatePresence>
                  {showShortcutsHelp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t space-y-1.5 overflow-hidden"
                    >
                      {[
                        ['Space', 'Phát đoạn hiện tại'],
                        ['Shift + ← →', 'Chuyển đoạn'],
                        ['F', 'Bật/tắt Furigana'],
                        ['T', 'Bật/tắt dịch'],
                        ['L', 'Bật/tắt lặp đoạn'],
                        ['[ ]', 'Giảm/tăng tốc độ'],
                        ['Esc', 'Đóng panel'],
                      ].map(([key, desc]) => (
                        <div key={key} className="flex items-center justify-between text-[11px]">
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{key}</kbd>
                          <span className="text-muted-foreground">{desc}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* Progress Card */}
              <Card className="p-5 rounded-2xl shadow-sm bg-matcha/[0.03] border border-matcha/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-matcha uppercase tracking-widest">Tiến độ bài học</span>
                    <p className="text-lg font-black text-foreground">
                      {completedSegments.size} <span className="text-sm font-normal text-muted-foreground">/ {segments.length} câu</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full border-4 border-matcha/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-matcha">
                        {segments.length > 0 ? Math.round((completedSegments.size / segments.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
                <Progress 
                  value={segments.length > 0 ? (completedSegments.size / segments.length) * 100 : 0} 
                  className="h-2 rounded-full bg-matcha/10"
                />
                
                {/* Speaking progress indicator */}
                {speakingCompletedSegments.size > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>🎤 Phát âm: {speakingCompletedSegments.size}/{segments.length}</span>
                    <Progress 
                      value={segments.length > 0 ? (speakingCompletedSegments.size / segments.length) * 100 : 0} 
                      className="h-1 flex-1 bg-sakura/10"
                      indicatorClassName="bg-sakura"
                    />
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        {/* Right Column: Learning Content */}
        <div className="flex-1 flex flex-col bg-background lg:overflow-hidden">
          <div className="flex-1 lg:overflow-y-auto overscroll-contain">
            <div className="max-w-4xl mx-auto p-4 lg:p-6 pb-20 lg:pb-32">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <div className="h-full">
                    {renderTabContent()}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <AnalysisPanel
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        onToggle={() => setShowAnalysis(!showAnalysis)}
        isLoading={isAnalyzing}
        content={analysisContent}
        error={analysisError}
        structuredData={structuredAnalysis}
        onOpen={() => player?.pauseVideo()}
        segmentId={currentSegment?.id}
        japaneseText={currentSegment?.japanese_text}
        vietnameseText={currentSegment?.vietnamese_text || undefined}
        videoId={video.id}
        isBookmarked={isSentenceSaved(currentSegment?.id)}
        onBookmark={() => currentSegment && saveSentence({
          japanese_text: currentSegment.japanese_text,
          vietnamese_text: currentSegment.vietnamese_text,
          video_id: video.id,
          segment_id: currentSegment.id,
        })}
        onRemoveBookmark={() => currentSegment && removeSentence(currentSegment.id)}
        onRetry={() => handleAnalyzeSegment(currentIndex)}
      />

      <GrammarSensei
        videoContext={currentSegment ? {
          title: video.title,
          segmentText: currentSegment.japanese_text,
          segmentTranslation: currentSegment.vietnamese_text || undefined,
        } : undefined}
        initialOpen={showSensei}
        onClose={() => setShowSensei(false)}
      />
    </div>
  );
};
