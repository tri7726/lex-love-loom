import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useXP } from '@/hooks/useXP';
import { toast } from 'sonner';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  condition_type: string;
  condition_value: number;
  xp_reward: number;
  unlocked: boolean;
  unlocked_at?: string;
  progress?: number; // current value toward condition_value
}

interface UserStats {
  total_xp: number;
  current_streak: number;
  flashcard_count: number;
  quiz_count: number;
  quiz_perfect: number;
  duel_wins: number;
  speaking_sessions: number;
}

export const useAchievements = () => {
  const { user } = useAuth();
  const { awardXP } = useXP();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (): Promise<UserStats> => {
    if (!user) return { total_xp: 0, current_streak: 0, flashcard_count: 0, quiz_count: 0, quiz_perfect: 0, duel_wins: 0, speaking_sessions: 0 };

    const [profileRes, flashcardsRes, quizRes, duelsRes, speakingRes] = await Promise.all([
      (supabase as any).from('profiles').select('total_xp, current_streak').eq('user_id', user.id).single(),
      (supabase as any).from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      (supabase as any).from('xp_events').select('metadata').eq('user_id', user.id).eq('source', 'quiz'),
      (supabase as any).from('xp_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('source', 'duel_win'),
      (supabase as any).from('pronunciation_results').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    const quizEvents = quizRes.data ?? [];
    const quizPerfect = quizEvents.filter((e: any) => e.metadata?.perfect === true).length;

    return {
      total_xp: profileRes.data?.total_xp ?? 0,
      current_streak: profileRes.data?.current_streak ?? 0,
      flashcard_count: flashcardsRes.count ?? 0,
      quiz_count: quizEvents.length,
      quiz_perfect: quizPerfect,
      duel_wins: duelsRes.count ?? 0,
      speaking_sessions: speakingRes.count ?? 0,
    };
  }, [user]);

  const getProgress = (stats: UserStats, conditionType: string): number => {
    switch (conditionType) {
      case 'xp_total': return stats.total_xp;
      case 'streak_days': return stats.current_streak;
      case 'flashcard_count': return stats.flashcard_count;
      case 'quiz_count': return stats.quiz_count;
      case 'quiz_perfect': return stats.quiz_perfect;
      case 'duel_wins': return stats.duel_wins;
      case 'speaking_sessions': return stats.speaking_sessions;
      default: return 0;
    }
  };

  const fetchAchievements = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [defsRes, unlockedRes, stats] = await Promise.all([
        (supabase as any).from('achievements').select('*').order('condition_value'),
        (supabase as any).from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', user.id),
        fetchStats(),
      ]);

      const defs = defsRes.data ?? [];
      const unlocked: Record<string, string> = {};
      (unlockedRes.data ?? []).forEach((u: any) => {
        unlocked[u.achievement_id] = u.unlocked_at;
      });

      const list: Achievement[] = defs.map((def: any) => {
        const progress = getProgress(stats, def.condition_type);
        return {
          ...def,
          unlocked: !!unlocked[def.id],
          unlocked_at: unlocked[def.id],
          progress,
        };
      });

      setAchievements(list);

      // Auto-unlock newly earned achievements
      await checkAndUnlock(list, stats, unlocked);
    } catch (err) {
      console.error('fetchAchievements error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchStats]);

  const checkAndUnlock = useCallback(async (
    list: Achievement[],
    stats: UserStats,
    alreadyUnlocked: Record<string, string>
  ) => {
    if (!user) return;

    const toUnlock = list.filter(a =>
      !alreadyUnlocked[a.id] &&
      getProgress(stats, a.condition_type) >= a.condition_value
    );

    for (const achievement of toUnlock) {
      try {
        await (supabase as any).from('user_achievements').insert({
          user_id: user.id,
          achievement_id: achievement.id,
        });

        // Award XP reward
        if (achievement.xp_reward > 0) {
          await awardXP('achievement', achievement.xp_reward, { achievement_id: achievement.id });
        }

        toast.success(`🏆 Achievement mở khóa: ${achievement.title}! +${achievement.xp_reward} XP`);

        setAchievements(prev => prev.map(a =>
          a.id === achievement.id
            ? { ...a, unlocked: true, unlocked_at: new Date().toISOString() }
            : a
        ));
      } catch {
        // UNIQUE constraint — already unlocked, ignore
      }
    }
  }, [user, awardXP]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return { achievements, loading, refetch: fetchAchievements };
};
