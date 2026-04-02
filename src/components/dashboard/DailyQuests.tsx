import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  Trophy, 
  Zap,
  BookOpen,
  MessageSquare,
  Gift,
  Brain,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Quest {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  reward: number;
  icon: React.ReactNode;
  type: string;
  completed: boolean;
  route?: string;
}

export const DailyQuests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClaimed, setIsClaimed] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);

  const fetchQuestProgress = useCallback(async () => {
    if (!user) {
      setQuests(getDefaultQuests(0, 0, 0, 0));
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's activity and claim status in parallel
      const [flashcardsRes, chatRes, readingRes, pronunciationRes, claimRes] = await Promise.all([
        supabase
          .from('flashcards')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('last_reviewed_at', `${today}T00:00:00`),
        supabase
          .from('analysis_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', `${today}T00:00:00`),
        supabase
          .from('learning_progress')
          .select('reading_minutes')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle(),
        supabase
          .from('pronunciation_results')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', `${today}T00:00:00`),
        supabase
          .from('daily_quest_progress')
          .select('is_claimed')
          .eq('user_id', user.id)
          .eq('quest_date', today)
          .eq('quest_id', 'daily_chest')
          .maybeSingle()
      ]);

      const reviewedCards = flashcardsRes.count || 0;
      const chatSessions = chatRes.count || 0;
      const readingMins = readingRes.data?.reading_minutes || 0;
      const speakingSessions = pronunciationRes.count || 0;
      const claimedForToday = claimRes.data?.is_claimed || false;

      setQuests(getDefaultQuests(reviewedCards, chatSessions, readingMins, speakingSessions));
      setIsClaimed(claimedForToday);
    } catch (err) {
      console.error('Error fetching quest progress:', err);
      setQuests(getDefaultQuests(0, 0, 0, 0));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuestProgress();
  }, [fetchQuestProgress]);

  const getDefaultQuests = (
    reviewedCards: number, 
    chatSessions: number, 
    readingMins: number, 
    speakingSessions: number
  ): Quest[] => [
    { 
      id: 'review', 
      title: 'Văn ôn võ luyện', 
      description: 'Ôn tập 10 từ vựng', 
      current: Math.min(reviewedCards, 10), 
      target: 10, 
      reward: 200, 
      icon: <Brain className="h-4 w-4" />, 
      type: 'vocab',
      completed: reviewedCards >= 10,
      route: '/vocabulary'
    },
    { 
      id: 'chat', 
      title: 'Bậc thầy đàm thoại', 
      description: 'Hoàn thành 1 buổi chat với Sensei', 
      current: Math.min(chatSessions, 1), 
      target: 1, 
      reward: 300, 
      icon: <MessageSquare className="h-4 w-4" />, 
      type: 'chat',
      completed: chatSessions >= 1,
      route: '/sensei'
    },
    { 
      id: 'reading', 
      title: 'Mọt sách Nhật Bản', 
      description: 'Đọc bài viết 5 phút', 
      current: Math.min(readingMins, 5), 
      target: 5, 
      reward: 250, 
      icon: <BookOpen className="h-4 w-4" />, 
      type: 'reading',
      completed: readingMins >= 5,
      route: '/reading'
    },
    { 
      id: 'speaking', 
      title: 'Luyện phát âm', 
      description: 'Luyện nói 1 câu tiếng Nhật', 
      current: Math.min(speakingSessions, 1), 
      target: 1, 
      reward: 350, 
      icon: <Zap className="h-4 w-4" />, 
      type: 'speaking',
      completed: speakingSessions >= 1,
      route: '/sensei?mode=speaking'
    },
  ];

  const completedCount = quests.filter(q => q.completed).length;
  const totalCount = quests.length;
  const allDone = completedCount === totalCount && totalCount > 0;

  const handleClaimReward = async () => {
    if (!user || !allDone || isClaimed) return;
    setClaimingReward(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const totalReward = quests.reduce((sum, q) => sum + q.reward, 0);
      
      // 1. Earn XP
      await supabase.rpc('earn_xp', { p_amount: totalReward, p_source: 'daily_quests' });
      
      // 2. Persist claim status
      await supabase.from('daily_quest_progress').upsert({
        user_id: user.id,
        quest_date: today,
        quest_id: 'daily_chest',
        is_completed: true,
        is_claimed: true
      });

      setIsClaimed(true);
      toast.success(`🎁 Nhận ${totalReward} XP từ nhiệm vụ hàng ngày!`);
    } catch (err) {
      console.error('Claim error:', err);
      toast.error('Không thể nhận thưởng. Thử lại sau!');
    } finally {
      setClaimingReward(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-primary/20 bg-card/60 backdrop-blur-sm shadow-soft">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20 bg-card/60 backdrop-blur-sm shadow-soft overflow-hidden">
      <CardHeader className="pb-4 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" /> Nhiệm vụ hàng ngày
            </CardTitle>
            <CardDescription className="text-xs">
              Hoàn thành để nhận XP và phần thưởng hấp dẫn!
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-primary">{completedCount}/{totalCount}</span>
          </div>
        </div>
        <Progress value={(completedCount / Math.max(totalCount, 1)) * 100} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {quests.map((quest) => (
          <motion.div 
            key={quest.id}
            initial={false}
            animate={{ opacity: quest.completed ? 0.7 : 1 }}
            className={cn(
              "p-3 rounded-xl border-2 transition-all flex items-center gap-3 cursor-pointer",
              quest.completed ? "bg-muted/30 border-transparent" : "bg-background border-border hover:border-primary/30"
            )}
            onClick={() => !quest.completed && quest.route && navigate(quest.route)}
          >
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              quest.completed ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
            )}>
              {quest.icon}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex justify-between items-center">
                <p className={cn("text-xs font-bold truncate", quest.completed && "line-through")}>{quest.title}</p>
                <span className="text-[10px] font-black text-primary">+{quest.reward} XP</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(quest.current / quest.target) * 100} className="h-1 flex-1" />
                <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                  {quest.current}/{quest.target}
                </span>
              </div>
            </div>
            {quest.completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
            )}
          </motion.div>
        ))}
        {(allDone || isClaimed) && (
          <Button 
            className={cn(
              "w-full rounded-xl font-bold shadow-lg gap-2 mt-2",
              isClaimed ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-gold hover:bg-gold/90 text-gold-foreground"
            )}
            onClick={handleClaimReward}
            disabled={claimingReward || isClaimed}
          >
            {claimingReward ? <Loader2 className="h-4 w-4 animate-spin" /> : 
             isClaimed ? <CheckCircle2 className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
            {isClaimed ? "Đã nhận thưởng" : "Nhận thưởng rương báu"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
