import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Clock, Target, CheckCircle2, XCircle, 
  Loader2, Trophy, Swords, ChevronRight, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { MINNA_N5_VOCAB } from '@/data/minna-n5';
import { VocabWord } from '@/types/vocabulary';
import { cn } from '@/lib/utils';
import { useXP } from '@/hooks/useXP';
import { seededRandom, seededShuffle, seedFromId } from '@/lib/random';

interface QuizQuestion {
  question: string;
  questionJp: string;
  options: string[];
  correctAnswer: number;
}

export const PvPBattle = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { awardXP } = useXP();

  const [challenge, setChallenge] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Live timer
  useEffect(() => {
    if (isComplete || loading) return;
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isComplete, loading, startTime]);

  // ── Fetch Challenge ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchChallenge = async () => {
      if (!challengeId || !user) return;
      try {
        const { data: chData, error } = await supabase
          .from('challenges' as any)
          .select('*')
          .eq('id', challengeId)
          .single() as any;

        if (error) throw error;
        const ids = [chData.challenger_id, chData.opponent_id].filter(Boolean);
        const { data: profs } = await (supabase as any)
          .from('profiles')
          .select('user_id, display_name, total_xp')
          .in('user_id', ids);
        const pmap = new Map((profs || []).map((p: any) => [p.user_id, p]));
        const data = {
          ...chData,
          challenger_profile: pmap.get(chData.challenger_id) || null,
          opponent_profile: pmap.get(chData.opponent_id) || null,
        };
        setChallenge(data);

        // Generate questions based on topic using deterministic seed from challengeId
        // Both players see the same questions in the same order
        const allWords = MINNA_N5_VOCAB.flat() as VocabWord[];
        const seed = seedFromId(challengeId);
        const selected = seededShuffle(allWords, seed).slice(0, 10);

        const generated = selected.map(word => {
          const distractors = seededShuffle(
            allWords.filter(w => w.id !== word.id),
            seed + word.id.charCodeAt(0)
          ).slice(0, 3).map(w => w.meaning);
          const options = seededShuffle([word.meaning, ...distractors], seed + 9999);
          return {
            question: `"${word.word}" nghĩa là gì?`,
            questionJp: word.word,
            options,
            correctAnswer: options.indexOf(word.meaning)
          };
        });
        setQuestions(generated);
      } catch (err: any) {
        toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
        navigate('/challenges');
      } finally {
        setLoading(false);
      }
    };
    fetchChallenge();
  }, [challengeId, user, toast, navigate]);

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === questions[currentIdx].correctAnswer;
    if (isCorrect) setScore(prev => prev + 1);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setEndTime(Date.now());
      setIsComplete(true);
    }
  };

  const submitResults = async () => {
    if (!user || !challengeId || !endTime) return;
    setSubmitting(true);
    try {
      const accuracy = Math.round((score / questions.length) * 100);
      const isChallenger = challenge?.challenger_id === user.id;

      // Read latest challenge from DB to avoid stale state
      const { data: latestChallenge } = await supabase
        .from('challenges' as any)
        .select('challenger_score, opponent_score, challenger_id, opponent_id, topic')
        .eq('id', challengeId)
        .single() as any;

      if (!latestChallenge) throw new Error('Challenge not found');

      const scoreField = isChallenger ? 'challenger_score' : 'opponent_score';
      const otherScoreField = isChallenger ? 'opponent_score' : 'challenger_score';

      // Atomic update: only write our score, don't touch the other player's score
      const updateData: any = {
        [scoreField]: accuracy,
      };

      const otherScore = latestChallenge[otherScoreField];
      if (otherScore !== null) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        if (accuracy > otherScore) {
          updateData.winner_id = user.id;
        } else if (otherScore > accuracy) {
          updateData.winner_id = latestChallenge[isChallenger ? 'opponent_id' : 'challenger_id'];
        } else {
          updateData.winner_id = null; // Draw
        }
      }

      const { error } = await supabase
        .from('challenges' as any)
        .update(updateData)
        .eq('id', challengeId) as any;

      if (error) throw error;

      // Award XP with Betting Logic
      const isComplete = otherScore !== null;
      if (isComplete) {
        const hasWon = updateData.winner_id === user.id;
        const isDraw = updateData.winner_id === null;

        let bet = 0;
        try {
          if (latestChallenge.topic.startsWith('{')) {
            bet = JSON.parse(latestChallenge.topic).bet || 0;
          }
        } catch(e) {}

        const baseReward = hasWon ? 50 : isDraw ? 20 : 10;
        const finalReward = hasWon ? (baseReward + bet) : isDraw ? (baseReward + bet) : Math.max(5, baseReward - (bet > 20 ? bet - 20 : 0));

        const source = hasWon ? 'duel_win' : isDraw ? 'duel_draw' : 'duel_loss';
        await awardXP(source as any, finalReward, { bet, challengeId });
      }

      toast({ title: 'Kết quả đã được ghi nhận!' });
      navigate('/challenges');
    } catch (err: any) {
      toast({ title: 'Lỗi đồng bộ', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-sakura mx-auto" />
        <p className="font-bold text-muted-foreground/70">Đang khởi tạo trận đấu...</p>
      </div>
    </div>
  );

  if (isComplete) {
    const timeTaken = Math.round((endTime! - startTime) / 1000);
    const accuracy = Math.round((score / questions.length) * 100);
    
    return (
      <div className="min-h-screen bg-cream py-12 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
          <Card className="rounded-[3rem] border-2 border-sakura/20 shadow-2xl overflow-hidden bg-white/70 backdrop-blur-3xl">
            <div className="h-1.5 w-full bg-sakura" />
            <CardContent className="p-10 space-y-8">
              <div className="text-center space-y-4">
                <Trophy className="h-16 w-16 mx-auto text-amber-500" />
                <h2 className="text-3xl font-black text-foreground tracking-tight">Trận đấu kết thúc!</h2>
                <p className="text-muted-foreground/70 font-medium">Kết quả của bạn đã sẵn sàng</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-rose-50 rounded-[2rem] border border-rose-100 text-center">
                  <p className="text-3xl font-black text-sakura">{accuracy}%</p>
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">Chính xác</p>
                </div>
                <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 text-center">
                  <p className="text-3xl font-black text-blue-600">{timeTaken}s</p>
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">Thời gian</p>
                </div>
              </div>

              <Button 
                onClick={submitResults} 
                disabled={submitting}
                className="w-full h-16 rounded-2xl bg-sakura text-white font-black text-lg shadow-xl shadow-rose-100 hover:bg-rose-600 transition-all gap-3"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Swords className="h-5 w-5" /> GỬI KẾT QUẢ</>}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-cream pb-20">
      <main className="container max-w-2xl py-12 space-y-8">
        <div className="flex items-center justify-between">
           <Badge variant="outline" className="text-sakura border-sakura/20 bg-sakura/5 font-black uppercase tracking-widest text-[10px] px-3 py-1">PvP Battle</Badge>
           <div className="flex items-center gap-3">
             <span className="text-xs font-bold tabular-nums text-muted-foreground/50"><Clock className="inline h-3 w-3 mr-0.5" />{elapsedSec}s</span>
             <div className="text-sm font-bold text-muted-foreground/70">CÂU {currentIdx + 1}/{questions.length}</div>
           </div>
        </div>

        <Progress value={progress} className="h-3 rounded-full bg-border" indicatorClassName="bg-sakura" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="rounded-[2.5rem] border-2 border-border/50 shadow-xl overflow-hidden bg-white/50 backdrop-blur-md">
              <CardHeader className="text-center p-8 pb-4">
                 <div className="p-4 bg-rose-50 w-fit mx-auto rounded-3xl mb-4"><Zap className="h-6 w-6 text-sakura" /></div>
                 <h2 className="text-4xl font-jp font-black text-foreground">{currentQ.questionJp}</h2>
                 <p className="text-muted-foreground/70 font-medium mt-2">{currentQ.question}</p>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-4">
                <div className="grid gap-3">
                  {currentQ.options.map((opt, i) => {
                    const isSelected = selectedAnswer === i;
                    const isCorrect = i === currentQ.correctAnswer;
                    
                    return (
                      <button
                        key={i}
                        disabled={showResult}
                        onClick={() => setSelectedAnswer(i)}
                        className={cn(
                          "w-full p-6 rounded-2xl border-2 transition-all flex items-center justify-between font-bold",
                          !showResult && isSelected ? "border-sakura bg-rose-50 text-sakura" : 
                          !showResult ? "border-border/50 bg-white hover:border-sakura/30 hover:bg-cream" :
                          isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-700" :
                          isSelected ? "border-rose-500 bg-rose-50 text-rose-700" : "border-border/50 opacity-50"
                        )}
                      >
                        <span className="text-lg">{opt}</span>
                        {showResult && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                        {showResult && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-rose-500" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center pt-4">
           {!showResult ? (
             <Button 
               size="lg" 
               disabled={selectedAnswer === null} 
               onClick={handleSubmit}
               className="h-14 px-12 rounded-2xl bg-sakura text-white font-black shadow-lg hover:bg-rose-600 transition-all active:scale-95 disabled:opacity-50"
             >
               KIỂM TRA
             </Button>
           ) : (
             <Button 
               size="lg" 
               onClick={handleNext}
               className="h-14 px-12 rounded-2xl bg-card text-white font-black shadow-lg gap-2"
             >
               TIẾP THEO <ChevronRight className="h-5 w-5" />
             </Button>
           )}
        </div>
      </main>
    </div>
  );
};

export default PvPBattle;
