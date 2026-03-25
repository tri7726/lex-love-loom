import { useEffect, useState } from 'react';
import { useProfile } from './useProfile';

export type ReminderState = 'none' | 'not_started' | 'streak_warning' | 'streak_lost';

interface StreakReminderResult {
  state: ReminderState;
  currentStreak: number;
  dismiss: () => void;
}

const DISMISS_KEY = 'streak_reminder_dismissed_';

export function useStreakReminder(): StreakReminderResult {
  const { profile } = useProfile();
  const [state, setState] = useState<ReminderState>('none');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!profile || dismissed) return;

    const today = new Date().toISOString().split('T')[0];
    const dismissKey = DISMISS_KEY + today;

    // Already dismissed today
    if (sessionStorage.getItem(dismissKey)) return;

    const lastActive = (profile as any).last_activity_date as string | null;
    const streak = profile.current_streak ?? 0;

    if (!lastActive) {
      setState('not_started');
      return;
    }

    if (lastActive === today) {
      // Already studied today — no reminder
      setState('none');
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastActive === yesterdayStr) {
      // Studied yesterday but not today — streak at risk
      setState(streak > 0 ? 'streak_warning' : 'not_started');
    } else {
      // Missed more than 1 day — streak lost
      setState(streak > 0 ? 'streak_lost' : 'not_started');
    }
  }, [profile, dismissed]);

  const dismiss = () => {
    const today = new Date().toISOString().split('T')[0];
    sessionStorage.setItem(DISMISS_KEY + today, '1');
    setDismissed(true);
    setState('none');
  };

  return {
    state,
    currentStreak: profile?.current_streak ?? 0,
    dismiss,
  };
}
