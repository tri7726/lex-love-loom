import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Trophy, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface VocabularyItem {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  mastery_level: number | null;
}

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

const MatchGame: React.FC<MatchGameProps> = ({
  vocabulary,
  onComplete,
  onUpdateMastery,
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
    return shuffled.slice(0, Math.min(6, vocabulary.length));
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
        setMatchedPairs((prev) => new Set([...prev, first.vocabId]));
        setCards((prev) =>
          prev.map((c) =>
            c.vocabId === first.vocabId ? { ...c, matched: true } : c
          )
        );
        onUpdateMastery(first.vocabId, true);
        setSelectedCards([]);

        // Check if game complete
        if (matchedPairs.size + 1 === gameWords.length) {
          setGameComplete(true);
          onComplete({
            correct: gameWords.length,
            total: attempts + 1,
          });
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
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Hoàn thành!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center gap-2">
            {[...Array(3)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.2 }}
                className={`text-4xl ${i < stars ? 'text-yellow-500' : 'text-gray-300'}`}
              >
                ★
              </motion.span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{formatTime(timeElapsed)}</p>
              <p className="text-sm text-muted-foreground">Thời gian</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{attempts}</p>
              <p className="text-sm text-muted-foreground">Lượt thử</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{accuracy}%</p>
              <p className="text-sm text-muted-foreground">Chính xác</p>
            </div>
          </div>

          <Button onClick={initializeGame} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Chơi lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Game Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Timer className="h-4 w-4" />
          <span className="font-mono">{formatTime(timeElapsed)}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Lượt: {attempts}
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Cards Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
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
                  opacity: card.matched ? 0.5 : 1, 
                  scale: 1,
                }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`cursor-pointer min-h-[80px] flex items-center justify-center transition-all ${
                    card.matched
                      ? 'bg-green-100 dark:bg-green-900/30 border-green-500'
                      : isWrong
                      ? 'bg-red-100 dark:bg-red-900/30 border-red-500 animate-shake'
                      : isSelected
                      ? 'bg-primary/10 border-primary ring-2 ring-primary'
                      : 'hover:border-primary/50 hover:shadow-md'
                  }`}
                  onClick={() => handleCardClick(card)}
                >
                  <CardContent className="p-3 text-center">
                    <p
                      className={`${
                        card.type === 'word' ? 'font-jp text-lg' : 'text-sm'
                      } ${card.matched ? 'line-through' : ''}`}
                    >
                      {card.content}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Ghép {gameWords.length} cặp từ vựng
      </div>
    </div>
  );
};

export default MatchGame;
