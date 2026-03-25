import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wifi, WifiOff, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { DuelQuestion, DuelQuestionData } from './DuelQuestion';
import { useDuelChannel } from '@/hooks/useDuelChannel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useXP } from '@/hooks/useXP';

// ─── Fallback N5 word list ────────────────────────────────────────────────────
const N5_WORDS: Omit<DuelQuestionData, 'options'>[] = [
  { word: '水', reading: 'みず (mizu)', correct: 'Nước' },
  { word: '火', reading: 'ひ (hi)', correct: 'Lửa' },
  { word: '山', reading: 'やま (yama)', correct: 'Núi' },
  { word: '川', reading: 'かわ (kawa)', correct: 'Sông' },
  { word: '空', reading: 'そら (sora)', correct: 'Bầu trời' },
  { word: '花', reading: 'はな (hana)', correct: 'Hoa' },
  { word: '木', reading: 'き (ki)', correct: 'Cây' },
  { word: '犬', reading: 'いぬ (inu)', correct: 'Chó' },
  { word: '猫', reading: 'ねこ (neko)', correct: 'Mèo' },
  { word: '魚', reading: 'さかな (sakana)', correct: 'Cá' },
  { word: '本', reading: 'ほん (hon)', correct: 'Sách' },
  { word: '車', reading: 'くるま (kuruma)', correct: 'Xe hơi' },
  { word: '電車', reading: 'でんしゃ (densha)', correct: 'Tàu điện' },
  { word: '学校', reading: 'がっこう (gakkou)', correct: 'Trường học' },
  { word: '先生', reading: 'せんせい (sensei)', correct: 'Giáo viên' },
  { word: '友達', reading: 'ともだち (tomodachi)', correct: 'Bạn bè' },
  { word: '食べる', reading: 'たべる (taberu)', correct: 'Ăn' },
  { word: '飲む', reading: 'のむ (nomu)', correct: 'Uống' },
  { word: '見る', reading: 'みる (miru)', correct: 'Nhìn / Xem' },
  { word: '行く', reading: 'いく (iku)', correct: 'Đi' },
];

const DISTRACTORS = [
  'Núi', 'Sông', 'Lửa', 'Nước', 'Bầu trời', 'Hoa', 'Cây', 'Chó', 'Mèo', 'Cá',
  'Sách', 'Xe hơi', 'Tàu điện', 'Trường học', 'Giáo viên', 'Bạn bè', 'Ăn', 'Uống', 'Nhìn / Xem', 'Đi',
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildQuestions(count = 6): DuelQuestionData[] {
  const pool = shuffle(N5_WORDS).slice(0, count);
  return pool.map((w) => {
    const wrong = shuffle(DISTRACTORS.filter((d) => d !== w.correct)).slice(0, 3);
    return { ...w, options: shuffle([w.correct, ...wrong]) };
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
  const userId = user?.id ?? '';

  const isChallenger = challenge.challenger_id === userId;
  const opponentProfile = isChallenger ? challenge.opponent_profile : challenge.challenger_profile;
  const opponentName = opponentProfile?.display_name ?? 'Đối thủ';
  const opponentAvatar = opponentProfile?.avatar_url ?? '';

  const { duelState, broadcastAnswer, isConnected } = useDuelChannel(challenge.id, userId);
  const [phase, setPhase] = useState<DuelPhase>('waiting');
  const [countdown, setCountdown] = useState(3);
  const [questionIdx, setQuestionIdx] = useState(0);
  const questions = useMemo(() => buildQuestions(6), []);

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
        // Upsert result to DB
        const myScore = duelState.myScore + score;
        const opponentScore = duelState.opponentScore;
        const winnerId = myScore >= opponentScore ? userId : (isChallenger ? challenge.opponent_id : challenge.challenger_id);
        (supabase as any)
          .from('challenges')
          .update({
            challenger_score: isChallenger ? myScore : opponentScore,
            opponent_score: isChallenger ? opponentScore : myScore,
            winner_id: winnerId,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', challenge.id);

        // XP bonus for winner/loser
        if (winnerId === userId) {
          awardXP('duel_win', 50, { challenge_id: challenge.id });
        } else {
          awardXP('duel_loss', 10, { challenge_id: challenge.id });
        }
      } else {
        setQuestionIdx((i) => i + 1);
      }
    },
    [questionIdx, questions.length, broadcastAnswer, duelState, userId, isChallenger, challenge]
  );

  const myFinalScore = duelState.myScore;
  const opponentFinalScore = duelState.opponentScore;
  const won = myFinalScore >= opponentFinalScore;

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
            <p className="text-xs font-black uppercase text-muted-foreground mb-1">{opponentName}</p>
            <p className="text-3xl font-black text-secondary">{duelState.opponentScore}</p>
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
                <div className={cn('h-20 w-20 rounded-full mx-auto flex items-center justify-center', won ? 'bg-gold/20' : 'bg-muted')}>
                  <Trophy className={cn('h-10 w-10', won ? 'text-gold' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className="text-3xl font-black">{won ? 'Chiến thắng!' : 'Thua rồi!'}</p>
                  <p className="text-muted-foreground mt-1">
                    {myFinalScore} điểm vs {opponentFinalScore} điểm
                  </p>
                  {won && <p className="text-sm text-gold font-bold mt-2">+50 XP thưởng</p>}
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
