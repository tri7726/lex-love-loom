import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Timer, RotateCcw, ChevronLeft, Star, Sparkles, 
  Target, Zap, Music, Clock, Brain
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface VocabularyWord {
  id: string;
  word: string;
  reading: string;
  meaning: string;
}

interface MatchGameProps {
  vocabulary: VocabularyWord[];
  onUpdateMastery: (id: string, isCorrect: boolean) => void;
  onBack: () => void;
}

export type MatchGameMode = 'kanji-meaning' | 'kanji-reading' | 'reading-meaning';

interface MatchCard {
  id: string;
  content: string;
  type: 'left' | 'right';
  vocabId: string;
  matched: boolean;
}

export type ChallengeLevel = 'easy' | 'normal' | 'hard';

export const MatchGame: React.FC<MatchGameProps> = ({
  vocabulary,
  onUpdateMastery,
  onBack,
}) => {
  const [mode, setMode] = useState<MatchGameMode | null>(null);
  const [difficulty, setDifficulty] = useState<ChallengeLevel | null>(null);
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<MatchCard[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [wrongMatch, setWrongMatch] = useState<string[]>([]);
  
  // New game mechanics
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastMatchTime, setLastMatchTime] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [isMemoryModeToggle, setIsMemoryModeToggle] = useState(false);

  const getDifficultySettings = (diff: ChallengeLevel) => {
    const memory = isMemoryModeToggle || diff === 'hard';
    switch(diff) {
      case 'easy': return { pairs: 10, memory, bonus: memory ? 1.5 : 1 };
      case 'normal': return { pairs: 14, memory, bonus: memory ? 2 : 1.5 };
      case 'hard': return { pairs: 20, memory: true, bonus: 3 };
      default: return { pairs: 10, memory, bonus: 1 };
    }
  };

  const validVocabulary = useMemo(() => {
    if (!mode) return [];
    return vocabulary.filter(v => {
      if (mode === 'kanji-reading') return v.word && v.reading;
      if (mode === 'reading-meaning') return v.reading && v.meaning;
      return v.word && v.meaning;
    });
  }, [vocabulary, mode]);

  const gameWords = useMemo(() => {
    if (!difficulty) return [];
    const settings = getDifficultySettings(difficulty);
    const shuffled = [...validVocabulary].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(settings.pairs, validVocabulary.length));
  }, [validVocabulary, difficulty]);

  const initializeGame = React.useCallback(() => {
    if (!mode || !difficulty) return;
    const newCards: MatchCard[] = [];

    gameWords.forEach((word) => {
      let leftContent = '', rightContent = '';
      
      switch(mode) {
        case 'kanji-meaning':
          leftContent = word.word;
          rightContent = word.meaning;
          break;
        case 'kanji-reading':
          leftContent = word.word;
          rightContent = word.reading || '';
          break;
        case 'reading-meaning':
          leftContent = word.reading || '';
          rightContent = word.meaning;
          break;
      }

      newCards.push({
        id: `left-${word.id}`,
        content: leftContent,
        type: 'left',
        vocabId: word.id,
        matched: false,
      });
      newCards.push({
        id: `right-${word.id}`,
        content: rightContent,
        type: 'right',
        vocabId: word.id,
        matched: false,
      });
    });

    console.log("MatchGame: Initializing with words:", gameWords);
    setCards(newCards.sort(() => Math.random() - 0.5));
    setSelectedCards([]);
    setMatchedPairs(new Set());
    setAttempts(0);
    setTimeElapsed(0);
    setGameComplete(false);
    setWrongMatch([]);
    setScore(0);
    setCombo(0);
    setLastMatchTime(0);
    setBestCombo(0);
  }, [gameWords, mode, difficulty]);

  useEffect(() => {
    if (mode && difficulty) initializeGame();
  }, [mode, difficulty, initializeGame]);

  useEffect(() => {
    if (mode && difficulty && !gameComplete && cards.length > 0) {
      const timer = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, difficulty, gameComplete, cards.length]);

  const handleCardClick = (card: MatchCard) => {
    if (
      card.matched || 
      selectedCards.find((c) => c.id === card.id) || 
      selectedCards.length >= 2 || 
      wrongMatch.length > 0
    ) return;

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setAttempts((prev) => prev + 1);
      const [first, second] = newSelected;

      if (first.vocabId === second.vocabId && first.type !== second.type) {
        // Correct match
        const now = Date.now();
        const timeSinceLastMatch = now - lastMatchTime;
        const isQuickMatch = timeSinceLastMatch < 3000;
        
        const newCombo = isQuickMatch ? combo + 1 : 1;
        setCombo(newCombo);
        setBestCombo(prev => Math.max(prev, newCombo));
        setLastMatchTime(now);

        const settings = getDifficultySettings(difficulty!);
        const basePoints = 100 * settings.bonus;
        const comboBonus = newCombo * 20;
        setScore(prev => prev + basePoints + comboBonus);

        const newMatchedSet = new Set([...matchedPairs, first.vocabId]);
        setMatchedPairs(newMatchedSet);
        setCards((prev) =>
          prev.map((c) =>
            c.vocabId === first.vocabId ? { ...c, matched: true } : c
          )
        );
        onUpdateMastery(first.vocabId, true);
        setSelectedCards([]);

        if (newMatchedSet.size === gameWords.length) {
          setTimeout(() => setGameComplete(true), 500);
        }
      } else {
        // Wrong match
        setWrongMatch([first.id, second.id]);
        setCombo(0);
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

  const progress = (matchedPairs.size / Math.max(gameWords.length, 1)) * 100;

  if (!mode) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">Chọn chế độ ghép</h2>
          <p className="text-slate-400 font-medium">Luyện tập trí nhớ với các thử thách kết nối</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'kanji-reading', title: 'Kanji - Furigana', icon: Sparkles, color: 'bg-amber-500', desc: 'Ghép mặt chữ Hán với cách đọc tương ứng' },
            { id: 'kanji-meaning', title: 'Kanji - Nghĩa', icon: Star, color: 'bg-rose-500', desc: 'Ghép mặt chữ Hán với ý nghĩa tiếng Việt' },
            { id: 'reading-meaning', title: 'Furigana - Nghĩa', icon: Trophy, color: 'bg-emerald-500', desc: 'Ghép cách đọc với ý nghĩa tương ứng' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as MatchGameMode)}
              className="group relative p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-sakura transition-all hover:shadow-2xl hover:-translate-y-2 text-left space-y-4"
            >
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", m.color)}>
                <m.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 dark:text-white group-hover:text-sakura transition-colors">{m.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-center pt-8">
           <Button variant="ghost" onClick={onBack} className="rounded-2xl gap-2 text-slate-400">
             <ChevronLeft className="h-4 w-4" /> Quay lại thư viện
           </Button>
        </div>
      </div>
    );
  }

  if (!difficulty) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setMode(null)} className="rounded-full h-10 w-10">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Chọn mức độ thử thách</h2>
        </div>

        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl transition-colors",
              isMemoryModeToggle ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"
            )}>
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <Label htmlFor="memory-mode" className="text-lg font-black text-slate-800 dark:text-white cursor-pointer">Chế độ ẩn (Memory)</Label>
              <p className="text-xs text-slate-400 font-medium">Úp toàn bộ các thẻ khi bắt đầu chơi</p>
            </div>
          </div>
          <Switch 
            id="memory-mode" 
            checked={isMemoryModeToggle} 
            onCheckedChange={setIsMemoryModeToggle}
            className="data-[state=checked]:bg-sakura"
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {[
            { id: 'easy', title: 'Khởi động', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: `10 cặp • ${isMemoryModeToggle ? 'Úp mặt thẻ' : 'Hiển thị mặt chữ'} • Phù hợp người mới` },
            { id: 'normal', title: 'Thử thách', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', desc: `14 cặp • ${isMemoryModeToggle ? 'Úp mặt thẻ' : 'Hiển thị mặt chữ'} • Luyện phản xạ` },
            { id: 'hard', title: 'Bậc thầy', icon: Trophy, color: 'text-rose-500', bg: 'bg-rose-50', desc: '20 cặp • Úp mặt thẻ • Thử thách trí nhớ siêu hạng' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id as ChallengeLevel)}
              className="group flex items-center p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-sakura transition-all hover:shadow-xl hover:-translate-x-2 text-left gap-6"
            >
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner", d.bg)}>
                <d.icon className={cn("h-8 w-8", d.color)} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white group-hover:text-sakura transition-colors">{d.title}</h3>
                <p className="text-sm text-slate-400 font-medium">{d.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameComplete) {
    const accuracy = Math.round((gameWords.length / Math.max(attempts, 1)) * 100);
    const stars = accuracy >= 80 ? 3 : accuracy >= 60 ? 2 : 1;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="rounded-[3rem] border-rose-100 dark:border-slate-800 shadow-2xl overflow-hidden bg-white/70 dark:bg-slate-950/70 backdrop-blur-3xl border-2">
          <div className="h-2 w-full bg-sakura" />
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-black text-center text-slate-800 dark:text-white flex items-center justify-center gap-3">
              <Trophy className="h-8 w-8 text-amber-500 animate-bounce" />
              Hoàn thành!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-10">
            <div className="text-center">
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tổng điểm</p>
               <h2 className="text-6xl font-black text-sakura drop-shadow-sm">{score.toLocaleString()}</h2>
            </div>

            <div className="flex justify-center gap-4">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.2, type: 'spring' }}
                >
                  <Star className={cn("h-12 w-12", i < stars ? "text-amber-400 fill-amber-400" : "text-slate-100 dark:text-slate-800")} />
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Thời gian', val: formatTime(timeElapsed) },
                { label: 'Chính xác', val: `${accuracy}%` },
                { label: 'Lượt thử', val: attempts },
                { label: 'Combo nhất', val: `${bestCombo}x` }
              ].map((stat, i) => (
                <div key={i} className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xl font-black text-sakura">{stat.val}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={initializeGame} 
                className="w-full h-16 rounded-2xl bg-sakura text-white font-black text-lg shadow-xl shadow-rose-100 dark:shadow-none hover:bg-rose-600 transition-all active:scale-95"
              >
                <RotateCcw className="h-5 w-5 mr-3" />
                Chơi lại
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => { setDifficulty(null); setMode(null); }}
                className="w-full h-14 rounded-2xl text-slate-400 hover:text-slate-600 font-bold"
              >
                Đổi chế độ
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-3 rounded-3xl border border-white dark:border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => setDifficulty(null)} className="rounded-full h-10 w-10 hover:bg-rose-50 hover:text-sakura">
              <ChevronLeft className="h-6 w-6" />
           </Button>
           <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-800 dark:text-white uppercase text-[10px] tracking-[0.2em]">{mode?.replace('-', ' ↔ ')}</h3>
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-black uppercase text-sakura border-sakura/30">{difficulty}</Badge>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5 text-slate-400">
                    <Timer className="h-3.5 w-3.5" />
                    <span className="font-mono font-bold text-xs">{formatTime(timeElapsed)}</span>
                 </div>
                 <div className="w-1 h-1 rounded-full bg-slate-300" />
                 <div className="flex items-center gap-1.5 text-sakura">
                    <Zap className="h-3.5 w-3.5 fill-sakura" />
                    <span className="font-black text-xs">{score.toLocaleString()}</span>
                 </div>
              </div>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
          {combo > 1 && (
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }}
              className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-black italic animate-bounce"
            >
              {combo}x COMBO!
            </motion.div>
          )}
          <Badge className="bg-sakura text-white border-none px-4 py-1.5 rounded-full font-black text-[10px]">
            {matchedPairs.size} / {gameWords.length} CẶP
          </Badge>
        </div>
      </div>

      <div className="px-2">
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full bg-sakura"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <AnimatePresence>
          {cards.map((card) => {
            const isSelected = selectedCards.find((c) => c.id === card.id);
            const isWrong = wrongMatch.includes(card.id);
            const isMemory = difficulty === 'hard' || isMemoryModeToggle;
            const isRevealed = isSelected || isWrong || card.matched;

            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: card.matched ? 0 : 1, 
                  scale: card.matched ? 0.8 : 1,
                  y: card.matched ? -40 : 0
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  className={cn(
                    "w-full min-h-[100px] rounded-3xl border-2 transition-all duration-500 flex items-center justify-center p-4 relative overflow-hidden group/card",
                    isMemory && !isRevealed 
                      ? "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 shadow-inner" 
                      : "bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl hover:-translate-y-1.5 border-slate-50 dark:border-slate-800",
                    isSelected && "border-sakura bg-rose-50/50 dark:bg-rose-900/10 ring-4 ring-rose-50 shadow-2xl z-20",
                    isWrong && "border-red-500 bg-red-50 animate-shake",
                    card.matched && "pointer-events-none opacity-0"
                  )}
                  onClick={() => handleCardClick(card)}
                  disabled={card.matched}
                >
                  <motion.div
                    className="notranslate"
                    translate="no"
                    animate={{ 
                      scale: isMemory && !isRevealed ? 0 : 1,
                      opacity: isMemory && !isRevealed ? 0 : 1,
                      rotateY: isMemory && !isRevealed ? 180 : 0
                    }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className={cn(
                      "text-center transition-all duration-300 leading-tight",
                      isSelected ? "text-sakura scale-110 font-black" : "text-slate-700 dark:text-slate-200 font-bold",
                      card.content.length > 10 ? "text-xs" : card.content.length > 5 ? "text-base" : "text-2xl font-jp"
                    )}>
                      {card.content}
                    </p>
                  </motion.div>
                  
                  {isMemory && !isRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-2xl bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                        <Star className="h-5 w-5 text-slate-400/50 fill-slate-400/20" />
                      </div>
                    </div>
                  )}

                  {!isMemory && (
                    <div className={cn(
                      "absolute top-3 right-3 w-1.5 h-1.5 rounded-full",
                      card.type === 'left' ? "bg-rose-200" : "bg-emerald-200"
                    )} />
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex justify-center pt-8">
        <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.4em]">
          {difficulty === 'hard' || isMemoryModeToggle ? 'Memorize and clear the board' : 'Match the items to clear the board'}
        </p>
      </div>
    </div>
  );
};
