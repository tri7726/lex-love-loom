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
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { analyzePronunciation, PronunciationScore } from '@/components/PronunciationAnalysis';

const renderTextWithFurigana = (text: string, vocabulary: { word: string; reading: string; meaning: string }[] | unknown[], show: boolean) => {
  if (!show || !vocabulary || vocabulary.length === 0) return text;
  
  const vocab = [...(vocabulary as any[])].sort((a, b) => (b.word?.length || 0) - (a.word?.length || 0));
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

  const currentSegment = segments[currentIndex];

  // Speech to text hook
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: sttError,
  } = useSpeechToText({
    lang: 'ja-JP',
    continuous: false,
    interimResults: true,
  });

  // Track previous index to detect changes
  const prevIndexRef = React.useRef(currentIndex);

  // Reset state when segment changes
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      setHasChecked(false);
      setHasStartedRecording(false);
      setPronunciationScore(null);
      setHideText(false);
      resetTranscript();
      prevIndexRef.current = currentIndex;
    }
  }, [currentIndex, resetTranscript]);

  // Handle check pronunciation
  const handleCheckPronunciation = useCallback(() => {
    if (!currentSegment || !transcript.trim()) return;

    setIsAnalyzing(true);

    // Simulate slight delay for analysis feel
    setTimeout(() => {
      const score = analyzePronunciation(currentSegment.japanese_text, transcript);
      setPronunciationScore(score);
      setHasChecked(true);
      setIsAnalyzing(false);

      // Save score
      setSpeakingScores(prev => new Map(prev).set(currentIndex, score.overall));
      onComplete(score.overall);
    }, 500);
  }, [currentSegment, transcript, currentIndex, onComplete]);

  // Auto check when speech recognition ends - only if user started recording for this segment
  useEffect(() => {
    if (!isListening && transcript.trim() && !hasChecked && hasStartedRecording && currentSegment) {
      handleCheckPronunciation();
    }
  }, [isListening, transcript, hasChecked, hasStartedRecording, currentSegment, handleCheckPronunciation]);

  // Handle record button
  const handleRecord = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setHasStartedRecording(true);
      startListening();
    }
  };

  // Handle retry
  const handleRetry = () => {
    setHasChecked(false);
    setHasStartedRecording(false);
    setPronunciationScore(null);
    resetTranscript();
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
                disabled={!isSupported || hasChecked}
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    {isListening ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
                    <span>{isListening ? "Dừng ghi" : "Kiểm tra phát âm"}</span>
                  </div>
                  <span className="text-[10px] opacity-80 mt-0.5 font-normal">Enter</span>
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

            {/* Listening indicator */}
            {isListening && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                  </span>
                  Đang nghe... Hãy nói tiếng Nhật
                </div>
                {transcript && (
                  <p className="font-jp text-lg mt-3 text-muted-foreground">{transcript}</p>
                )}
              </motion.div>
            )}

            {/* Analyzing indicator */}
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  Đang phân tích phát âm...
                </div>
              </motion.div>
            )}

            {/* STT Error */}
            {sttError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center p-3 bg-destructive/10 rounded-lg text-destructive"
              >
                {sttError}
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
      </div>
    </TooltipProvider>
  );
};

// export default SpeakingMode;
