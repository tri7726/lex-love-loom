import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Volume2, EyeOff, Eye, RotateCcw, Loader2, Trophy, BarChart3, Clock, Flame, Star, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { calculateNextReview, getQualityFromAction, getIntervalText, getMasteryPercentage, getMasteryColor } from '@/lib/srs';
import { useAI } from '@/contexts/AIContext';
import { toast } from 'sonner';
import { useConfetti } from '@/hooks/useConfetti';
import { cn } from '@/lib/utils';

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

const RATING_CONFIG = [
  { action: 'again' as const, label: 'Quên', sublabel: '1 ngày', color: 'border-red-400 hover:bg-red-50 text-red-600', icon: '😓', key: '1' },
  { action: 'hard' as const, label: 'Khó', sublabel: '', color: 'border-amber-400 hover:bg-amber-50 text-amber-600', icon: '😤', key: '2' },
  { action: 'good' as const, label: 'Tốt', sublabel: '', color: 'border-emerald-400 hover:bg-emerald-50 text-emerald-600', icon: '😊', key: '3' },
  { action: 'easy' as const, label: 'Dễ', sublabel: '', color: 'border-sky-400 hover:bg-sky-50 text-sky-600', icon: '🎯', key: '4' },
];

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
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [cardTimer, setCardTimer] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const { analyzeText, isAnalyzing } = useAI();
  const confetti = useConfetti();
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Swipe support
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const currentCard = flashcards[currentIndex];
  const progress = ((reviewedCount / flashcards.length) * 100);
  const isLastCard = currentIndex === flashcards.length - 1;

  // Card timer
  useEffect(() => {
    setCardTimer(0);
    timerRef.current = setInterval(() => setCardTimer(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex]);

  useEffect(() => {
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

    // Streak logic
    if (action === 'good' || action === 'easy') {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak(Math.max(bestStreak, newStreak));
      setTotalCorrect(c => c + 1);
      if (newStreak === 5) {
        toast.success('🔥 5 thẻ liên tiếp! Tuyệt vời!');
        confetti.fire('success');
      } else if (newStreak === 10) {
        toast.success('⚡ 10 thẻ liên tiếp! Xuất sắc!');
        confetti.fire('school');
      }
    } else {
      setStreak(0);
    }

    await onUpdateFlashcard(currentCard.id, {
      ease_factor: srsData.easeFactor,
      interval: srsData.interval,
      repetitions: srsData.repetitions,
      next_review_date: srsData.nextReviewDate.toISOString(),
      last_reviewed_at: new Date().toISOString(),
    });

    setSessionRatings(prev => ({ ...prev, [currentCard.id]: action }));
    setReviewedCount(prev => prev + 1);

    if (isLastCard) {
      setShowSummary(true);
      setTimeout(() => {
        confetti.fire('school');
      }, 500);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 80) return;
    if (!isFlipped) { handleFlip(); return; }
    if (info.offset.x > 80) handleRating('good');
    else if (info.offset.x < -80) handleRating('again');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSummary) return;
      switch(e.key) {
        case ' ':
          e.preventDefault();
          setIsFlipped(prev => !prev);
          break;
        case '1': if (isFlipped) handleRating('again'); break;
        case '2': if (isFlipped) handleRating('hard'); break;
        case '3': if (isFlipped) handleRating('good'); break;
        case '4': if (isFlipped) handleRating('easy'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentCard, showSummary]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const restartReview = () => {
    setCurrentIndex(0);
    setReviewedCount(0);
    setIsFlipped(false);
    setAiTranslation(null);
    setStreak(0);
    setTotalCorrect(0);
  };

  const handleAiTranslate = async () => {
    if (!currentCard || aiTranslation || isAnalyzing) return;
    try {
      const textToTranslate = currentCard.example_sentence || currentCard.word;
      const result = await analyzeText(textToTranslate, 'translation');
      if (result?.translation) setAiTranslation(result.translation);
    } catch {
      toast.error('Không thể dịch lúc này');
    }
  };

  const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);
  const accuracy = reviewedCount > 0 ? Math.round((totalCorrect / reviewedCount) * 100) : 0;

  if (flashcards.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-primary/10">
        <CardContent className="py-16 text-center space-y-4">
          <div className="h-20 w-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold">Tuyệt vời! 🎉</h3>
          <p className="text-muted-foreground">Không có thẻ nào cần ôn tập ngay bây giờ.</p>
          <p className="text-xs text-muted-foreground">Quay lại sau để tiếp tục duy trì streak nhé!</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Top Stats Bar */}
      <div className="flex items-center justify-between bg-card/80 backdrop-blur-sm rounded-2xl p-3 px-5 border border-border/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-bold text-muted-foreground">{cardTimer}s</span>
          </div>
          {streak > 0 && (
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="flex items-center gap-1 bg-orange-500/10 px-2.5 py-1 rounded-full"
            >
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs font-black text-orange-600">{streak}</span>
            </motion.div>
          )}
        </div>
        <div className="text-xs font-bold text-muted-foreground">
          {reviewedCount}/{flashcards.length}
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-primary">{accuracy}%</span>
        </div>
      </div>

      {/* Progress with segments */}
      <div className="flex gap-0.5">
        {flashcards.map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              i < reviewedCount && sessionRatings[flashcards[i].id] === 'easy' && "bg-sky-400",
              i < reviewedCount && sessionRatings[flashcards[i].id] === 'good' && "bg-emerald-400",
              i < reviewedCount && sessionRatings[flashcards[i].id] === 'hard' && "bg-amber-400",
              i < reviewedCount && sessionRatings[flashcards[i].id] === 'again' && "bg-red-400",
              i === reviewedCount && "bg-primary/30 animate-pulse",
              i > reviewedCount && "bg-muted"
            )} 
          />
        ))}
      </div>

      {/* Card Badges */}
      <div className="flex gap-2 justify-center flex-wrap">
        {currentCard.jlpt_level && (
          <Badge variant="secondary" className="font-bold">{currentCard.jlpt_level}</Badge>
        )}
        <Badge variant="outline" className="gap-1">
          <Star className="h-3 w-3" />
          {getMasteryPercentage(currentCard.repetitions)}%
        </Badge>
        <Badge variant="outline" className="text-muted-foreground">
          → {getIntervalText(currentCard.interval)}
        </Badge>
      </div>

      {/* Flashcard with Swipe */}
      <motion.div
        style={{ x, rotate, opacity }}
        drag={isFlipped ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        className="touch-none"
      >
        <motion.div
          className="perspective-1000"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          key={currentCard.id}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
        >
          <div className="relative h-[420px] group">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isFlipped ? 'back' : 'front'}
                initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30, opacity: { duration: 0.15 } }}
                className="absolute inset-0"
                style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
              >
                <Card 
                  className={cn(
                    "h-full cursor-pointer border-2 bg-card/95 backdrop-blur-md hover:shadow-2xl transition-all duration-500 overflow-hidden rounded-3xl",
                    !isFlipped ? "border-primary/20 hover:border-primary/40" : "border-emerald-200 hover:border-emerald-300"
                  )} 
                  onClick={handleFlip}
                >
                  {/* Decorative */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/3 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full -ml-16 -mb-16 blur-3xl pointer-events-none" />
                  
                  <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center relative z-10">
                    {!isFlipped ? (
                      <motion.div className="space-y-6" initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ delay: 0.05 }}>
                        <div className="flex flex-col items-center gap-5">
                          <h2 className="text-6xl md:text-7xl font-bold text-foreground tracking-tight font-jp">{currentCard.word}</h2>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-14 w-14 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-110"
                            onClick={(e) => { e.stopPropagation(); speak(currentCard.word); }}
                          >
                            <Volume2 className="h-7 w-7" />
                          </Button>
                        </div>
                        
                        {currentCard.reading && (
                          <div className="pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full border-primary/30 text-primary hover:bg-primary/5 gap-2"
                              onClick={(e) => { e.stopPropagation(); setShowReading(!showReading); }}
                            >
                              {showReading ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              {showReading ? 'Ẩn' : 'Cách đọc'}
                            </Button>
                            <AnimatePresence>
                              {showReading && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -10, height: 0 }}
                                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                                  exit={{ opacity: 0, y: -10, height: 0 }}
                                  className="mt-4 space-y-1 overflow-hidden"
                                >
                                  <p className="text-3xl text-primary/80 font-jp">{currentCard.reading}</p>
                                  {currentCard.hanviet && (
                                    <p className="text-base text-muted-foreground font-medium">
                                      【{currentCard.hanviet}】
                                    </p>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                        
                        <p className="text-muted-foreground/50 text-xs font-medium uppercase tracking-[0.2em] mt-8">
                          Chạm hoặc Space để lật
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div className="space-y-6 w-full" initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ delay: 0.05 }}>
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Ý nghĩa</p>
                          <h3 className="text-3xl md:text-4xl font-bold text-foreground">{currentCard.meaning}</h3>
                          {currentCard.reading && (
                            <p className="text-xl text-primary/70 font-jp">{currentCard.reading}</p>
                          )}
                        </div>

                        {currentCard.example_sentence && (
                          <div className="bg-muted/50 p-5 rounded-2xl border border-border/50 space-y-3 text-left">
                            <p className="text-[10px] font-bold text-primary/50 uppercase tracking-[0.2em]">Ví dụ</p>
                            <p className="text-lg font-jp text-foreground leading-relaxed">{currentCard.example_sentence}</p>
                            {(currentCard.example_translation || aiTranslation) && (
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="text-sm text-muted-foreground italic border-l-2 border-primary/20 pl-3 py-0.5"
                              >
                                {aiTranslation || currentCard.example_translation}
                              </motion.p>
                            )}
                            {!currentCard.example_translation && !aiTranslation && (
                              <Button variant="ghost" size="sm"
                                onClick={(e) => { e.stopPropagation(); handleAiTranslate(); }}
                                disabled={isAnalyzing}
                                className="h-8 text-xs text-primary hover:text-primary gap-1.5 rounded-full"
                              >
                                {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                Dịch với AI
                              </Button>
                            )}
                          </div>
                        )}
                        
                        <p className="text-muted-foreground/30 text-[10px] uppercase tracking-[0.2em]">
                          ← Vuốt trái: Quên · Vuốt phải: Nhớ →
                        </p>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      {/* Rating Buttons */}
      {isFlipped && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-4 gap-2">
            {RATING_CONFIG.map((r) => (
              <Button
                key={r.action}
                variant="outline"
                className={cn("flex-col h-auto py-3 rounded-2xl transition-all hover:scale-[1.02]", r.color)}
                onClick={() => handleRating(r.action)}
              >
                <span className="text-lg mb-0.5">{r.icon}</span>
                <span className="text-xs font-bold">{r.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {r.action === 'again' ? '1 ngày' : 
                   r.action === 'hard' ? getIntervalText(Math.round(currentCard.interval * 1.2)) :
                   r.action === 'good' ? getIntervalText(Math.round(currentCard.interval * currentCard.ease_factor)) :
                   getIntervalText(Math.round(currentCard.interval * currentCard.ease_factor * 1.3))}
                </span>
              </Button>
            ))}
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2 font-mono">
            ⌨️ 1 = Quên · 2 = Khó · 3 = Tốt · 4 = Dễ
          </p>
        </motion.div>
      )}

      {/* Session Summary */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <Card className="w-full max-w-md border-2 border-primary/20 shadow-2xl rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ delay: 0.2, type: "spring" }}
                    className="h-20 w-20 mx-auto rounded-full bg-primary/15 flex items-center justify-center"
                  >
                    <Trophy className="h-10 w-10 text-primary" />
                  </motion.div>
                  
                  <div>
                    <h3 className="text-2xl font-bold mb-1">Phiên ôn tập hoàn thành! 🎉</h3>
                    <p className="text-sm text-muted-foreground">
                      {flashcards.length} thẻ · {elapsedMinutes || '<1'} phút · {accuracy}% chính xác
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-card/80 rounded-2xl p-3 space-y-1">
                      <Flame className="h-5 w-5 mx-auto text-orange-500" />
                      <p className="text-2xl font-black text-orange-600">{bestStreak}</p>
                      <p className="text-[10px] text-muted-foreground font-bold">Best Streak</p>
                    </div>
                    <div className="bg-card/80 rounded-2xl p-3 space-y-1">
                      <Zap className="h-5 w-5 mx-auto text-primary" />
                      <p className="text-2xl font-black text-primary">{accuracy}%</p>
                      <p className="text-[10px] text-muted-foreground font-bold">Accuracy</p>
                    </div>
                    <div className="bg-card/80 rounded-2xl p-3 space-y-1">
                      <Clock className="h-5 w-5 mx-auto text-muted-foreground" />
                      <p className="text-2xl font-black">{elapsedMinutes || '<1'}</p>
                      <p className="text-[10px] text-muted-foreground font-bold">Phút</p>
                    </div>
                  </div>

                  {/* Rating Breakdown */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Quên', count: Object.values(sessionRatings).filter(r => r === 'again').length, icon: '😓', bg: 'bg-red-50 text-red-600' },
                      { label: 'Khó', count: Object.values(sessionRatings).filter(r => r === 'hard').length, icon: '😤', bg: 'bg-amber-50 text-amber-600' },
                      { label: 'Tốt', count: Object.values(sessionRatings).filter(r => r === 'good').length, icon: '😊', bg: 'bg-emerald-50 text-emerald-600' },
                      { label: 'Dễ', count: Object.values(sessionRatings).filter(r => r === 'easy').length, icon: '🎯', bg: 'bg-sky-50 text-sky-600' },
                    ].map(stat => (
                      <div key={stat.label} className={cn("rounded-xl p-2.5", stat.bg)}>
                        <p className="text-lg">{stat.icon}</p>
                        <p className="text-xl font-black">{stat.count}</p>
                        <p className="text-[9px] font-bold opacity-70">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1 gap-2 rounded-xl h-12"
                      onClick={() => { setShowSummary(false); restartReview(); setSessionRatings({}); }}
                    >
                      <RotateCcw className="h-4 w-4" /> Ôn lại
                    </Button>
                    <Button className="flex-1 rounded-xl h-12 font-bold"
                      onClick={() => { setShowSummary(false); onComplete(); }}
                    >
                      Hoàn thành ✨
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {reviewedCount === flashcards.length && !showSummary && (
        <div className="text-center">
          <Button onClick={restartReview} className="gap-2 rounded-xl">
            <RotateCcw className="h-4 w-4" /> Ôn lại
          </Button>
        </div>
      )}
    </div>
  );
};
