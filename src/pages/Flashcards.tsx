import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCcw, Volume2, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Navigation from '@/components/Navigation';

interface FlashCard {
  id: string;
  word: string;
  furigana: string;
  meaning: string;
  example: string;
  exampleMeaning: string;
}

const sampleCards: FlashCard[] = [
  {
    id: '1',
    word: '食べる',
    furigana: 'たべる',
    meaning: 'to eat',
    example: 'ご飯を食べます。',
    exampleMeaning: 'I eat rice.',
  },
  {
    id: '2',
    word: '飲む',
    furigana: 'のむ',
    meaning: 'to drink',
    example: '水を飲みます。',
    exampleMeaning: 'I drink water.',
  },
  {
    id: '3',
    word: '見る',
    furigana: 'みる',
    meaning: 'to see, to watch',
    example: 'テレビを見ます。',
    exampleMeaning: 'I watch TV.',
  },
  {
    id: '4',
    word: '聞く',
    furigana: 'きく',
    meaning: 'to listen, to hear',
    example: '音楽を聞きます。',
    exampleMeaning: 'I listen to music.',
  },
  {
    id: '5',
    word: '読む',
    furigana: 'よむ',
    meaning: 'to read',
    example: '本を読みます。',
    exampleMeaning: 'I read a book.',
  },
];

const Flashcards = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [reviewCards, setReviewCards] = useState<Set<string>>(new Set());

  const currentCard = sampleCards[currentIndex];
  const progress = ((currentIndex + 1) / sampleCards.length) * 100;

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % sampleCards.length);
    }, 200);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + sampleCards.length) % sampleCards.length);
    }, 200);
  };

  const handleKnown = () => {
    setKnownCards((prev) => new Set([...prev, currentCard.id]));
    reviewCards.delete(currentCard.id);
    setReviewCards(new Set(reviewCards));
    handleNext();
  };

  const handleReview = () => {
    setReviewCards((prev) => new Set([...prev, currentCard.id]));
    knownCards.delete(currentCard.id);
    setKnownCards(new Set(knownCards));
    handleNext();
  };

  const resetProgress = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setReviewCards(new Set());
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-display font-bold">Flashcards</h1>
            <p className="text-muted-foreground">
              Card {currentIndex + 1} of {sampleCards.length}
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span className="text-matcha">✓ Known: {knownCards.size}</span>
              <span className="text-sakura">↻ Review: {reviewCards.size}</span>
            </div>
          </div>

          {/* Flashcard */}
          <div 
            className="perspective-1000 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id + isFlipped}
                initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="min-h-[300px] shadow-elevated border-2 hover:border-sakura/30 transition-colors">
                  <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
                    {!isFlipped ? (
                      <>
                        <ruby className="text-5xl font-jp mb-4">
                          {currentCard.word}
                          <rt className="text-lg text-muted-foreground">
                            {currentCard.furigana}
                          </rt>
                        </ruby>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(currentCard.word);
                          }}
                          className="mt-4"
                        >
                          <Volume2 className="h-6 w-6" />
                        </Button>
                        <p className="text-sm text-muted-foreground mt-4">
                          Click to reveal meaning
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-semibold mb-4">
                          {currentCard.meaning}
                        </p>
                        <div className="p-4 rounded-lg bg-muted/50 w-full">
                          <p className="font-jp text-lg">{currentCard.example}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {currentCard.exampleMeaning}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(currentCard.example);
                          }}
                          className="mt-4"
                        >
                          <Volume2 className="h-6 w-6" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleReview}
              className="gap-2 border-sakura text-sakura hover:bg-sakura/10"
            >
              <X className="h-5 w-5" />
              Review Again
            </Button>
            <Button
              size="lg"
              onClick={handleKnown}
              className="gap-2 bg-matcha hover:bg-matcha/90"
            >
              <Check className="h-5 w-5" />
              I Know This
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={handlePrev} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant="ghost" onClick={resetProgress} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button variant="ghost" onClick={handleNext} className="gap-2">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Flashcards;
