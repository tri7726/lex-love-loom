import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, RotateCcw, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { VocabWord } from '@/pages/Vocabulary';

interface PronunciationGameProps {
  words: VocabWord[];
  onFinish: () => void;
}

export const PronunciationGame: React.FC<PronunciationGameProps> = ({ words, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());

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
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate completion after stopping recording
      setTimeout(() => {
        setCompletedWords((prev) => new Set([...prev, currentWord.id]));
        setIsRecording(false);
      }, 1500);
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsRecording(false);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setIsRecording(false);
  };

  const isCompleted = completedWords.has(currentWord.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={onFinish} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Thoát
        </Button>
        <div className="text-center">
          <h2 className="text-2xl font-bold">Luyện phát âm</h2>
          <p className="text-sm text-muted-foreground">{completedWords.size} / {words.length} hoàn thành</p>
        </div>
        <div className="w-20" /> {/* Spacer */}
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="shadow-elevated overflow-hidden border-sakura/20">
        <CardHeader className="bg-sakura/5 border-b border-sakura/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Từ {currentIndex + 1} / {words.length}
            </CardTitle>
            {isCompleted && (
              <CheckCircle className="h-6 w-6 text-matcha" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-8">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <p className="text-5xl font-jp font-bold text-sakura">{currentWord.word}</p>
              {currentWord.reading && (
                <p className="text-2xl text-muted-foreground font-jp">
                  {currentWord.reading}
                </p>
              )}
            </div>
            <p className="text-xl text-foreground/80">{currentWord.meaning}</p>
          </div>

          <div className="flex justify-center flex-wrap gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => speak(currentWord.word)}
              className="gap-2 border-sakura text-sakura hover:bg-sakura/10 px-8"
            >
              <Volume2 className="h-5 w-5" />
              Nghe mẫu
            </Button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleRecording}
              className={`w-28 h-28 rounded-full shadow-lg flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-destructive text-white animate-pulse shadow-destructive/40'
                  : 'bg-sakura text-white hover:bg-sakura/90 shadow-sakura/30'
              }`}
            >
              {isRecording ? (
                <MicOff className="h-12 w-12" />
              ) : (
                <Mic className="h-12 w-12" />
              )}
            </motion.button>
            <p className="text-sm font-medium text-muted-foreground">
              {isRecording ? 'Đang ghi âm... Nhấn để dừng' : 'Nhấn để bắt đầu nói'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center px-2">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          Trước đó
        </Button>
        <Button 
          className="bg-sakura hover:bg-sakura/90 text-white px-8"
          onClick={handleNext}
        >
          {currentIndex === words.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
