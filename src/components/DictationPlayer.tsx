import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import YouTube, { YouTubeProps } from 'react-youtube';
import {
  ArrowLeft,
  Loader2,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Navigation from '@/components/Navigation';
import VideoLearningTabs, { VideoTab } from '@/components/video/VideoLearningTabs';
import SubtitlePanel from '@/components/video/SubtitlePanel';
import VideoMode from '@/components/video/VideoMode';
import DictationMode from '@/components/video/DictationMode';
import SpeakingMode from '@/components/video/SpeakingMode';
import VideoQuizMode from '@/components/video/VideoQuizMode';
import SummaryMode from '@/components/video/SummaryMode';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
}

interface DictationPlayerProps {
  video: VideoSource;
  onBack: () => void;
}

const DictationPlayer: React.FC<DictationPlayerProps> = ({ video, onBack }) => {
  // Core state
  const [segments, setSegments] = useState<Segment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Tab & UI state
  const [activeTab, setActiveTab] = useState<VideoTab>('video');
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(true);
  
  // YouTube player state  
  const [player, setPlayer] = useState<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Progress tracking
  const [completedSegments, setCompletedSegments] = useState<Set<number>>(new Set());
  const [speakingCompletedSegments, setSpeakingCompletedSegments] = useState<Set<number>>(new Set());
  const [segmentScores, setSegmentScores] = useState<Map<number, number>>(new Map());
  const [speakingScores, setSpeakingScores] = useState<Map<number, number>>(new Map());
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number } | undefined>();

  const timeUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
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
      }, 200); // Reduced frequency from 100ms to 200ms for performance
    }

    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
    };
  }, [playerReady, player]);

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
          />
        );
      
      case 'quiz':
        return (
          <VideoQuizMode
            questions={questions}
            onComplete={handleQuizComplete}
          />
        );
      
      case 'summary':
        return (
          <SummaryMode
            segments={segments}
            completedSegments={completedSegments}
            segmentScores={segmentScores}
            quizScore={quizScore}
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
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      {/* Tabs */}
      <VideoLearningTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        quizCount={questions.length}
        segmentsCount={segments.length}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left side - Video + Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{video.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Câu {currentIndex + 1}/{segments.length}</span>
                <Progress value={progress} className="w-20 h-1.5" />
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubtitlePanel(!showSubtitlePanel)}
              className="hidden md:flex gap-1"
            >
              {showSubtitlePanel ? (
                <>
                  <PanelRightClose className="h-4 w-4" />
                  Ẩn phụ đề
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-4 w-4" />
                  Hiện phụ đề
                </>
              )}
            </Button>
          </div>

          {/* Video Player */}
          <Card className="m-4 overflow-hidden shadow-card">
            <div className="aspect-video bg-black relative">
              <YouTube
                videoId={video.youtube_id}
                opts={opts}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
                className="w-full h-full"
                // @ts-ignore
                iframeClassName="w-full h-full"
              />
              {!playerReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
                  <Loader2 className="h-10 w-10 text-white animate-spin mb-2" />
                  <p className="text-white/90 text-sm">
                    Đang tải video...
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto px-4 pb-20 md:pb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right side - Subtitle Panel (desktop only) */}
        <AnimatePresence>
          {showSubtitlePanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden md:block border-l overflow-hidden"
            >
              <SubtitlePanel
                segments={segments}
                currentIndex={currentIndex}
                currentTime={currentTime}
                completedSegments={completedSegments}
                onSegmentClick={handleSegmentClick}
                onClose={() => setShowSubtitlePanel(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DictationPlayer;
