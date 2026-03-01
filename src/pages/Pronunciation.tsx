import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, RotateCcw, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Navigation from '@/components/Navigation';

interface PronunciationPhrase {
  id: string;
  japanese: string;
  furigana: string;
  meaning: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const samplePhrases: PronunciationPhrase[] = [
  {
    id: '1',
    japanese: 'おはようございます',
    furigana: 'おはようございます',
    meaning: 'Good morning',
    difficulty: 'easy',
  },
  {
    id: '2',
    japanese: 'ありがとうございます',
    furigana: 'ありがとうございます',
    meaning: 'Thank you very much',
    difficulty: 'easy',
  },
  {
    id: '3',
    japanese: 'すみません',
    furigana: 'すみません',
    meaning: 'Excuse me / Sorry',
    difficulty: 'easy',
  },
  {
    id: '4',
    japanese: 'よろしくお願いします',
    furigana: 'よろしくおねがいします',
    meaning: 'Nice to meet you / Please take care of this',
    difficulty: 'medium',
  },
  {
    id: '5',
    japanese: '日本語を勉強しています',
    furigana: 'にほんごをべんきょうしています',
    meaning: 'I am studying Japanese',
    difficulty: 'medium',
  },
];

const Pronunciation = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [completedPhrases, setCompletedPhrases] = useState<Set<string>>(new Set());

  const currentPhrase = samplePhrases[currentIndex];
  const progress = ((completedPhrases.size) / samplePhrases.length) * 100;

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.7;
      speechSynthesis.speak(utterance);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real app, this would use the Web Speech API for recording
    if (isRecording) {
      // Simulate completion after stopping recording
      setTimeout(() => {
        setCompletedPhrases((prev) => new Set([...prev, currentPhrase.id]));
      }, 500);
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % samplePhrases.length);
    setIsRecording(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + samplePhrases.length) % samplePhrases.length);
    setIsRecording(false);
  };

  const resetProgress = () => {
    setCurrentIndex(0);
    setCompletedPhrases(new Set());
    setIsRecording(false);
  };

  const isCompleted = completedPhrases.has(currentPhrase.id);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-display font-bold">Pronunciation Practice</h1>
            <p className="text-muted-foreground">
              Practice speaking Japanese phrases
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completedPhrases.size} / {samplePhrases.length} completed</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Phrase Card */}
          <Card className="shadow-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Phrase {currentIndex + 1} of {samplePhrases.length}
                </CardTitle>
                {isCompleted && (
                  <CheckCircle className="h-6 w-6 text-matcha" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Japanese Text */}
              <div className="text-center space-y-2">
                <p className="text-4xl font-jp">{currentPhrase.japanese}</p>
                <p className="text-lg text-muted-foreground font-jp">
                  {currentPhrase.furigana}
                </p>
                <p className="text-lg">{currentPhrase.meaning}</p>
              </div>

              {/* Listen Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => speak(currentPhrase.japanese)}
                  className="gap-2"
                >
                  <Volume2 className="h-5 w-5" />
                  Listen
                </Button>
              </div>

              {/* Recording Button */}
              <div className="flex justify-center">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleRecording}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-destructive text-destructive-foreground animate-pulse'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="h-10 w-10" />
                  ) : (
                    <Mic className="h-10 w-10" />
                  )}
                </motion.button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
              </p>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={handlePrev}>
              Previous
            </Button>
            <Button variant="ghost" onClick={resetProgress} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button variant="ghost" onClick={handleNext}>
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pronunciation;
