import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, X, Trophy, AlertCircle, CheckCircle2, Timer, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { DuelQuestion, DuelQuestionData } from './DuelQuestion';
import { useDuelChannel } from '@/hooks/useDuelChannel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useXP } from '@/hooks/useXP';
import { useConfetti } from '@/hooks/useConfetti';
import { useToast } from '@/hooks/use-toast';
import { VocabularyItem } from '@/types/vocabulary';
import { MINNA_N5_VOCAB } from '@/data/minna-n5';
import { MINNA_N4_VOCAB } from '@/data/minna-n4';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildQuestions(vocabPool: VocabularyItem[], count = 6): DuelQuestionData[] {
  const pool = shuffle(vocabPool).slice(0, count);
  // Flatten all words to use as potential distractors
  const allMeanings = vocabPool.map(w => w.meaning).filter(Boolean);
  
  return pool.map((w) => {
    const wrong = shuffle(allMeanings.filter((m) => m !== w.meaning)).slice(0, 3);
    // If we don't have enough dynamic distractors, use some generic ones
    while (wrong.length < 3) {
      const generic = shuffle(['Nước', 'Lửa', 'Núi', 'Cây', 'Sông']).find(g => g !== w.meaning && !wrong.includes(g));
      if (generic) wrong.push(generic);
      else break;
    }
    
    return { 
      word: w.word, 
      reading: w.reading, 
      correct: w.meaning,
      options: shuffle([w.meaning, ...wrong]) 
    };
  });
}

const calcScore = (timeLeft: number, maxTime = 10) => Math.round(100 * (timeLeft / maxTime));

// ─── Types ────────────────────────────────────────────────────────────────────
type DuelPhase = 'waiting' | 'countdown' | 'playing' | 'finished';

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  topic: string;
  opponent_profile?: { display_name: string | null; avatar_url: string | null } | null;
  challenger_profile?: { display_name: string | null; avatar_url: string | null } | null;
}

interface DuelRoomProps {
  challenge: Challenge;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const DuelRoom = ({ challenge, onClose }: DuelRoomProps) => {
  const { user } = useAuth();
  const { awardXP } = useXP();
  const { fire } = useConfetti();
  const userId = user?.id ?? '';

  const isChallenger = challenge.challenger_id === userId;
  const opponentProfile = isChallenger ? challenge.opponent_profile : challenge.challenger_profile;
  const opponentName = opponentProfile?.display_name ?? 'Đối thủ';
  const opponentAvatar = opponentProfile?.avatar_url ?? '';

  const { duelState, broadcastAnswer, isConnected } = useDuelChannel(challenge.id, userId);
  const [phase, setPhase] = useState<DuelPhase>('waiting');
  const [countdown, setCountdown] = useState(3);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [questions, setQuestions] = useState<DuelQuestionData[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Build questions from topic
  useEffect(() => {
    const initQuestions = () => {
      let topicStr = challenge.topic;
      try {
        if (topicStr.startsWith('{')) {
          topicStr = JSON.parse(topicStr).topic || topicStr;
        }
      } catch (e) {}

      let vocabPool: VocabularyItem[] = [];
      const chapterMatch = topicStr.match(/(\d+)/);
      const isN4 = topicStr.toUpperCase().includes('N4');
      const minnaPool = isN4 ? MINNA_N4_VOCAB : MINNA_N5_VOCAB;

      if (chapterMatch) {
        const chapterIdx = parseInt(chapterMatch[1]) - 1;
        if (minnaPool[chapterIdx]) {
          vocabPool = minnaPool[chapterIdx];
        }
      }

      if (vocabPool.length < 6) {
        // Just Use standard pool if no chapter match or not enough words
        vocabPool = minnaPool.flat();
      }

      setQuestions(buildQuestions(vocabPool, 6));
      setLoadingQuestions(false);
    };

    initQuestions();
  }, [challenge.topic]);

  // Waiting → Countdown when opponent connects
  useEffect(() => {
    if (phase === 'waiting' && duelState.opponentConnected) {
      setPhase('countdown');
    }
  }, [duelState.opponentConnected, phase]);

  // Countdown 3→0 → playing
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) { setPhase('playing'); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const handleAnswer = useCallback(
    (correct: boolean, timeLeft: number) => {
      const score = correct ? calcScore(timeLeft) : 0;
      broadcastAnswer(questionIdx, score);

        if (questionIdx + 1 >= questions.length) {
        setPhase('finished');
        const myScore = duelState.myScore + score;
        const opponentScore = duelState.opponentScore;
        
        // DRAW REFUND logic: winner_id is null if scores are equal
        let winnerId = null;
        if (myScore > opponentScore) {
          winnerId = userId;
        } else if (opponentScore > myScore) {
          winnerId = isChallenger ? challenge.opponent_id : challenge.challenger_id;
        }

        // Update result in DB
        const updateChallenge = async () => {
          try {
            await supabase
              .from('challenges')
              .update({
                challenger_score: isChallenger ? myScore : opponentScore,
                opponent_score: isChallenger ? opponentScore : myScore,
                winner_id: winnerId,
                status: 'completed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', challenge.id);
          } catch (err) {
            console.error('Error updating challenge result:', err);
          }
        };

        updateChallenge();

        // XP bonus for winner/loser/draw
        let bet = 0;
        try {
          const topicObj = JSON.parse(challenge.topic);
          bet = topicObj.bet || 0;
        } catch (e) {}

        const winBonus = 50 + bet;
        const drawBonus = 20 + (bet > 0 ? bet : 0); // refund bet + base
        const lossBonus = 10;

        if (winnerId === userId) {
          awardXP('duel_win', winBonus, { challenge_id: challenge.id });
          fire('school');
        } else if (winnerId === null) {
          // Draw - refund the bet
          awardXP('duel_draw', drawBonus, { challenge_id: challenge.id });
        } else {
          awardXP('duel_loss', lossBonus, { challenge_id: challenge.id });
        }
      } else {
        setQuestionIdx((i) => i + 1);
      }
    },
    [questionIdx, questions.length, broadcastAnswer, duelState, userId, isChallenger, challenge]
  );

  const myFinalScore = duelState.myScore;
  const opponentFinalScore = duelState.opponentScore;
  const won = myFinalScore > opponentFinalScore;
  const draw = myFinalScore === opponentFinalScore;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-400" />}
          <span>{isConnected ? 'Đã kết nối' : 'Đang kết nối...'}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-6 gap-6">
        {/* Score bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-center">
            <p className="text-xs font-black uppercase text-muted-foreground mb-1">Bạn</p>
            <p className="text-3xl font-black text-primary">{duelState.myScore}</p>
          </div>
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden flex">
            <motion.div
              animate={{ width: `${myFinalScore + opponentFinalScore > 0 ? (myFinalScore / (myFinalScore + opponentFinalScore)) * 100 : 50}%` }}
              className="h-full bg-primary"
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-black uppercase text-secondary mb-1">{opponentName}</p>
            <p className="text-3xl font-black text-secondary">{duelState.opponentScore}</p>
          </div>
        </div>

        {/* Rival Progress Bars */}
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1">
             <div className="flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground mr-1">
               <span>Tiến độ của bạn</span>
               <span>{duelState.myQuestion}/{questions.length}</span>
             </div>
             <Progress value={(duelState.myQuestion / questions.length) * 100} className="h-1.5" />
           </div>
           <div className="space-y-1">
             <div className="flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground ml-1">
               <span>{opponentName}</span>
               <span>{duelState.opponentQuestion}/{questions.length}</span>
             </div>
             <Progress value={(duelState.opponentQuestion / questions.length) * 100} className="h-1.5" indicatorClassName="bg-secondary" />
           </div>
        </div>

        {/* Progress */}
        {phase === 'playing' && (
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-colors',
                  i < questionIdx ? 'bg-primary' : i === questionIdx ? 'bg-primary/50' : 'bg-muted'
                )}
              />
            ))}
          </div>
        )}

        {/* Phase content */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {phase === 'waiting' && (
              <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="font-bold text-lg">Chờ đối thủ tham gia...</p>
                <div className="flex items-center justify-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={opponentAvatar} />
                    <AvatarFallback>{opponentName[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-muted-foreground">{opponentName}</p>
                </div>
              </motion.div>
            )}

            {phase === 'countdown' && (
              <motion.div key="countdown" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <motion.p
                  key={countdown}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-8xl font-black text-primary"
                >
                  {countdown === 0 ? 'GO!' : countdown}
                </motion.p>
                <p className="text-muted-foreground mt-4">Chuẩn bị...</p>
              </motion.div>
            )}

            {phase === 'playing' && (
              <motion.div key={`q-${questionIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="text-xs font-black uppercase text-muted-foreground mb-4">
                  Câu {questionIdx + 1} / {questions.length}
                </p>
                <DuelQuestion
                  question={questions[questionIdx]}
                  onAnswer={handleAnswer}
                  timeLimit={10}
                />
              </motion.div>
            )}

            {phase === 'finished' && (
              <motion.div key="finished" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
                <div className={cn('h-20 w-20 rounded-full mx-auto flex items-center justify-center', won ? 'bg-gold/20' : draw ? 'bg-blue-500/20' : 'bg-muted')}>
                  <Trophy className={cn('h-10 w-10', won ? 'text-gold' : draw ? 'text-blue-500' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className="text-3xl font-black">
                    {won ? 'Chiến thắng!' : draw ? 'Kết quả Hòa!' : 'Thua rồi!'}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {myFinalScore} điểm vs {opponentFinalScore} điểm
                  </p>
                  {won && <p className="text-sm text-gold font-bold mt-2">+{50 + (JSON.parse(challenge.topic).bet || 0)} XP thưởng</p>}
                  {draw && <p className="text-sm text-blue-500 font-bold mt-2">+{20 + (JSON.parse(challenge.topic).bet || 0)} XP (Hoàn cược)</p>}
                </div>
                <Button onClick={onClose} className="w-full h-12 rounded-2xl font-black">
                  Về danh sách thử thách
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
