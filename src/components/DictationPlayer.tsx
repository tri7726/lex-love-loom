import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Navigation } from '@/components/Navigation';
import { VideoLearningTabs, VideoTab } from '@/components/video/VideoLearningTabs';
import { SubtitlePanel } from '@/components/video/SubtitlePanel';
import { AnalysisPanel, type StructuredAnalysis } from '@/components/video/AnalysisPanel';
import { VideoMode } from '@/components/video/VideoMode';
import { DictationMode } from '@/components/video/DictationMode';
import { SpeakingMode } from '@/components/video/SpeakingMode';
import { VideoQuizMode } from '@/components/video/VideoQuizMode';
import { SummaryMode } from '@/components/video/SummaryMode';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useXP } from '@/hooks/useXP';
import { useConfetti } from '@/components/ConfettiProvider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  correct_answer: number;
  explanation?: string;
  question_type?: string;
  difficulty?: string;
}

interface YouTubePlayerInstance {
  getCurrentTime?: () => number;
  seekTo: (time: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
}

interface DictationPlayerProps {
  video: VideoSource;
  onBack: () => void;
}

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
  
  // YouTube player state  
  const [player, setPlayer] = useState<YouTubePlayerInstance | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
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
  
  // Display settings
  const [showFurigana, setShowFurigana] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [isVideoHidden, setIsVideoHidden] = useState(false);

  const timeUpdateRef = useRef<number | null>(null);
  const { user } = useAuth();
  const { awardXP } = useXP();
  const { fire } = useConfetti();
  const { toast } = useToast();

  const currentSegment = segments[currentIndex];
  const progress = segments.length > 0 
    ? (completedSegments.size / segments.length) * 100 
    : 0;

  // Fetch segments & questions
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch segments
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

        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('video_questions')
          .select('*')
          .eq('video_id', video.id);

        if (!questionsError && questionsData) {
          const transformedQuestions = questionsData.map(q => ({
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
      }, 200) as unknown as number; // Reduced frequency from 100ms to 200ms for performance
    }

    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
    };
  }, [playerReady, player]);

  const handleAnalyzeSegment = useCallback(async (index: number) => {
    const segment = segments[index];
    if (!segment) return;
    
    setShowAnalysis(true);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisContent(null);
    setStructuredAnalysis(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: { 
          prompt: "", 
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

  // Play current segment - use segments[currentIndex] directly for fresh reference
  const playCurrentSegment = useCallback(() => {
    const segment = segments[currentIndex];
    if (!player || !segment) return;
    
    player.seekTo(segment.start_time, true);
    player.playVideo();
    
    const duration = (segment.end_time - segment.start_time) * 1000;
    setTimeout(() => {
      const time = player.getCurrentTime?.() || 0;
      if (time >= segment.start_time - 0.5 && time <= segment.end_time + 1) {
        player.pauseVideo();
      }
    }, duration + 200);
  }, [player, segments, currentIndex]);

  // Handle segment selection from subtitle panel
  const handleSegmentClick = useCallback((index: number) => {
    setCurrentIndex(index);
    if (player && segments[index]) {
      player.seekTo(segments[index].start_time, true);
      player.playVideo();
    }
  }, [player, segments]);

  // Handle dictation completion
  const handleDictationComplete = useCallback((score: number) => {
    setSegmentScores(prev => new Map(prev).set(currentIndex, score));
    
    if (score >= 90) {
      setCompletedSegments(prev => new Set([...prev, currentIndex]));
      awardXP('quiz', 10, { segment_id: currentSegment?.id, type: 'dictation' });
      if (score === 100) fire('sakura');
    }

    // Save progress to database
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
  }, [currentIndex, user, currentSegment]);

  // Handle speaking completion
  const handleSpeakingComplete = useCallback((score: number) => {
    setSpeakingScores(prev => new Map(prev).set(currentIndex, score));
    
    if (score >= 70) {
      setSpeakingCompletedSegments(prev => new Set([...prev, currentIndex]));
    }
  }, [currentIndex]);

  // Handle quiz completion
  const handleQuizComplete = useCallback((correct: number, total: number) => {
    setQuizScore({ correct, total });
  }, []);

  // Handle manual quiz generation
  const handleGenerateQuiz = async () => {
    if (!video || questions.length > 0) return;
    
    setLoading(true);
    const fullText = segments.map(s => s.japanese_text).join('\n');
    
    if (!fullText.trim()) {
      toast({ 
        title: 'Thiếu dữ liệu', 
        description: 'Video này chưa có nội dung phụ đề để tạo bài tập. Hãy kiểm tra lại phần xử lý video.', 
        variant: 'destructive' 
      });
      setLoading(false);
      return;
    }

    try {
      console.log('Invoking generate-video-quiz for video:', video.id);
      const { data, error } = await supabase.functions.invoke('generate-video-quiz', {
        body: { 
          video_id: video.id, 
          title: video.title,
          full_text: fullText.substring(0, 10000)
        }
      });

      if (error) {
        console.error('Supabase function invocation error:', error);
        throw new Error(error.message || 'Lỗi kết nối tới server');
      }

      console.log('Function response data:', data);

      if (data.success === false) {
        console.error('AI Processing error details:', data.error);
        throw new Error(data.error || 'Server xử lý thất bại');
      }

      if (data.error) {
        console.error('Server returned error:', data.error);
        throw new Error(`AI: ${data.error}`);
      }

      if (data.success) {
        if (data.count === 0) {
          toast({ 
            title: 'Không có câu hỏi', 
            description: 'AI đã phân tích nhưng không thể tạo được câu hỏi phù hợp. Hãy thử lại với video khác.',
            variant: 'default'
          });
          return;
        }

        // Fetch questions again
        const { data: qData, error: fetchQError } = await supabase
          .from('video_questions')
          .select('*')
          .eq('video_id', video.id);
        
        if (fetchQError) throw fetchQError;

        if (qData) {
          setQuestions(qData.map(q => ({
            id: q.id,
            question_text: q.question_text,
            options: Array.isArray(q.options) ? q.options as string[] : [],
            correct_answer: q.correct_answer,
            explanation: q.explanation || undefined,
            question_type: q.question_type || 'comprehension',
            difficulty: q.difficulty || 'medium',
          })));
        }
        
        toast({ title: 'Thành công', description: `Đã tạo ${data.count} câu hỏi bài tập!` });
      } else {
        throw new Error('Server không phản hồi thành công');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      let errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      
      // If it's a Supabase error object, try to extract more info
      const supabaseError = error as { status?: number; message?: string };
      if (supabaseError.status) {
        errorMessage = `(Lỗi ${supabaseError.status}) ${errorMessage}`;
      }
      
      toast({ 
        title: 'Lỗi tạo bài tập', 
        description: `Chi tiết: ${errorMessage}. Vui lòng thử lại sau.`, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  // YouTube Event Handlers
  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    setPlayer(event.target);
    setPlayerReady(true);
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1 = PLAYING
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
  
  // Calculate global vocabulary for modes that need it (like Quiz)
  const allVocabulary = segments.reduce((acc, seg) => {
    seg.vocabulary.forEach(v => {
      if (!acc.some(existing => existing.word === v.word)) {
        acc.push(v);
      }
    });
    return acc;
  }, [] as Array<{ word: string; reading: string; meaning: string }>);

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
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
            questions={questions}
            onComplete={handleQuizComplete}
            onGenerateQuiz={handleGenerateQuiz}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
            allVocabulary={allVocabulary}
          />
        );
      
      case 'transcript':
        return (
          <div className="h-[calc(100vh-180px)] lg:h-[calc(100vh-120px)] border rounded-2xl overflow-hidden bg-background shadow-sm">
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
            />
          </div>
        );

      case 'summary':
        return (
          <SummaryMode
            segments={segments}
            completedSegments={completedSegments}
            segmentScores={segmentScores}
            quizScore={quizScore}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
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
      <Navigation />

      {/* Global Tab Navigation (Desktop Header Style) */}
      <div className="bg-background border-b z-40">
        <VideoLearningTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          quizCount={questions.length}
          segmentsCount={segments.length}
        />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        
        {/* Left Column: Video + Statistics */}
        <div className={cn(
          "w-full lg:w-[45%] xl:w-[40%] flex flex-col border-r bg-muted/5",
          "lg:overflow-y-auto",
          activeTab === 'transcript' ? "sticky top-0 z-30 lg:relative lg:top-auto" : ""
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
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black ring-1 ring-muted-foreground/10 group">
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

              {/* Video Control & Settings Card */}
              <Card className="p-4 rounded-2xl shadow-sm bg-background border border-muted-foreground/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cài đặt Video</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-matcha animate-pulse" />
                    <span className="text-[10px] font-bold text-matcha uppercase">Live Mode</span>
                  </div>
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
                  
                  <Button variant="secondary" size="sm" className="h-10 text-xs gap-2 rounded-xl bg-muted/50 hover:bg-muted border-none">
                    <Keyboard className="h-4 w-4" />
                    Phím tắt
                  </Button>
                </div>
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
                  <div className="w-12 h-12 rounded-full border-4 border-matcha/10 flex items-center justify-center relative">
                    <span className="text-[10px] font-bold text-matcha">
                      {Math.round((completedSegments.size / segments.length) * 100)}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={(completedSegments.size / segments.length) * 100} 
                  className="h-2 rounded-full bg-matcha/10"
                />
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
      />
    </div>
  );
};

// export default DictationPlayer;
