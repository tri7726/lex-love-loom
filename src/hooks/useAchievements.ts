import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useXP } from '@/hooks/useXP';
import { useConfetti } from '@/hooks/useConfetti';
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
  // Pet stats
  pet_total_actions: number;
  pet_feeds: number;
  pet_plays: number;
  pet_happiness: number;
  pet_evolution_level: number;
}

export const useAchievements = () => {
  const { user } = useAuth();
  const { awardXP } = useXP();
  const confetti = useConfetti();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const isCheckingRef = useRef(false);

  const fetchStats = useCallback(async (): Promise<UserStats> => {
    if (!user) return {
      total_xp: 0, current_streak: 0, flashcard_count: 0, quiz_count: 0,
      quiz_perfect: 0, duel_wins: 0, speaking_sessions: 0,
      pet_total_actions: 0, pet_feeds: 0, pet_plays: 0,
      pet_happiness: 0, pet_evolution_level: 0,
    };

    const [profileRes, flashcardsRes, quizRes, duelsRes, speakingRes, petEventsRes, petRes, feedRes, playRes] = await Promise.all([
      (supabase as any).from('profiles').select('total_xp, current_streak').eq('user_id', user.id).single(),
      (supabase as any).from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      (supabase as any).from('xp_events').select('metadata').eq('user_id', user.id).eq('source', 'quiz'),
      (supabase as any).from('xp_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('source', 'duel_win'),
      (supabase as any).from('pronunciation_results').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      (supabase as any).from('xp_events').select('source', { count: 'exact', head: true }).eq('user_id', user.id)
        .in('source', ['pet_feed', 'pet_play', 'pet_bathe', 'pet_walk', 'pet_sleep', 'pet_interact']),
      (supabase as any).from('user_pets').select('happiness, evolution_level').eq('user_id', user.id).maybeSingle(),
      (supabase as any).from('xp_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('source', 'pet_feed'),
      (supabase as any).from('xp_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('source', 'pet_play'),
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
      pet_total_actions: petEventsRes.count ?? 0,
      pet_feeds: feedRes.count ?? 0,
      pet_plays: playRes.count ?? 0,
      pet_happiness: petRes.data?.happiness ?? 0,
      pet_evolution_level: petRes.data?.evolution_level ?? 0,
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
      case 'pet_total_actions': return stats.pet_total_actions;
      case 'pet_feeds': return stats.pet_feeds;
      case 'pet_plays': return stats.pet_plays;
      case 'pet_happiness': return stats.pet_happiness;
      case 'pet_evolution': return stats.pet_evolution_level;
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

      // Note: auto-unlock is NOT called here. Components call checkUnlockedAchievements()
      // after relevant actions to avoid redundant DB checks and potential feedback loops.
    } catch (err) {
      console.error('fetchAchievements error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchStats]);

  const checkUnlockedAchievements = useCallback(async () => {
    if (!user || isCheckingRef.current) return;
    isCheckingRef.current = true;

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

      await checkAndUnlock(list, stats, unlocked);
    } catch (err) {
      console.error('checkUnlockedAchievements error:', err);
    } finally {
      isCheckingRef.current = false;
    }
  }, [user, fetchStats]);

  const checkAndUnlock = useCallback(async (
    list: Achievement[],
    stats: UserStats,
    alreadyUnlocked: Record<string, string>
  ) => {
    if (!user) return;

    const needsAchievement = list.filter(a =>
      !alreadyUnlocked[a.id] &&
      getProgress(stats, a.condition_type) >= a.condition_value
    );

    for (const achievement of needsAchievement) {
      try {
        // Double-check: verify it's truly not unlocked yet (handles race between
        // fetching alreadyUnlocked and this insert, without needing a UNIQUE constraint)
        const { data: existing } = await (supabase as any)
          .from('user_achievements')
          .select('id')
          .eq('user_id', user.id)
          .eq('achievement_id', achievement.id)
          .maybeSingle();

        if (existing) {
          setAchievements(prev => prev.map(a =>
            a.id === achievement.id ? { ...a, unlocked: true, unlocked_at: existing.unlocked_at } : a
          ));
          continue;
        }

        await (supabase as any).from('user_achievements').insert({
          user_id: user.id,
          achievement_id: achievement.id,
        });

        // Award XP reward — pet achievements give pet_xp, others give user XP
        const isPetAchievement = achievement.condition_type?.startsWith('pet_');
        if (achievement.xp_reward > 0) {
          if (isPetAchievement) {
            await (supabase as any).rpc('add_pet_xp', { p_amount: achievement.xp_reward });
          } else {
            await awardXP('achievement', achievement.xp_reward, { achievement_id: achievement.id });
          }
        }

        const label = isPetAchievement ? 'Pet XP' : 'XP';
        toast.success(`🏆 Achievement mở khóa: ${achievement.title}! +${achievement.xp_reward} ${label}`);
        confetti.fire('success');

        setAchievements(prev => prev.map(a =>
          a.id === achievement.id
            ? { ...a, unlocked: true, unlocked_at: new Date().toISOString() }
            : a
        ));
      } catch {
        // Insert failed (e.g. DB-level UNIQUE violation, or network error)
        // Log and continue to next achievement
      }
    }
  }, [user, awardXP, confetti]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return { achievements, loading, refetch: fetchAchievements, checkUnlockedAchievements };
};
