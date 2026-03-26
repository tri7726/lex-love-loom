import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, RotateCcw, CheckCircle2, ArrowLeft, ArrowRight, Sparkles, Trophy, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { VocabWord } from '@/types/vocabulary';
import { cn } from '@/lib/utils';

interface PronunciationGameProps {
  words: VocabWord[];
  onFinish: () => void;
}

export const PronunciationGame: React.FC<PronunciationGameProps> = ({ words, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);

  const currentWord = words[currentIndex];
  const progress = (completedWords.size / words.length) * 100;

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.7;
      speechSynthesis.speak(utterance);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stopping recording -> Calculate score
      setIsRecording(false);
      const randomScore = Math.floor(Math.random() * 41) + 60; // 60-100
      setLastScore(randomScore);
      setTotalScore((prev) => prev + randomScore);
      setCompletedWords((prev) => new Set([...prev, currentWord.id]));
      if (randomScore >= 95) setPerfectCount((prev) => prev + 1);
    } else {
      setIsRecording(true);
      setLastScore(null);
    }
  };

  const getRank = (score: number) => {
    if (score >= 95) return { label: 'Perfect!', color: 'text-emerald-500', bg: 'bg-emerald-50' };
    if (score >= 85) return { label: 'Great!', color: 'text-sky-500', bg: 'bg-sky-50' };
    if (score >= 70) return { label: 'Good', color: 'text-amber-500', bg: 'bg-amber-50' };
    return { label: 'Keep Trying', color: 'text-rose-500', bg: 'bg-rose-50' };
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsRecording(false);
      setLastScore(null);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setIsRecording(false);
    setLastScore(null);
  };

  const isCompleted = completedWords.has(currentWord.id);

  return (
    <div className="max-w-xl mx-auto space-y-4 py-2">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <Button variant="ghost" onClick={onFinish} className="gap-2 text-muted-foreground hover:text-sakura transition-colors">
          <ChevronLeft className="h-4 w-4" /> Thoát
        </Button>
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-slate-800">Luyện phát âm</h2>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">{completedWords.size} / {words.length} hoàn thành</p>
        </div>
        <div className="w-20" /> {/* Spacer */}
      </div>

      {/* Progress */}
      <div className="space-y-2 px-2">
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-sakura to-rose-400"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Main Practice Card */}
      <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-rose-50/50">
        <div className="h-2 bg-gradient-to-r from-sakura to-rose-300" />
        <CardHeader className="pb-0 pt-6 px-6">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-rose-50 text-sakura border-sakura/20 px-3 py-0.5 rounded-full text-[10px] font-bold">
              Từ {currentIndex + 1} / {words.length}
            </Badge>
            {isCompleted && (
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 bg-matcha-light/20 text-matcha-dark px-3 py-1 rounded-full border border-matcha/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold">Đã luyện</span>
              </motion.div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-8 pt-2">
          <div className="text-center space-y-4">
            <div className="space-y-1 relative">
              <Sparkles className="absolute -top-4 -right-2 h-5 w-5 text-amber-200 animate-pulse" />
              <p className="text-4xl font-jp font-bold text-slate-900 tracking-tight">{currentWord.word}</p>
              {currentWord.reading && (
                <p className="text-xl text-rose-400 font-jp font-medium tracking-wide">
                  {currentWord.reading}
                </p>
              )}
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 inline-block mx-auto min-w-[200px]">
              <p className="text-xl text-slate-600 font-medium">{currentWord.meaning}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-8">
            <div className="flex justify-center flex-wrap gap-3 w-full">
              <Button
                variant="outline"
                size="lg"
                onClick={() => speak(currentWord.word)}
                className="gap-2 border-sakura/30 text-sakura hover:bg-sakura/5 px-8 py-5 rounded-xl font-bold shadow-sm transition-all text-sm"
              >
                <Volume2 className="h-5 w-5" />
                Nghe mẫu
              </Button>
            </div>

            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <AnimatePresence>
                  {isRecording && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 10 }}
                          animate={{ 
                            height: [10, Math.random() * 80 + 20, 10],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 0.5, 
                            delay: i * 0.05 
                          }}
                          className="w-1 mx-0.5 bg-rose-400 rounded-full"
                        />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleRecording}
                  className={cn(
                    "relative w-24 h-24 rounded-full shadow-2xl flex items-center justify-center transition-all z-10",
                    isRecording
                      ? "bg-red-500 text-white shadow-red-200 border-4 border-white"
                      : "bg-gradient-to-br from-sakura to-rose-500 text-white shadow-sakura/30 border-4 border-white/50"
                  )}
                >
                  {isRecording ? (
                    <MicOff className="h-10 w-10" />
                  ) : (
                    <Mic className="h-10 w-10" />
                  )}
                </motion.button>
              </div>
              <p className={cn(
                "text-sm font-bold tracking-wide uppercase",
                isRecording ? "text-red-500 animate-pulse" : "text-slate-400"
              )}>
                {isRecording ? 'Đang ghi âm...' : (lastScore ? 'Nhấn để luyện lại' : 'Nhấn để bắt đầu nói')}
              </p>
              
              <AnimatePresence>
                {lastScore !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col items-center gap-1 p-4 rounded-2xl w-full",
                      getRank(lastScore).bg
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("text-2xl font-black italic", getRank(lastScore).color)}>
                        {getRank(lastScore).label}
                      </span>
                      <Badge className={cn("font-bold", getRank(lastScore).color === 'text-emerald-500' ? "bg-emerald-500" : "bg-slate-800")}>
                        {lastScore}%
                      </Badge>
                    </div>
                    {lastScore >= 95 && <Sparkles className="h-4 w-4 text-amber-500 animate-bounce" />}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center px-2 pt-2">
        <Button 
          variant="ghost" 
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          className="rounded-xl px-4 py-4 text-slate-400 text-xs"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Trước
        </Button>
        <button 
          className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-xl hover:bg-black transition-all active:scale-95 flex items-center gap-2 text-sm"
          onClick={handleNext}
        >
          {currentIndex === words.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
