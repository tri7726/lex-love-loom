import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, RotateCcw, ChevronRight, BookOpen, Trophy, Flame, Target, Star, Zap, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTTS } from '@/hooks/useTTS';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useToast } from '@/hooks/use-toast';
import { PronunciationAnalysis, analyzePronunciation, PronunciationScore } from './PronunciationAnalysis';
import { cn } from '@/lib/utils';

interface PracticeItem {
  id: string;
  japanese: string;
  reading?: string;
  meaning: string;
  type: 'word' | 'sentence' | 'passage';
}

const sampleWords: PracticeItem[] = [
  { id: '1', japanese: 'おはようございます', reading: 'おはようございます', meaning: 'Chào buổi sáng', type: 'word' },
  { id: '2', japanese: 'ありがとうございます', reading: 'ありがとうございます', meaning: 'Cảm ơn (lịch sự)', type: 'word' },
  { id: '3', japanese: '食べる', reading: 'たべる', meaning: 'Ăn', type: 'word' },
  { id: '4', japanese: '飲む', reading: 'のむ', meaning: 'Uống', type: 'word' },
  { id: '5', japanese: '学校', reading: 'がっこう', meaning: 'Trường học', type: 'word' },
];

const sampleSentences: PracticeItem[] = [
  { id: 's1', japanese: '今日は天気がいいですね', reading: 'きょうはてんきがいいですね', meaning: 'Hôm nay thời tiết đẹp nhỉ', type: 'sentence' },
  { id: 's2', japanese: '日本語を勉強しています', reading: 'にほんごをべんきょうしています', meaning: 'Tôi đang học tiếng Nhật', type: 'sentence' },
  { id: 's3', japanese: 'お名前は何ですか', reading: 'おなまえはなんですか', meaning: 'Tên bạn là gì?', type: 'sentence' },
];

interface Props {
  customItems?: PracticeItem[];
  onComplete?: (scores: PronunciationScore[]) => void;
}

// Waveform Visualizer component
const WaveformVisualizer: React.FC<{ isActive: boolean; barCount?: number }> = ({ isActive, barCount = 12 }) => (
  <div className="flex items-center justify-center gap-[3px] h-16">
    {Array.from({ length: barCount }).map((_, i) => (
      <motion.div
        key={i}
        className={cn("w-1.5 rounded-full", isActive ? "bg-primary" : "bg-muted")}
        animate={isActive ? {
          height: [8, Math.random() * 50 + 10, 8],
        } : { height: 8 }}
        transition={{
          duration: 0.4 + Math.random() * 0.3,
          repeat: isActive ? Infinity : 0,
          delay: i * 0.05,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

// Score Ring component
const ScoreRing: React.FC<{ score: number; size?: number; label: string }> = ({ score, size = 80, label }) => {
  const circumference = 2 * Math.PI * (size / 2 - 6);
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-red-500';
  
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={size/2 - 6} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
        <motion.circle
          cx={size/2} cy={size/2} r={size/2 - 6}
          fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
          className={color}
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, delay: 0.3 }}
        />
      </svg>
      <span className={cn("text-xl font-black absolute", color)} style={{ marginTop: size/2 - 14 }}>{score}%</span>
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
};

export const SpeakingPracticeMode: React.FC<Props> = ({ customItems, onComplete }) => {
  const [mode, setMode] = useState<'word' | 'sentence'>('word');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [practiceScore, setPracticeScore] = useState<PronunciationScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completedScores, setCompletedScores] = useState<PronunciationScore[]>([]);
  const [transcript, setTranscript] = useState('');
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [startTime] = useState(Date.now());

  const items = customItems || (mode === 'word' ? sampleWords : sampleSentences);
  const currentItem = items[currentIndex];

  const { speak, isSpeaking, isSupported: ttsSupported } = useTTS({ lang: 'ja-JP' });
  const { toast } = useToast();

  const avgScore = useMemo(() => {
    if (completedScores.length === 0) return 0;
    return Math.round(completedScores.reduce((sum, s) => sum + s.overall, 0) / completedScores.length);
  }, [completedScores]);

  const handleSpeechResult = (text: string, isFinal: boolean) => {
    setTranscript(text);
    if (isFinal && text.trim()) {
      analyzeResult(text);
    }
  };

  const {
    isListening,
    startListening,
    stopListening,
    isSupported: sttSupported,
  } = useSpeechToText({
    lang: 'ja-JP',
    onResult: handleSpeechResult,
    onError: (error) => {
      toast({
        title: 'Lỗi nhận diện giọng nói',
        description: error,
        variant: 'destructive',
      });
    },
  });

  const analyzeResult = (userText: string) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const score = analyzePronunciation(currentItem.japanese, userText);
      setPracticeScore(score);
      setCompletedScores(prev => [...prev, score]);
      
      if (score.overall >= 70) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setBestStreak(Math.max(bestStreak, newStreak));
      } else {
        setStreak(0);
      }
      
      setIsAnalyzing(false);
    }, 500);
  };

  const handleRetry = () => {
    setPracticeScore(null);
    setTranscript('');
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setPracticeScore(null);
      setTranscript('');
    } else {
      setShowSummary(true);
    }
  };

  const handlePlayTarget = () => {
    speak(currentItem.japanese);
  };

  const toggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      setTranscript('');
      setPracticeScore(null);
      startListening();
    }
  };

  const handleFinish = () => {
    setShowSummary(false);
    onComplete?.(completedScores);
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      {/* Mode Selector */}
      {!customItems && (
        <Tabs value={mode} onValueChange={(v) => { setMode(v as 'word' | 'sentence'); setCurrentIndex(0); setPracticeScore(null); setCompletedScores([]); setStreak(0); }}>
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="word" className="rounded-lg gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Luyện từ
            </TabsTrigger>
            <TabsTrigger value="sentence" className="rounded-lg gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Luyện câu
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Stats Bar */}
      <div className="flex items-center justify-between bg-card/80 backdrop-blur-sm rounded-2xl p-3 px-5 border border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground">{currentIndex + 1}/{items.length}</span>
          {streak > 0 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded-full">
              <Flame className="h-3 w-3 text-orange-500" />
              <span className="text-[10px] font-black text-orange-600">{streak}</span>
            </motion.div>
          )}
        </div>
        <div className="flex gap-1">
          {items.map((_, i) => (
            <div key={i} className={cn(
              "w-2.5 h-2.5 rounded-full transition-all",
              i < currentIndex && completedScores[i]?.overall >= 80 && "bg-emerald-400",
              i < currentIndex && completedScores[i]?.overall >= 60 && completedScores[i]?.overall < 80 && "bg-amber-400",
              i < currentIndex && completedScores[i]?.overall < 60 && "bg-red-400",
              i === currentIndex && "bg-primary ring-2 ring-primary/30",
              i > currentIndex && "bg-muted"
            )} />
          ))}
        </div>
        {avgScore > 0 && (
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-bold text-primary">{avgScore}%</span>
          </div>
        )}
      </div>

      {/* Main Practice Card */}
      <Card className="shadow-lg border-2 border-border/50 rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-3 pt-6">
          <Badge variant="outline" className="w-fit mx-auto mb-3 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {currentItem.type === 'word' ? '🎯 Từ vựng' : '📝 Câu'}
          </Badge>
          <CardTitle className="font-jp text-4xl md:text-5xl tracking-tight">
            {currentItem.japanese}
          </CardTitle>
          {currentItem.reading && currentItem.reading !== currentItem.japanese && (
            <p className="text-base text-muted-foreground font-jp mt-2">{currentItem.reading}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">{currentItem.meaning}</p>
        </CardHeader>
        <CardContent className="space-y-5 pb-8">
          {/* Listen Button */}
          <div className="flex justify-center">
            <Button
              variant="outline" size="lg"
              onClick={handlePlayTarget}
              disabled={!ttsSupported || isSpeaking}
              className="gap-2 rounded-xl h-12 px-6"
            >
              <Volume2 className={cn("h-5 w-5", isSpeaking && "animate-pulse text-primary")} />
              {isSpeaking ? 'Đang phát...' : '🔊 Nghe mẫu'}
            </Button>
          </div>

          {/* Recording Section */}
          {!practiceScore && !isAnalyzing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
              {/* Waveform */}
              <WaveformVisualizer isActive={isListening} />

              {/* Mic Button */}
              <Button
                size="lg"
                variant={isListening ? 'destructive' : 'default'}
                onClick={toggleRecording}
                disabled={!sttSupported}
                className={cn(
                  "w-28 h-28 rounded-full transition-all shadow-lg",
                  isListening && "animate-pulse ring-4 ring-destructive/30"
                )}
              >
                {isListening ? (
                  <MicOff className="h-10 w-10" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </Button>
              <p className="text-xs text-muted-foreground font-medium">
                {isListening ? '🎙️ Đang nghe... Nhấn để dừng' : 'Nhấn để bắt đầu nói'}
              </p>

              {transcript && !isListening && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-muted/50 rounded-2xl border border-border/50"
                >
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Bạn đã nói:</p>
                  <p className="font-jp text-xl">{transcript}</p>
                </motion.div>
              )}

              {!sttSupported && (
                <p className="text-destructive text-sm">Trình duyệt không hỗ trợ nhận diện giọng nói</p>
              )}
            </motion.div>
          )}

          {/* Analysis Result */}
          {(practiceScore || isAnalyzing) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <PronunciationAnalysis
                score={practiceScore}
                targetText={currentItem.japanese}
                userTranscript={transcript}
                onRetry={handleRetry}
                onPlayTarget={handlePlayTarget}
                isLoading={isAnalyzing}
              />
            </motion.div>
          )}

          {/* Action Buttons */}
          {practiceScore && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-center pt-2"
            >
              <Button variant="outline" onClick={handleRetry} className="gap-2 rounded-xl">
                <RotateCcw className="h-4 w-4" /> Thử lại
              </Button>
              <Button size="lg" onClick={handleNext} className="gap-2 rounded-xl font-bold">
                {currentIndex < items.length - 1 ? (
                  <> Tiếp theo <ChevronRight className="h-5 w-5" /></>
                ) : (
                  <> Xem kết quả <Trophy className="h-5 w-5" /></>
                )}
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Session Summary Modal */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
          >
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20 }}>
              <Card className="w-full max-w-md border-2 border-primary/20 shadow-2xl rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 text-center space-y-6">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                    className="h-20 w-20 mx-auto rounded-full bg-primary/15 flex items-center justify-center"
                  >
                    <Trophy className="h-10 w-10 text-primary" />
                  </motion.div>
                  
                  <div>
                    <h3 className="text-2xl font-bold mb-1">Luyện nói hoàn thành! 🎙️</h3>
                    <p className="text-sm text-muted-foreground">
                      {items.length} mục · {Math.round((Date.now() - startTime) / 60000) || '<1'} phút
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-card/80 rounded-2xl p-3 space-y-1">
                      <Zap className="h-5 w-5 mx-auto text-primary" />
                      <p className="text-2xl font-black text-primary">{avgScore}%</p>
                      <p className="text-[10px] text-muted-foreground font-bold">TB Phát âm</p>
                    </div>
                    <div className="bg-card/80 rounded-2xl p-3 space-y-1">
                      <Flame className="h-5 w-5 mx-auto text-orange-500" />
                      <p className="text-2xl font-black text-orange-600">{bestStreak}</p>
                      <p className="text-[10px] text-muted-foreground font-bold">Best Streak</p>
                    </div>
                    <div className="bg-card/80 rounded-2xl p-3 space-y-1">
                      <Star className="h-5 w-5 mx-auto text-amber-500" />
                      <p className="text-2xl font-black text-amber-600">
                        {completedScores.filter(s => s.overall >= 80).length}/{completedScores.length}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-bold">Xuất sắc</p>
                    </div>
                  </div>

                  {/* Per-item breakdown */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {completedScores.map((score, i) => (
                      <div key={i} className="flex items-center justify-between bg-card/60 rounded-xl px-3 py-2 text-left">
                        <span className="text-sm font-jp truncate flex-1">{items[i]?.japanese}</span>
                        <Badge variant={score.overall >= 80 ? "default" : score.overall >= 60 ? "secondary" : "destructive"} className="ml-2">
                          {score.overall}%
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 gap-2 rounded-xl h-12"
                      onClick={() => { setShowSummary(false); setCurrentIndex(0); setCompletedScores([]); setStreak(0); setPracticeScore(null); setTranscript(''); }}
                    >
                      <RotateCcw className="h-4 w-4" /> Luyện lại
                    </Button>
                    <Button className="flex-1 rounded-xl h-12 font-bold" onClick={handleFinish}>
                      Hoàn thành ✨
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
