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
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { MINNA_N5_VOCAB } from '@/data/minna-n5';
import { cn } from '@/lib/utils';
import { useXP } from '@/hooks/useXP';

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

  // ── Fetch Challenge ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchChallenge = async () => {
      if (!challengeId || !user) return;
      try {
        const { data, error } = await supabase
          .from('challenges' as any)
          .select(`
            *,
            challenger_profile:profiles!challenges_challenger_id_fkey(display_name, total_xp),
            opponent_profile:profiles!challenges_opponent_id_fkey(display_name, total_xp)
          `)
          .eq('id', challengeId)
          .single() as any;

        if (error) throw error;
        setChallenge(data);

        // Generate questions based on topic
        // For now, use N5 vocab randomly
        const allWords = MINNA_N5_VOCAB.flat() as VocabWord[];
        const selected = [...allWords].sort(() => Math.random() - 0.5).slice(0, 10);
        
        const generated = selected.map(word => {
          const distractors = allWords
            .filter(w => w.id !== word.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(w => w.meaning);
          const options = [word.meaning, ...distractors].sort(() => Math.random() - 0.5);
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
    if (!user || !challenge || !endTime) return;
    setSubmitting(true);
    try {
      const accuracy = Math.round((score / questions.length) * 100);
      const isChallenger = challenge.challenger_id === user.id;
      
      const updateData: any = {};
      if (isChallenger) {
        updateData.challenger_score = accuracy;
      } else {
        updateData.opponent_score = accuracy;
      }

      // Check if both finished
      const otherScore = isChallenger ? challenge.opponent_score : challenge.challenger_score;
      if (otherScore !== null) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        const opponentScore = otherScore;
        const myScore = accuracy;
        if (myScore > opponentScore) {
          updateData.winner_id = user.id;
        } else if (opponentScore > myScore) {
          updateData.winner_id = isChallenger ? challenge.opponent_id : challenge.challenger_id;
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
      if (updateData.status === 'completed') {
        const hasWon = updateData.winner_id === user.id;
        const isDraw = updateData.winner_id === null;
        
        let bet = 0;
        try {
          if (challenge.topic.startsWith('{')) {
            bet = JSON.parse(challenge.topic).bet || 0;
          }
        } catch(e) {}

        const myXP = isChallenger ? challenge.challenger_profile?.total_xp : challenge.opponent_profile?.total_xp;
        const oppXP = isChallenger ? challenge.opponent_profile?.total_xp : challenge.challenger_profile?.total_xp;
        
        const calculateLevel = (xp: number) => Math.floor(Math.sqrt((xp || 0) / 100)) + 1;
        const myLvl = calculateLevel(myXP);
        const oppLvl = calculateLevel(oppXP);
        const gap = oppLvl - myLvl;
        const multiplier = Math.max(0.1, Math.min(5.0, 1 + (gap * 0.15)));

        const baseReward = hasWon ? 50 : isDraw ? 20 : 10;
        const weightedReward = Math.round(baseReward * multiplier);
        const finalReward = hasWon ? (weightedReward + bet) : isDraw ? weightedReward : (weightedReward - bet);
        
        // Ensure finalReward isn't negative (at least 5 XP for effort)
        const safeReward = Math.max(5, finalReward);

        const source = hasWon ? 'duel_win' : 'duel_loss';
        await awardXP(source as any, safeReward, { bet, multiplier, challengeId });
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-sakura mx-auto" />
        <p className="font-bold text-slate-400">Đang khởi tạo trận đấu...</p>
      </div>
    </div>
  );

  if (isComplete) {
    const timeTaken = Math.round((endTime! - startTime) / 1000);
    const accuracy = Math.round((score / questions.length) * 100);
    
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
          <Card className="rounded-[3rem] border-2 border-sakura/20 shadow-2xl overflow-hidden bg-white/70 backdrop-blur-3xl">
            <div className="h-1.5 w-full bg-sakura" />
            <CardContent className="p-10 space-y-8">
              <div className="text-center space-y-4">
                <Trophy className="h-16 w-16 mx-auto text-amber-500" />
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Trận đấu kết thúc!</h2>
                <p className="text-slate-400 font-medium">Kết quả của bạn đã sẵn sàng</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-rose-50 rounded-[2rem] border border-rose-100 text-center">
                  <p className="text-3xl font-black text-sakura">{accuracy}%</p>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Chính xác</p>
                </div>
                <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 text-center">
                  <p className="text-3xl font-black text-blue-600">{timeTaken}s</p>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Thời gian</p>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <Navigation />
      <main className="container max-w-2xl py-12 space-y-8">
        <div className="flex items-center justify-between">
           <Badge variant="outline" className="text-sakura border-sakura/20 bg-sakura/5 font-black uppercase tracking-widest text-[10px] px-3 py-1">PvP Battle</Badge>
           <div className="text-sm font-bold text-slate-400">CÂU {currentIdx + 1}/{questions.length}</div>
        </div>

        <Progress value={progress} className="h-3 rounded-full bg-slate-200" indicatorClassName="bg-sakura" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden bg-white/50 backdrop-blur-md">
              <CardHeader className="text-center p-8 pb-4">
                 <div className="p-4 bg-rose-50 w-fit mx-auto rounded-3xl mb-4"><Zap className="h-6 w-6 text-sakura" /></div>
                 <h2 className="text-4xl font-jp font-black text-slate-800">{currentQ.questionJp}</h2>
                 <p className="text-slate-400 font-medium mt-2">{currentQ.question}</p>
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
                          !showResult ? "border-slate-100 bg-white hover:border-sakura/30 hover:bg-slate-50" :
                          isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-700" :
                          isSelected ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-100 opacity-50"
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
               className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black shadow-lg gap-2"
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
