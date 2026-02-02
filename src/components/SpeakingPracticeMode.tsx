import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, RotateCcw, ChevronRight, BookOpen } from 'lucide-react';
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

export const SpeakingPracticeMode: React.FC<Props> = ({ customItems, onComplete }) => {
  const [mode, setMode] = useState<'word' | 'sentence'>('word');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [practiceScore, setPracticeScore] = useState<PronunciationScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completedScores, setCompletedScores] = useState<PronunciationScore[]>([]);
  const [transcript, setTranscript] = useState('');

  const items = customItems || (mode === 'word' ? sampleWords : sampleSentences);
  const currentItem = items[currentIndex];

  const { speak, isSpeaking, isSupported: ttsSupported } = useTTS({ lang: 'ja-JP' });
  const { toast } = useToast();

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
    
    // Simulate AI analysis delay
    setTimeout(() => {
      const score = analyzePronunciation(currentItem.japanese, userText);
      setPracticeScore(score);
      setCompletedScores(prev => [...prev, score]);
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
    } else if (onComplete) {
      onComplete(completedScores);
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

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      {!customItems && (
        <Tabs value={mode} onValueChange={(v) => { setMode(v as 'word' | 'sentence'); setCurrentIndex(0); setPracticeScore(null); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="word">Luyện từ</TabsTrigger>
            <TabsTrigger value="sentence">Luyện câu</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Tiến độ: {currentIndex + 1}/{items.length}</span>
        <div className="flex gap-1">
          {items.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i < currentIndex && completedScores[i]?.overall >= 70 && "bg-matcha",
                i < currentIndex && completedScores[i]?.overall < 70 && "bg-gold",
                i === currentIndex && "bg-primary",
                i > currentIndex && "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Current Item Card */}
      <Card className="shadow-elevated">
        <CardHeader className="text-center">
          <Badge variant="outline" className="w-fit mx-auto mb-2">
            {currentItem.type === 'word' ? 'Từ vựng' : 'Câu'}
          </Badge>
          <CardTitle className="font-jp text-3xl md:text-4xl">
            {currentItem.japanese}
          </CardTitle>
          {currentItem.reading && currentItem.reading !== currentItem.japanese && (
            <p className="text-lg text-muted-foreground font-jp">{currentItem.reading}</p>
          )}
          <p className="text-muted-foreground">{currentItem.meaning}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Listen Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePlayTarget}
              disabled={!ttsSupported || isSpeaking}
              className="gap-2"
            >
              <Volume2 className={cn("h-5 w-5", isSpeaking && "animate-pulse")} />
              {isSpeaking ? 'Đang phát...' : 'Nghe mẫu'}
            </Button>
          </div>

          {/* Recording Section */}
          {!practiceScore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-4"
            >
              <Button
                size="lg"
                variant={isListening ? 'destructive' : 'default'}
                onClick={toggleRecording}
                disabled={!sttSupported || isAnalyzing}
                className="w-40 h-40 rounded-full"
              >
                {isListening ? (
                  <div className="flex flex-col items-center">
                    <MicOff className="h-12 w-12 mb-2" />
                    <span>Dừng</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Mic className="h-12 w-12 mb-2" />
                    <span>Nói</span>
                  </div>
                )}
              </Button>

              {isListening && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  <div className="flex justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-2 bg-primary rounded-full"
                        animate={{ height: [12, 24, 12] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground">Đang nghe...</p>
                </motion.div>
              )}

              {transcript && !isListening && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Bạn đã nói:</p>
                  <p className="font-jp text-xl">{transcript}</p>
                </div>
              )}

              {!sttSupported && (
                <p className="text-destructive text-sm">
                  Trình duyệt không hỗ trợ nhận diện giọng nói
                </p>
              )}
            </motion.div>
          )}

          {/* Analysis Result */}
          {(practiceScore || isAnalyzing) && (
            <PronunciationAnalysis
              score={practiceScore}
              targetText={currentItem.japanese}
              userTranscript={transcript}
              onRetry={handleRetry}
              onPlayTarget={handlePlayTarget}
              isLoading={isAnalyzing}
            />
          )}

          {/* Next Button */}
          {practiceScore && (
            <div className="flex justify-center pt-4">
              <Button size="lg" onClick={handleNext} className="gap-2">
                {currentIndex < items.length - 1 ? (
                  <>
                    Tiếp theo
                    <ChevronRight className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    Hoàn thành
                    <BookOpen className="h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {completedScores.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span>Điểm trung bình:</span>
              <span className="font-bold text-lg">
                {Math.round(completedScores.reduce((sum, s) => sum + s.overall, 0) / completedScores.length)}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpeakingPracticeMode;
