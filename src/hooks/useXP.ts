import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useConfetti } from '@/hooks/useConfetti';
import { getLevelInfo } from '@/lib/leveling';

export type XPSource = 'quiz' | 'flashcard' | 'duel_win' | 'duel_loss' | 'duel_draw' | 'reading' | 'speaking' | 'streak_bonus' | 'achievement';

export const XP_REWARDS: Record<XPSource, number> = {
  quiz: 10,           // per correct answer
  flashcard: 2,       // per card reviewed
  duel_win: 50,
  duel_loss: 10,
  duel_draw: 20,      // draw refund/bonus
  reading: 15,        // per passage read
  speaking: 20,       // per session
  streak_bonus: 25,   // daily streak bonus
  achievement: 0,     // set per achievement
};

/**
 * Hook to award XP and update streak.
 * Call `awardXP` after any learning activity.
 */
export const useXP = () => {
  const { user } = useAuth();
  const confetti = useConfetti();

  const awardXP = useCallback(async (
    source: XPSource,
    amount?: number,
    metadata?: Record<string, unknown>
  ) => {
    if (!user) return;

    const xpAmount = amount ?? XP_REWARDS[source];
    if (xpAmount === 0) return;

    try {
      // 1. Log xp_event
      await (supabase as any).from('xp_events').insert({
        user_id: user.id,
        source,
        amount: xpAmount,
        metadata: metadata ?? {},
      });

      // 2. Increment total_xp on profile
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('total_xp')
        .eq('user_id', user.id)
        .single();

      const newXP = Math.max(0, (profile?.total_xp ?? 0) + xpAmount);

      await (supabase as any)
        .from('profiles')
        .update({ total_xp: newXP })
        .eq('user_id', user.id);

      // Level Up Logic
      const oldLevel = getLevelInfo(profile?.total_xp ?? 0).level;
      const newLevel = getLevelInfo(newXP).level;
      
      if (newLevel > oldLevel) {
        // Trigger generic app event for Level Up Modal
        window.dispatchEvent(new CustomEvent('level-up', { detail: { level: newLevel, totalXp: newXP } }));
        setTimeout(() => confetti.fire('school'), 500);
      }

      return newXP;
    } catch (err) {
      console.error('awardXP error:', err);
    }
  }, [user, confetti]);

  /**
   * Update streak — call once per day on any activity.
   * Resets streak if last_activity_date > 1 day ago.
   */
  const updateStreak = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('current_streak, longest_streak, last_activity_date')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const today = new Date().toISOString().split('T')[0];
      const lastDate = profile.last_activity_date;

      if (lastDate === today) return; // already updated today

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const isConsecutive = lastDate === yesterdayStr;
      const newStreak = isConsecutive ? (profile.current_streak ?? 0) + 1 : 1;
      const newLongest = Math.max(newStreak, profile.longest_streak ?? 0);

      await (supabase as any)
        .from('profiles')
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_activity_date: today,
        })
        .eq('user_id', user.id);

      // Award streak bonus XP
      await awardXP('streak_bonus', XP_REWARDS.streak_bonus, { streak: newStreak });

      if (newStreak > 1) {
        toast.success(`🔥 Streak ${newStreak} ngày! +${XP_REWARDS.streak_bonus} XP`);
        if (newStreak % 5 === 0) confetti.fire('success');
      }

      return newStreak;
    } catch (err) {
      console.error('updateStreak error:', err);
    }
  }, [user, awardXP, confetti]);

  return { awardXP, updateStreak };
};
