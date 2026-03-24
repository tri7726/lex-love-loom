import { useState, useCallback, useRef } from 'react';

export interface AnimationEvent {
  type: 'sakura_burst' | 'gold_sparkles';
  trigger: 'streak_milestone' | 'league_promotion' | 'achievement_unlock';
  metadata?: Record<string, unknown>;
}

export function useAchievementAnimation() {
  const [currentAnimation, setCurrentAnimation] = useState<AnimationEvent | null>(null);
  const queue = useRef<AnimationEvent[]>([]);

  const clearAnimation = useCallback(() => {
    const next = queue.current.shift();
    setCurrentAnimation(next ?? null);
  }, []);

  const triggerAnimation = useCallback((event: AnimationEvent) => {
    setCurrentAnimation((current) => {
      if (current) {
        queue.current.push(event);
        return current;
      }
      return event;
    });
  }, []);

  return { currentAnimation, triggerAnimation, clearAnimation };
}
