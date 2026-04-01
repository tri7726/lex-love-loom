import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Volume2, EyeOff, Eye, RotateCcw, Loader2, Trophy, BarChart3, Clock } from 'lucide-react';
import { calculateNextReview, getQualityFromAction, getIntervalText, getMasteryPercentage, getMasteryColor } from '@/lib/srs';
import { useAI } from '@/contexts/AIContext';
import { toast } from 'sonner';

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

export const FlashcardSRS: React.FC<FlashcardSRSProps> = ({
  flashcards,
  onUpdateFlashcard,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showReading, setShowReading] = useState(false);
  const [aiTranslation, setAiTranslation] = useState<string | null>(null);
  const [sessionRatings, setSessionRatings] = useState<Record<string, string>>({});
  const [startTime] = useState(Date.now());
  const [showSummary, setShowSummary] = useState(false);
  const { analyzeText, isAnalyzing } = useAI();

  const currentCard = flashcards[currentIndex];
  const progress = ((reviewedCount / flashcards.length) * 100);
  const isLastCard = currentIndex === flashcards.length - 1;

  useEffect(() => {
    // Reset flip state when card changes
    setIsFlipped(false);
    setShowReading(false);
    setAiTranslation(null);
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
    setAiTranslation(null);
  };

  const handleAiTranslate = async () => {
    if (!currentCard || aiTranslation || isAnalyzing) return;
    
    try {
      const textToTranslate = currentCard.example_sentence || currentCard.word;
      const result = await analyzeText(textToTranslate, 'translation');
      if (result?.translation) {
        setAiTranslation(result.translation);
      }
    } catch (err) {
      toast.error('Không thể dịch lúc này');
    }
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
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        key={currentCard.id}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
      >
        <div className="relative h-96 group">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isFlipped ? 'back' : 'front'}
              initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0, scale: 0.9 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0, scale: 0.9 }}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
                damping: 25,
                opacity: { duration: 0.2 }
              }}
              className="absolute inset-0"
              style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
            >
              <Card 
                className="h-full cursor-pointer border-2 border-sakura-light/30 bg-white/80 backdrop-blur-sm hover:shadow-2xl hover:shadow-sakura/10 transition-shadow duration-500 overflow-hidden" 
                onClick={handleFlip}
              >
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-sakura-light/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-sakura-light/5 rounded-full -ml-16 -mb-16 blur-3xl pointer-events-none" />
                
                <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center relative z-10">
                  {!isFlipped ? (
                    // Front - Word
                    <motion.div 
                      className="space-y-6"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="flex flex-col items-center gap-4">
                        <h2 className="text-6xl font-bold text-sumi tracking-tight">{currentCard.word}</h2>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12 rounded-full bg-sakura-light/20 hover:bg-sakura-light text-sakura transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(currentCard.word);
                          }}
                        >
                          <Volume2 className="h-6 w-6" />
                        </Button>
                      </div>
                      
                      {currentCard.reading && (
                        <div className="relative pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-sakura-light text-sakura hover:bg-sakura-light/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowReading(!showReading);
                            }}
                          >
                            {showReading ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                            {showReading ? 'Ẩn cách đọc' : 'Hiện cách đọc'}
                          </Button>
                          <AnimatePresence>
                            {showReading && (
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-4 space-y-1"
                              >
                                <p className="text-3xl text-sakura-dark font-jp">{currentCard.reading}</p>
                                {currentCard.hanviet && (
                                  <p className="text-lg text-muted-foreground font-medium">
                                    【 {currentCard.hanviet} 】
                                  </p>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                      
                      <p className="text-muted-foreground/60 text-xs font-medium uppercase tracking-widest mt-8 animate-pulse">
                        Chạm để xem nghĩa
                      </p>
                    </motion.div>
                  ) : (
                    // Back - Meaning
                    <motion.div 
                      className="space-y-8 w-full"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-sakura uppercase tracking-widest">Ý nghĩa</p>
                        <h3 className="text-4xl font-bold text-sumi">{currentCard.meaning}</h3>
                        {currentCard.reading && (
                          <div className="pt-2">
                            <p className="text-2xl text-sakura-dark/80 font-jp">{currentCard.reading}</p>
                          </div>
                        )}
                      </div>

                      {currentCard.example_sentence && (
                        <div className="bg-sakura-light/10 p-6 rounded-2xl border border-sakura-light/20 space-y-4 shadow-inner">
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-sakura/60 uppercase tracking-widest">Ví dụ</p>
                            <p className="text-xl font-jp text-sumi leading-relaxed">{currentCard.example_sentence}</p>
                          </div>
                          {(currentCard.example_translation || aiTranslation) && (
                            <motion.p 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-base text-muted-foreground italic border-l-2 border-sakura-light pl-4 py-1"
                            >
                              {aiTranslation || currentCard.example_translation}
                            </motion.p>
                          )}
                          {!currentCard.example_translation && !aiTranslation && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => { e.stopPropagation(); handleAiTranslate(); }}
                              disabled={isAnalyzing}
                              className="h-10 px-4 text-xs text-sakura hover:text-sakura-dark hover:bg-sakura-light/30 gap-2 rounded-full border border-sakura-light/40"
                            >
                              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                              Dịch câu ví dụ với AI Sensei
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <p className="text-muted-foreground/40 text-xs font-medium uppercase tracking-widest">
                        Chạm để quay lại mặt trước
                      </p>
                    </motion.div>
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

// export default FlashcardSRS;
