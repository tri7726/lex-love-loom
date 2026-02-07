import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Volume2, EyeOff, Eye, RotateCcw } from 'lucide-react';
import { calculateNextReview, getQualityFromAction, getIntervalText, getMasteryPercentage, getMasteryColor } from '@/lib/srs';

interface Flashcard {
  id: string;
  word: string;
  reading: string | null;
  hanviet: string | null;
  meaning: string;
  example_sentence: string | null;
  example_translation: string | null;
  jlpt_level: string | null;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at: string | null;
}

interface FlashcardSRSProps {
  flashcards: Flashcard[];
  onUpdateFlashcard: (id: string, updates: Partial<Flashcard>) => void | Promise<void>;
  onComplete: () => void;
}

const FlashcardSRS: React.FC<FlashcardSRSProps> = ({
  flashcards,
  onUpdateFlashcard,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showReading, setShowReading] = useState(false);

  const currentCard = flashcards[currentIndex];
  const progress = ((reviewedCount / flashcards.length) * 100);
  const isLastCard = currentIndex === flashcards.length - 1;

  useEffect(() => {
    // Reset flip state when card changes
    setIsFlipped(false);
    setShowReading(false);
  }, [currentIndex]);

  const handleRating = async (action: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;

    const quality = getQualityFromAction(action);
    const srsData = calculateNextReview(
      quality,
      currentCard.ease_factor,
      currentCard.interval,
      currentCard.repetitions
    );

    await onUpdateFlashcard(currentCard.id, {
      ease_factor: srsData.easeFactor,
      interval: srsData.interval,
      repetitions: srsData.repetitions,
      next_review_date: srsData.nextReviewDate.toISOString(),
      last_reviewed_at: new Date().toISOString(),
    });

    setReviewedCount(prev => prev + 1);

    if (isLastCard) {
      setTimeout(() => onComplete(), 500);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      window.speechSynthesis.speak(utterance);
    }
  };

  const restartReview = () => {
    setCurrentIndex(0);
    setReviewedCount(0);
    setIsFlipped(false);
  };

  if (flashcards.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Good job!</h3>
          <p className="text-muted-foreground">No flashcards due for review right now.</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentCard) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Card {reviewedCount + 1} of {flashcards.length}
          </span>
          <span className={getMasteryColor(currentCard.repetitions)}>
            Mastery: {getMasteryPercentage(currentCard.repetitions)}%
          </span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Card Info */}
      <div className="flex gap-2 justify-center flex-wrap">
        {currentCard.jlpt_level && (
          <Badge variant="secondary">{currentCard.jlpt_level}</Badge>
        )}
        <Badge variant="outline">
          Next: {getIntervalText(currentCard.interval)}
        </Badge>
        <Badge variant="outline">
          Reviews: {currentCard.repetitions}
        </Badge>
      </div>

      {/* Flashcard */}
      <motion.div
        className="perspective-1000"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={currentCard.id}
      >
        <div className="relative h-96">
          <AnimatePresence mode="wait">
            <motion.div
              key={isFlipped ? 'back' : 'front'}
              initial={{ rotateY: isFlipped ? -180 : 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: isFlipped ? 180 : -180, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <Card className="h-full cursor-pointer hover:shadow-lg transition-all" onClick={handleFlip}>
                <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center">
                  {!isFlipped ? (
                    // Front - Word
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 justify-center">
                        <h2 className="text-5xl font-bold">{currentCard.word}</h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(currentCard.word);
                          }}
                        >
                          <Volume2 className="h-5 w-5" />
                        </Button>
                      </div>
                      
                      {currentCard.reading && (
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowReading(!showReading);
                            }}
                          >
                            {showReading ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                            {showReading ? 'Hide' : 'Show'} Reading
                          </Button>
                          {showReading && (
                            <div className="mt-2 space-y-1">
                              <p className="text-2xl text-muted-foreground">{currentCard.reading}</p>
                              {currentCard.hanviet && (
                                <p className="text-lg text-muted-foreground">
                                  ({currentCard.hanviet})
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <p className="text-muted-foreground text-sm">Click to see meaning</p>
                    </div>
                  ) : (
                    // Back - Meaning
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-3xl font-bold mb-2">{currentCard.meaning}</h3>
                        {currentCard.reading && (
                          <div className="space-y-1">
                            <p className="text-xl text-muted-foreground">{currentCard.reading}</p>
                            {currentCard.hanviet && (
                              <p className="text-lg text-muted-foreground">
                                ({currentCard.hanviet})
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {currentCard.example_sentence && (
                        <div className="border-t pt-4 space-y-2">
                          <p className="text-lg">{currentCard.example_sentence}</p>
                          {currentCard.example_translation && (
                            <p className="text-sm text-muted-foreground">
                              {currentCard.example_translation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Rating Buttons (only show when flipped) */}
      {isFlipped && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-2"
        >
          <Button
            variant="outline"
            className="flex-col h-auto py-3 border-red-500 hover:bg-red-50"
            onClick={() => handleRating('again')}
          >
            <span className="text-sm font-semibold">Again</span>
            <span className="text-xs text-muted-foreground">1 day</span>
          </Button>
          <Button
            variant="outline"
            className="flex-col h-auto py-3 border-orange-500 hover:bg-orange-50"
            onClick={() => handleRating('hard')}
          >
            <span className="text-sm font-semibold">Hard</span>
            <span className="text-xs text-muted-foreground">
              {getIntervalText(Math.round(currentCard.interval * 1.2))}
            </span>
          </Button>
          <Button
            variant="outline"
            className="flex-col h-auto py-3 border-green-500 hover:bg-green-50"
            onClick={() => handleRating('good')}
          >
            <span className="text-sm font-semibold">Good</span>
            <span className="text-xs text-muted-foreground">
              {getIntervalText(Math.round(currentCard.interval * currentCard.ease_factor))}
            </span>
          </Button>
          <Button
            variant="outline"
            className="flex-col h-auto py-3 border-blue-500 hover:bg-blue-50"
            onClick={() => handleRating('easy')}
          >
            <span className="text-sm font-semibold">Easy</span>
            <span className="text-xs text-muted-foreground">
              {getIntervalText(Math.round(currentCard.interval * currentCard.ease_factor * 1.3))}
            </span>
          </Button>
        </motion.div>
      )}

      {/* Restart Button (when completed) */}
      {reviewedCount === flashcards.length && (
        <div className="text-center">
          <Button onClick={restartReview} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Review Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default FlashcardSRS;
