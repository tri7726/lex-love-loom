import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Trophy, RotateCcw, ChevronLeft, Sparkles, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { VocabularyItem } from '@/types/vocabulary';

interface MatchGameProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

interface MatchCard {
  id: string;
  content: string;
  type: 'word' | 'meaning';
  vocabId: string;
  matched: boolean;
}

export const MatchGame: React.FC<MatchGameProps> = ({
  vocabulary,
  onComplete,
  onUpdateMastery,
  onBack,
}) => {
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<MatchCard[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [wrongMatch, setWrongMatch] = useState<string[]>([]);

  // Get 6 random words for the game
  const gameWords = useMemo(() => {
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(8, vocabulary.length));
  }, [vocabulary]);

  useEffect(() => {
    initializeGame();
  }, [gameWords]);

  useEffect(() => {
    if (!gameComplete && cards.length > 0) {
      const timer = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameComplete, cards.length]);

  const initializeGame = () => {
    const newCards: MatchCard[] = [];

    gameWords.forEach((word) => {
      // Japanese word card
      newCards.push({
        id: `word-${word.id}`,
        content: word.word,
        type: 'word',
        vocabId: word.id,
        matched: false,
      });
      // Meaning card
      newCards.push({
        id: `meaning-${word.id}`,
        content: word.meaning,
        type: 'meaning',
        vocabId: word.id,
        matched: false,
      });
    });

    // Shuffle cards
    setCards(newCards.sort(() => Math.random() - 0.5));
    setSelectedCards([]);
    setMatchedPairs(new Set());
    setAttempts(0);
    setTimeElapsed(0);
    setGameComplete(false);
    setWrongMatch([]);
  };

  const handleCardClick = (card: MatchCard) => {
    if (
      card.matched ||
      selectedCards.find((c) => c.id === card.id) ||
      selectedCards.length >= 2 ||
      wrongMatch.length > 0
    ) {
      return;
    }

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setAttempts((prev) => prev + 1);
      const [first, second] = newSelected;

      if (first.vocabId === second.vocabId && first.type !== second.type) {
        // Match found!
        const newMatchedSet = new Set([...matchedPairs, first.vocabId]);
        setMatchedPairs(newMatchedSet);
        setCards((prev) =>
          prev.map((c) =>
            c.vocabId === first.vocabId ? { ...c, matched: true } : c
          )
        );
        onUpdateMastery(first.vocabId, true);
        setSelectedCards([]);

        // Check if game complete
        if (newMatchedSet.size === gameWords.length) {
          setTimeout(() => {
            setGameComplete(true);
            onComplete({
              correct: gameWords.length,
              total: attempts + 1,
            });
          }, 500);
        }
      } else {
        // Wrong match
        setWrongMatch([first.id, second.id]);
        onUpdateMastery(first.vocabId, false);
        setTimeout(() => {
          setSelectedCards([]);
          setWrongMatch([]);
        }, 800);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (matchedPairs.size / gameWords.length) * 100;

  if (gameComplete) {
    const accuracy = Math.round((gameWords.length / attempts) * 100);
    const stars = accuracy >= 80 ? 3 : accuracy >= 60 ? 2 : 1;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-0 shadow-2xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50">
          <div className="h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-display font-bold text-center text-indigo-900 flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-amber-500" />
              Hoàn thành!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <div className="flex justify-center gap-3">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.2, type: 'spring' }}
                >
                  <Star className={cn("h-12 w-12", i < stars ? "text-amber-400 fill-amber-400" : "text-gray-200")} />
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/60 p-4 rounded-2xl border border-indigo-100 text-center">
                <p className="text-xl font-bold text-indigo-700">{formatTime(timeElapsed)}</p>
                <p className="text-[10px] text-indigo-400 uppercase font-bold">Thời gian</p>
              </div>
              <div className="bg-white/60 p-4 rounded-2xl border border-indigo-100 text-center">
                <p className="text-xl font-bold text-indigo-700">{attempts}</p>
                <p className="text-[10px] text-indigo-400 uppercase font-bold">Lượt thử</p>
              </div>
              <div className="bg-white/60 p-4 rounded-2xl border border-indigo-100 text-center">
                <p className="text-xl font-bold text-indigo-700">{accuracy}%</p>
                <p className="text-[10px] text-indigo-400 uppercase font-bold">Chính xác</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={initializeGame} 
                className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-2xl py-6 text-lg font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                <RotateCcw className="h-5 w-5 inline-block mr-2" />
                Chơi lại
              </button>
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="w-full text-indigo-500 hover:bg-indigo-50 rounded-2xl py-6"
              >
                Quay lại
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Game Header */}
      <div className="flex justify-between items-center px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 shadow-sm">
            <Timer className="h-4 w-4 text-indigo-500" />
            <span className="font-mono font-bold text-indigo-700 text-lg">{formatTime(timeElapsed)}</span>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100 shadow-sm">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-amber-700">Lượt thử: {attempts}</span>
          </div>
        </div>
        
        <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 px-4 py-1.5 rounded-full font-bold">
          {matchedPairs.size} / {gameWords.length} cặp
        </Badge>
      </div>

      <div className="px-4">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-indigo-400 to-purple-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
        <AnimatePresence>
          {cards.map((card) => {
            const isSelected = selectedCards.find((c) => c.id === card.id);
            const isWrong = wrongMatch.includes(card.id);

            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: card.matched ? 0 : 1, 
                  scale: card.matched ? 0.8 : 1,
                  y: card.matched ? -20 : 0
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  className={cn(
                    "w-full min-h-[120px] rounded-3xl border-2 transition-all duration-300 flex items-center justify-center p-4 relative overflow-hidden",
                    "bg-white shadow-card hover:shadow-elevated hover:-translate-y-1",
                    isSelected && "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100 shadow-lg z-10",
                    isWrong && "border-red-500 bg-red-50 animate-shake",
                    card.matched && "pointer-events-none"
                  )}
                  onClick={() => handleCardClick(card)}
                  disabled={card.matched}
                >
                  <p className={cn(
                    "text-center transition-all duration-300",
                    card.type === 'word' ? 'font-jp text-2xl font-bold text-indigo-900' : 'text-base font-medium text-slate-600',
                    isSelected && "text-indigo-700"
                  )}>
                    {card.content}
                  </p>
                  
                  {/* Decorative background for type */}
                  <div className={cn(
                    "absolute bottom-2 right-3 text-[10px] font-bold uppercase tracking-tighter opacity-20",
                    card.type === 'word' ? 'text-indigo-500' : 'text-slate-500'
                  )}>
                    {card.type === 'word' ? 'JP' : 'VN'}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-4 pt-4">
        <p className="text-sm text-slate-400 font-medium">
          Ghép từ vựng tiếng Nhật với ý nghĩa tương ứng
        </p>
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="text-muted-foreground gap-2 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Dừng trò chơi
        </Button>
      </div>
    </div>
  );
};
