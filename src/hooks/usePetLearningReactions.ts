import { useEffect, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';

interface ReactionEvent {
  type: 'goal_completed' | 'streak_broken' | 'streak_milestone' | 'first_activity_today' | null;
  message: string;
  emoji: string;
}

const STORAGE_KEY = 'pet_reactions_state';

interface StoredState {
  date: string; // YYYY-MM-DD
  goalCelebrated: boolean;
  lastStreakSeen: number;
  lastActivityDate: string | null;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

const load = (): StoredState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { date: todayKey(), goalCelebrated: false, lastStreakSeen: 0, lastActivityDate: null };
};

const save = (s: StoredState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
};

/**
 * Theo dõi hành vi học và phát sự kiện "phản ứng" cho pet:
 * - Hoàn thành mục tiêu hôm nay → vui mừng (1 lần/ngày)
 * - Streak bị mất (last_activity > 1 ngày) → buồn (1 lần)
 * - Streak chạm mốc (7, 30, 100) → ăn mừng đặc biệt
 * - Mở app lần đầu trong ngày → chào hỏi
 */
export function usePetLearningReactions(
  onReaction: (event: ReactionEvent) => void
) {
  const { profile } = useProfile();
  const lastFiredRef = useRef<string>('');

  useEffect(() => {
    if (!profile) return;

    const today = todayKey();
    const state = load();

    // Reset state nếu sang ngày mới
    if (state.date !== today) {
      state.date = today;
      state.goalCelebrated = false;
    }

    const goalMinutes = profile.daily_goal_minutes ?? 15;
    const goalXP = goalMinutes * 10;
    const dailyXP = (profile as any).daily_xp_earned ?? 0;
    const streak = profile.current_streak ?? 0;
    const lastActivity = profile.last_activity_date;

    let event: ReactionEvent | null = null;

    // 1. Streak milestone
    if ([7, 30, 100, 365].includes(streak) && state.lastStreakSeen !== streak) {
      event = {
        type: 'streak_milestone',
        emoji: streak >= 100 ? '🏆' : streak >= 30 ? '🔥' : '✨',
        message: `Wow! ${streak} ngày liên tiếp! Mình tự hào về bạn quá!`,
      };
    }
    // 2. Goal completed
    else if (dailyXP >= goalXP && !state.goalCelebrated) {
      event = {
        type: 'goal_completed',
        emoji: '🎉',
        message: `Tuyệt vời! Hôm nay học đủ ${goalMinutes} phút rồi! ✨`,
      };
      state.goalCelebrated = true;
    }
    // 3. Streak broken
    else if (
      lastActivity &&
      state.lastActivityDate !== lastActivity &&
      streak === 0 &&
      state.lastStreakSeen > 0
    ) {
      event = {
        type: 'streak_broken',
        emoji: '😢',
        message: `Hic... mình nhớ bạn lắm. Cùng học lại để xây streak mới nhé!`,
      };
    }
    // 4. First activity today
    else if (state.lastActivityDate !== today && dailyXP > 0 && dailyXP < goalXP) {
      event = {
        type: 'first_activity_today',
        emoji: '👋',
        message: `Chào buổi học mới! Cùng cố gắng đạt ${goalMinutes} phút hôm nay nha!`,
      };
    }

    state.lastStreakSeen = streak;
    state.lastActivityDate = lastActivity ?? state.lastActivityDate;
    save(state);

    if (event && lastFiredRef.current !== event.type) {
      lastFiredRef.current = event.type as string;
      onReaction(event);
    }
  }, [
    (profile as any)?.daily_xp_earned,
    profile?.current_streak,
    profile?.last_activity_date,
    profile?.daily_goal_minutes,
    profile,
    onReaction,
  ]);
}
