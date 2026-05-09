import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useConfetti } from '@/hooks/useConfetti';
import { getLevelInfo } from '@/lib/leveling';
import { showXPGain } from '@/components/effects/XPGainToast';

export type XPSource = 'quiz' | 'flashcard' | 'duel_win' | 'duel_loss' | 'duel_draw' | 'reading' | 'speaking' | 'streak_bonus' | 'achievement' | 'evolved_skill' | 'daily_quests';

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
  evolved_skill: 0,   // set per skill
  daily_quests: 0,    // set per quest bundle
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
      // Allow callers to pass known current XP to skip the profile fetch
      const knownXP = typeof metadata?._knownCurrentXP === 'number'
        ? (metadata._knownCurrentXP as number)
        : null;

      // Fetch current level BEFORE awarding XP (for level-up detection)
      // Skip if caller already provided current XP
      let currentXP = knownXP;
      if (currentXP === null) {
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('total_xp')
          .eq('user_id', user.id)
          .single();
        currentXP = profile?.total_xp ?? 0;
      }

      const oldLevel = getLevelInfo(currentXP).level;

      // Server-side earn_xp caps at 500/call — batch larger amounts
      const XP_CAP = 500;
      let remaining = xpAmount;
      // Strip internal-only _knownCurrentXP before sending to RPC
      const rpcMeta = metadata ? { ...metadata } : {};
      delete rpcMeta._knownCurrentXP;
      while (remaining > 0) {
        const chunk = Math.min(remaining, XP_CAP);
        const { error } = await supabase.rpc('earn_xp', {
          p_amount: chunk,
          p_source: source,
          p_metadata: rpcMeta as any,
        });
        if (error) throw error;
        remaining -= chunk;
      }

      // Show XP gain animation (once)
      showXPGain(xpAmount, source);

      // Level-up detection
      const estimatedTotal = currentXP + xpAmount;
      const newLevel = getLevelInfo(estimatedTotal).level;
      if (newLevel > oldLevel) {
        window.dispatchEvent(new CustomEvent('level-up', { detail: { level: newLevel, totalXp: estimatedTotal } }));
        setTimeout(() => confetti.fire('school'), 500);
      }

      return estimatedTotal;
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
        .select('current_streak, longest_streak, last_activity_date, total_xp')
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
      // Pass knownCurrentXP so awardXP skips its own profile fetch for level-up detection
      await awardXP('streak_bonus', XP_REWARDS.streak_bonus, {
        streak: newStreak,
        _knownCurrentXP: profile?.total_xp ?? 0,
      });

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
