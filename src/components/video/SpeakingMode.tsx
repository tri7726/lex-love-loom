import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Mic,
  MicOff,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
  EyeOff,
  Volume2,
  Settings,
  Type,
  Languages,
  BookOpen,
  Keyboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { analyzePronunciation, PronunciationScore } from '@/components/PronunciationAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { VoiceHub } from '@/components/chat/VoiceHub';
import { Sparkles } from 'lucide-react';

interface VocabularyItem {
  word: string;
  reading: string;
  meaning: string;
}

const renderTextWithFurigana = (text: string, vocabulary: VocabularyItem[] | Record<string, unknown>[], show: boolean) => {
  if (!show || !vocabulary || vocabulary.length === 0) return text;
  
  const vocab = [...(vocabulary as VocabularyItem[])].sort((a, b) => (b.word?.length || 0) - (a.word?.length || 0));
  let parts: Array<{ text: string, furigana?: string }> = [{ text }];
  
  vocab.forEach(v => {
    const newParts: typeof parts = [];
    parts.forEach(part => {
      if (part.furigana) {
        newParts.push(part);
        return;
      }
      const subParts = part.text.split(v.word);
      subParts.forEach((subPart, i) => {
        if (subPart) newParts.push({ text: subPart });
        if (i < subParts.length - 1) {
          newParts.push({ text: v.word, furigana: v.reading });
        }
      });
    });
    parts = newParts;
  });

  return parts.map((part, i) => (
    <span key={i} className="inline-block">
      {part.furigana ? (
        <ruby>
          {part.text}
          <rt className="text-[10px] opacity-70">{part.furigana}</rt>
        </ruby>
      ) : part.text}
    </span>
  ));
};

interface Segment {
  id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  japanese_text: string;
  vietnamese_text: string | null;
  vocabulary: Array<{ word: string; reading: string; meaning: string }>;
}

interface SpeakingModeProps {
  segments: Segment[];
  currentIndex: number;
  completedSegments: Set<number>;
  onIndexChange: (index: number) => void;
  onPlaySegment: () => void;
  onComplete: (score: number) => void;
  playerReady: boolean;
  showFurigana?: boolean;
  showTranslation?: boolean;
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export const SpeakingMode: React.FC<SpeakingModeProps> = ({
  segments,
  currentIndex,
  completedSegments,
  onIndexChange,
  onPlaySegment,
  onComplete,
  playerReady,
  showFurigana = false,
  showTranslation = true,
}) => {
  // State
  const [hideText, setHideText] = useState(false);
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);
  const [pronunciationScore, setPronunciationScore] = useState<PronunciationScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [speakingScores, setSpeakingScores] = useState<Map<number, number>>(new Map());
  const [isVoiceHubOpen, setIsVoiceHubOpen] = useState(false);

  const currentSegment = segments[currentIndex];

  const { isRecording: isListening, startRecording, stopRecording, getAudioData, error: recordingError } = useAudioRecorder();
  const [transcript, setTranscript] = useState('');
  const [sttError, setSttError] = useState<string | null>(null);

  // Audio Visualizer Animation Loop
  const [audioBars, setAudioBars] = useState<number[]>(new Array(10).fill(10));
  const animationFrameRef = React.useRef<number>(0);

  useEffect(() => {
    if (isListening) {
      const updateVisualizer = () => {
        const data = getAudioData();
        if (data) {
          // sample ~10 bars
          const step = Math.floor(data.length / 10);
          const newBars = [];
          for (let i = 0; i < 10; i++) {
            const sum = data.slice(i * step, (i + 1) * step).reduce((a, b) => a + b, 0);
            const avg = sum / step;
            newBars.push(Math.max(10, avg * 0.8)); // min height 10px
          }
          setAudioBars(newBars);
        }
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();
    } else {
      setAudioBars(new Array(10).fill(10));
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isListening, getAudioData]);

  // Track previous index to detect changes
  const prevIndexRef = React.useRef(currentIndex);

  // Reset state when segment changes
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      setHasChecked(false);
      setHasStartedRecording(false);
      setPronunciationScore(null);
      setHideText(false);
      setTranscript('');
      setSttError(null);
      // Reset video volume if moving away
      window.dispatchEvent(new CustomEvent('duck-video-volume', { detail: { isDucked: false } }));
      prevIndexRef.current = currentIndex;
    }
  }, [currentIndex]);

  // Handle record button
  const handleRecord = async () => {
    if (isListening) {
      try {
        setIsAnalyzing(true);
        // Restore volume
        window.dispatchEvent(new CustomEvent('duck-video-volume', { detail: { isDucked: false } }));
        const audioBlob = await stopRecording();
        if (!audioBlob) {
           setIsAnalyzing(false);
           return;
        }

        // Send to Whisper AI Edge Function
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');

        const { data, error } = await supabase.functions.invoke('analyze-speech', {
          body: formData,
        });

        if (error) throw error;
        if (!data || !data.success) throw new Error(data?.error || "Lỗi khi nhận diện giọng nói");

        const finalTranscript = data.transcript;
        setTranscript(finalTranscript);

        // Grade the pronunciation
        const score = analyzePronunciation(currentSegment!.japanese_text, finalTranscript);
        setPronunciationScore(score);
        setHasChecked(true);
        setSpeakingScores(prev => new Map(prev).set(currentIndex, score.overall));
        onComplete(score.overall);

      } catch (err: unknown) {
         console.error("AI Analysis error:", err);
         setSttError(err instanceof Error ? err.message : "Chưa thể kết nối tới Sensei AI");
      } finally {
         setIsAnalyzing(false);
      }
    } else {
      // Bắt đầu ghi âm
      setHasStartedRecording(true);
      setHasChecked(false);
      setPronunciationScore(null);
      setTranscript('');
      setSttError(null);
      // Duck volume
      window.dispatchEvent(new CustomEvent('duck-video-volume', { detail: { isDucked: true } }));
      try {
        await startRecording();
      } catch (e) {
        setSttError("Không thể kết nối Micro. Cần cấp quyền trên trình duyệt.");
      }
    }
  };

  // Handle retry
  const handleRetry = () => {
    setHasChecked(false);
    setHasStartedRecording(false);
    setPronunciationScore(null);
    setTranscript('');
    setSttError(null);
    window.dispatchEvent(new CustomEvent('duck-video-volume', { detail: { isDucked: false } }));
  };

  // Handle navigation
  const handlePrev = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < segments.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-matcha';
    if (score >= 60) return 'text-gold';
    if (score >= 40) return 'text-orange-500';
    return 'text-destructive';
  };

  if (!currentSegment) return null;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-bold">Luyện phát âm</h2>
            <span className="text-sm text-muted-foreground">
              (Câu hỏi {currentIndex + 1}/{segments.length})
            </span>
          </div>
          
          {/* Toolbar icons */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Type className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cỡ chữ</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <BookOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Từ vựng</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Languages className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Furigana</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Phím tắt</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cài đặt</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Segment Selector */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex items-center gap-2 pb-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 flex-shrink-0 bg-muted/50 rounded-lg hover:bg-muted"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {segments.map((_, index) => {
              const isActive = index === currentIndex;
              const isCompleted = completedSegments.has(index);

              return (
                <Button
                  key={index}
                  variant={isActive ? 'default' : 'secondary'}
                  size="sm"
                  className={cn(
                    'h-9 min-w-[70px] flex-shrink-0 rounded-lg transition-all',
                    isActive 
                      ? 'bg-matcha text-white hover:bg-matcha/90 border-none' 
                      : 'bg-muted/50 text-foreground hover:bg-muted border-none',
                    isCompleted && !isActive && 'text-matcha ring-1 ring-matcha/30'
                  )}
                  onClick={() => onIndexChange(index)}
                >
                  Câu {index + 1}
                </Button>
              );
            })}

            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 flex-shrink-0 bg-muted/50 rounded-lg hover:bg-muted"
              onClick={handleNext}
              disabled={currentIndex === segments.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Main Content Card */}
        <Card className="shadow-card">
          <CardContent className="p-6 space-y-6">
            {/* Current Sentence Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">CÂU HIỆN TẠI</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHideText(!hideText)}
                  className="gap-1"
                >
                  {hideText ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {hideText ? 'Hiện' : 'Ẩn'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPhonetic(!showPhonetic)}
                  className="gap-1"
                >
                  Phiên âm
                </Button>
              </div>
            </div>

            {/* Japanese Text */}
            <div className="text-center py-4">
              <AnimatePresence mode="wait">
                {hideText ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-jp text-2xl text-muted-foreground"
                  >
                    {currentSegment.japanese_text.split('').map(() => '●').join('')}
                  </motion.p>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="font-jp text-3xl flex flex-wrap justify-center gap-1">
                      {renderTextWithFurigana(currentSegment.japanese_text, currentSegment.vocabulary, showFurigana)}
                    </div>
                    {showTranslation && currentSegment.vietnamese_text && (
                      <p className="text-sm text-muted-foreground mt-2 italic shadow-sm bg-muted/20 p-2 rounded">
                        {currentSegment.vietnamese_text}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
              {/* Replay button */}
              <Button
                variant="secondary"
                size="lg"
                onClick={onPlaySegment}
                disabled={!playerReady}
                className="h-12 flex-1 sm:flex-none gap-2 px-6 rounded-xl bg-muted/50 hover:bg-muted border-none"
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 fill-foreground" />
                    <span>Phát lại</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Space</span>
                </div>
              </Button>

              {/* Record button - main CTA */}
              <Button
                size="lg"
                className={cn(
                  'h-12 flex-[2] sm:flex-none gap-2 px-10 rounded-xl font-bold shadow-matcha/20 shadow-lg border-none',
                  isListening
                    ? 'bg-destructive hover:bg-destructive/90'
                    : 'bg-matcha hover:bg-matcha/90 text-white',
                )}
                onClick={handleRecord}
                disabled={hasChecked || isAnalyzing}
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    {isListening ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
                    <span>{isListening ? "Dừng ghi" : "Kiểm tra phát âm"}</span>
                  </div>
                  <span className="text-[10px] opacity-80 mt-0.5 font-normal">Enter</span>
                </div>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-12 flex-[2] sm:flex-none gap-2 px-6 rounded-xl font-bold border-sakura/30 text-sakura hover:bg-sakura/10 hover:text-sakura group"
                onClick={() => setIsVoiceHubOpen(true)}
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 group-hover:animate-pulse" />
                    <span>Luyện cùng AI Sensei</span>
                  </div>
                  <span className="text-[10px] opacity-60 mt-0.5 font-light">Giọng nói thực tế</span>
                </div>
              </Button>

              {/* Nav buttons */}
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="h-12 flex-1 sm:flex-none px-6 rounded-xl bg-muted/30 hover:bg-muted border-none"
                >
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      <span>Trước</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Shift + ←</span>
                  </div>
                </Button>

                <Button
                  variant="default"
                  size="lg"
                  onClick={handleNext}
                  disabled={currentIndex === segments.length - 1}
                  className="h-12 flex-1 sm:flex-none px-10 rounded-xl bg-matcha/20 text-matcha hover:bg-matcha/30 border-none font-bold"
                >
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1">
                      <span>Tiếp</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] opacity-80 mt-0.5 font-normal">Tab / Shift + →</span>
                  </div>
                </Button>
              </div>
            </div>

            {/* Listening Visualizer */}
            {isListening && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-6"
              >
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-[24px] bg-sakura/5 border border-sakura/20 text-sakura font-medium shadow-inner">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sakura opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-sakura" />
                  </span>
                  Sensei đang nghe, bạn bắt đầu đọc nhé...
                </div>
                
                {/* Audio Waveform Effect */}
                <div className="flex justify-center items-end h-16 gap-1 mt-6">
                  {audioBars.map((height, i) => (
                    <motion.div
                      key={i}
                      className="w-2 md:w-3 rounded-t-full bg-gradient-to-t from-sakura/80 to-sakura-light"
                      animate={{ height: height }}
                      transition={{ type: "spring", bounce: 0.5, duration: 0.1 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Analyzing indicator (Whisper Wait) */}
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mt-6"
              >
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-[24px] bg-matcha/10 text-matcha font-bold border border-matcha/20">
                  <div className="animate-spin h-5 w-5 border-2 border-matcha border-t-transparent rounded-full" />
                  Sensei AI đang bóc băng đánh giá...
                </div>
              </motion.div>
            )}

            {/* STT Error */}
            {(sttError || recordingError) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive font-medium shadow-sm"
              >
                {sttError || recordingError}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Score Display */}
        <AnimatePresence>
          {hasChecked && pronunciationScore && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Score Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Overall Score */}
                <Card className="shadow-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Điểm phát âm</p>
                    <p className={cn('text-3xl font-bold', getScoreColor(pronunciationScore.overall))}>
                      {pronunciationScore.overall.toFixed(1)}
                    </p>
                  </CardContent>
                </Card>

                {/* Accuracy */}
                <Card className="shadow-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Độ chính xác</p>
                    <p className={cn('text-3xl font-bold', getScoreColor(pronunciationScore.accuracy))}>
                      {pronunciationScore.accuracy.toFixed(1)}
                    </p>
                  </CardContent>
                </Card>

                {/* Fluency */}
                <Card className="shadow-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Độ trôi chảy</p>
                    <p className={cn('text-3xl font-bold', getScoreColor(pronunciationScore.fluency))}>
                      {pronunciationScore.fluency.toFixed(1)}
                    </p>
                  </CardContent>
                </Card>

                {/* Completeness (Duration) */}
                <Card className="shadow-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Độ hoàn thiện</p>
                    <p className={cn('text-3xl font-bold', getScoreColor(pronunciationScore.duration))}>
                      {pronunciationScore.duration.toFixed(1)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Transcript comparison */}
              {transcript && (
                <Card className="mt-4 shadow-card">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Văn bản gốc:</p>
                      <p className="font-jp text-lg">{currentSegment.japanese_text}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Bạn đã nói:</p>
                      <div className="font-jp text-lg">
                        {pronunciationScore.highlightedText?.map((word, i) => (
                          <span
                            key={i}
                            className={cn(
                              word.status === 'correct' && 'text-matcha',
                              word.status === 'incorrect' && 'text-destructive bg-destructive/10 px-0.5 rounded',
                              word.status === 'missing' && 'text-gold italic',
                              word.status === 'extra' && 'text-muted-foreground line-through',
                            )}
                          >
                            {word.word}
                          </span>
                        )) || transcript}
                      </div>
                    </div>

                    {/* Feedback */}
                    {pronunciationScore.feedback.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        {pronunciationScore.feedback.map((fb, i) => (
                          <div
                            key={i}
                            className={cn(
                              'p-2 rounded text-sm',
                              fb.type === 'success' && 'bg-matcha/10 text-matcha',
                              fb.type === 'warning' && 'bg-gold/10 text-gold',
                              fb.type === 'error' && 'bg-destructive/10 text-destructive',
                            )}
                          >
                            {fb.message}
                            {fb.suggestion && (
                              <span className="block text-xs mt-0.5 opacity-80">{fb.suggestion}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Retry button */}
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={handleRetry} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Luyện lại
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar at bottom */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            Đã hoàn thành {completedSegments.size} / {segments.length}
          </span>
          <Progress
            value={(completedSegments.size / segments.length) * 100}
            className="flex-1 h-2"
          />
          <span className="text-sm font-medium">
            {Math.round((completedSegments.size / segments.length) * 100)}%
          </span>
        </div>

        <VoiceHub
          isOpen={isVoiceHubOpen}
          onClose={() => setIsVoiceHubOpen(false)}
          targetSentence={currentSegment.japanese_text}
          onSuccess={(score) => {
            onComplete(score);
            // hub stays open for feedback, but we mark as complete
          }}
        />
      </div>
    </TooltipProvider>
  );
};

// export default SpeakingMode;
