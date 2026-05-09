import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, RotateCcw, ChevronRight, 
  BookOpen, Trophy, Target, Sparkles, ArrowLeft, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/navigation/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTTS } from '@/hooks/useTTS';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PronunciationAnalysis, PronunciationScore } from '@/components/practice/PronunciationAnalysis';
import { cn } from '@/lib/utils';

interface PracticeItem {
  id: string;
  japanese: string;
  reading?: string;
  meaning: string;
  type: 'word' | 'sentence';
}

const SAMPLE_WORDS: PracticeItem[] = [
  { id: 'w1', japanese: 'こんにちは', reading: 'こんにちは', meaning: 'Xin chào', type: 'word' },
  { id: 'w2', japanese: 'ありがとうございます', reading: 'ありがとうございます', meaning: 'Cảm ơn', type: 'word' },
  { id: 'w3', japanese: '日本語', reading: 'にほんご', meaning: 'Tiếng Nhật', type: 'word' },
  { id: 'w4', japanese: '勉強', reading: 'べんきょう', meaning: 'Học tập', type: 'word' },
];

const SAMPLE_SENTENCES: PracticeItem[] = [
  { id: 's1', japanese: '日本語を勉強しています', reading: 'にほんご lをべんきょうしています', meaning: 'Tôi đang học tiếng Nhật', type: 'sentence' },
  { id: 's2', japanese: '今日は天気がいいですね', reading: 'きょうはてんきがいいですね', meaning: 'Hôm nay thời tiết đẹp nhỉ', type: 'sentence' },
  { id: 's3', japanese: 'お名前は何ですか', reading: 'おなまえはなんですか', meaning: 'Tên bạn là gì?', type: 'sentence' },
];

const WaveformVisualizer = ({ isActive }: { isActive: boolean }) => (
  <div className="flex items-center justify-center gap-1 h-12">
    {Array.from({ length: 15 }).map((_, i) => (
      <motion.div
        key={i}
        className={cn("w-1 rounded-full", isActive ? "bg-primary" : "bg-muted")}
        animate={isActive ? {
          height: [8, Math.random() * 40 + 8, 8],
        } : { height: 8 }}
        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
      />
    ))}
  </div>
);

const SpeakingPractice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<'word' | 'sentence'>('word');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [practiceScore, setPracticeScore] = useState<PronunciationScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [localTranscript, setLocalTranscript] = useState('');
  
  const { speak, isSpeaking } = useTTS({ lang: 'ja-JP' });
  const { isRecording: isRecorderActive, startRecording, stopRecording } = useAudioRecorder();
  
  const currentItem = items[currentIndex];

  const handleSpeechResult = (text: string, isFinal: boolean) => {
    setLocalTranscript(text);
    // We now rely on stopRecording to trigger the AI analysis with the full audio
  };

  const {
    isListening,
    startListening,
    stopListening,
    isSupported: sttSupported,
  } = useSpeechToText({
    lang: 'ja-JP',
    onResult: handleSpeechResult,
  });

  useEffect(() => {
    const fetchPracticeData = async () => {
      setLoading(true);
      try {
        if (mode === 'sentence') {
          const { data, error } = await (supabase as any)
            .from('shadowing_practices')
            .select('*')
            .limit(10);
          
          if (error) throw error;
          
          if (data && (data as any[]).length > 0) {
            setItems((data as any[]).map(d => ({
              id: d.id,
              japanese: d.transcript,
              meaning: d.translation || '',
              type: 'sentence'
            })));
          } else {
            setItems(SAMPLE_SENTENCES);
          }
        } else {
          // Fetch words (using Kanji table as source for now)
          const { data, error } = await (supabase as any)
            .from('kanji')
            .select('id, character, meaning')
            .limit(10);
            
          if (error) throw error;
          
          if (data && (data as any[]).length > 0) {
            setItems((data as any[]).map(d => ({
              id: d.id,
              japanese: d.character,
              meaning: d.meaning,
              type: 'word'
            })));
          } else {
            setItems(SAMPLE_WORDS);
          }
        }
      } catch (err) {
        console.error('Error fetching practice data:', err);
        setItems(mode === 'word' ? SAMPLE_WORDS : SAMPLE_SENTENCES);
      } finally {
        setLoading(false);
        setCurrentIndex(0);
        resetState();
      }
    };

    fetchPracticeData();
  }, [mode]);

  const resetState = () => {
    setLocalTranscript('');
    setPracticeScore(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  };

  const processResult = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('target_text', currentItem.japanese);

      const { data, error } = await (supabase as any).functions.invoke('analyze-speech', {
        body: formData,
      });

      if (error) throw error;

      if (data.success) {
        setLocalTranscript(data.transcript);
        setPracticeScore({
          accuracy: data.evaluation.accuracy_score || 80,
          duration: 70,
          rhythm: 75,
          fluency: data.evaluation.fluency_score || 70,
          overall: data.evaluation.score,
          feedback: [], // Detailed feedback is now in ai_evaluation
          ai_evaluation: data.evaluation,
          highlightedText: [] // Could be implemented by comparing transcript and target
        });
      }
    } catch (err: any) {
      toast({ title: "Lỗi phân tích", description: err.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isListening) {
      stopListening();
      const blob = await stopRecording();
      if (blob) {
        processResult(blob);
      }
    } else {
      resetState();
      try {
        startListening();
        await startRecording();
      } catch (err) {
        toast({ title: "Lỗi", description: "Không thể khởi dụng micro.", variant: "destructive" });
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetState();
    } else {
      toast({ title: "Hoàn thành!", description: "Bạn đã hoàn thành bài luyện tập." });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      <main className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" /> AI Powered
          </Badge>
        </div>

        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-display font-bold flex items-center justify-center md:justify-start gap-3">
            <Mic className="h-8 w-8 text-primary" /> Luyện nói AI
          </h1>
          <p className="text-muted-foreground">Phát âm chuẩn xác cùng trợ lý thông minh.</p>
        </div>

        <Tabs value={mode} onValueChange={(v: string) => setMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8 rounded-2xl">
            <TabsTrigger value="word" className="gap-2 rounded-xl"><Target className="h-4 w-4" /> Luyện từ</TabsTrigger>
            <TabsTrigger value="sentence" className="gap-2 rounded-xl"><BookOpen className="h-4 w-4" /> Luyện câu</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div key={`${mode}-${currentIndex}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-2 shadow-2xl overflow-hidden rounded-3xl">
                <CardHeader className="text-center pt-10">
                  {loading ? (
                    <div className="space-y-4 py-10 animate-pulse">
                      <div className="h-8 w-24 bg-muted rounded-full mx-auto" />
                      <div className="h-20 w-48 bg-muted rounded-2xl mx-auto" />
                      <div className="h-6 w-32 bg-muted rounded-lg mx-auto" />
                    </div>
                  ) : currentItem ? (
                    <>
                      <Badge variant="secondary" className="w-fit mx-auto mb-4">{currentIndex + 1} / {items.length}</Badge>
                      <CardTitle className="text-5xl font-jp md:text-6xl font-black">{currentItem.japanese}</CardTitle>
                      <CardDescription className="text-xl font-jp mt-2">{currentItem.reading}</CardDescription>
                      <p className="text-lg text-primary font-medium">{currentItem.meaning}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Không có dữ liệu bài học.</p>
                  )}
                </CardHeader>

                <CardContent className="space-y-8 pb-12">
                  <div className="flex justify-center">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={() => currentItem && speak(currentItem.japanese)} 
                      disabled={isSpeaking || loading || !currentItem} 
                      className="h-14 px-8 rounded-2xl gap-2"
                    >
                      <Volume2 className={cn("h-6 w-6", isSpeaking && "animate-pulse text-primary")} /> Nghe mẫu
                    </Button>
                  </div>

                  <div className="flex flex-col items-center gap-6">
                    <WaveformVisualizer isActive={isListening} />
                    <Button
                      size="lg"
                      variant={isListening ? "destructive" : "default"}
                      onClick={handleToggleRecording}
                      disabled={!sttSupported}
                      className={cn("w-24 h-24 rounded-full shadow-xl transition-all", isListening && "animate-pulse ring-8 ring-destructive/20")}
                    >
                      {isListening ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
                    </Button>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {isListening ? "Đang ghi âm..." : "Nhấn để bắt đầu"}
                    </p>
                  </div>

                  <AnimatePresence>
                    {(isAnalyzing || practiceScore) && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 border-t pt-8">
                        <PronunciationAnalysis 
                          score={practiceScore}
                          targetText={currentItem.japanese}
                          userTranscript={localTranscript}
                          onRetry={resetState}
                          onPlayTarget={() => speak(currentItem.japanese)}
                          isLoading={isAnalyzing}
                        />
                        {practiceScore && (
                          <div className="flex justify-center mt-8">
                            <Button onClick={handleNext} size="lg" className="rounded-2xl px-12 h-14 font-bold">Tiếp theo <ChevronRight className="h-5 w-5" /></Button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </main>
    </div>
  );
};

export default SpeakingPractice;
