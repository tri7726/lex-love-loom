import { useState, useRef, useCallback } from 'react';

/**
 * Cooldown hook — prevents an action from being re-triggered
 * within `cooldownMs` milliseconds of the last execution.
 *
 * Returns [isOnCooldown, execute, remainingMs] tuple.
 *
 * Uses a ref internally to avoid stale closure issues with rapid calls.
 *
 * @example
 * ```tsx
 * const [saving, save] = useCooldown(async () => {
 *   await api.save(data);
 * }, 2000);
 *
 * return <Button disabled={saving} onClick={save}>Save</Button>;
 * ```
 */
export function useCooldown<T extends (...args: unknown[]) => unknown>(
  fn: T,
  cooldownMs: number = 2000
): [boolean, (...args: Parameters<T>) => Promise<ReturnType<T> | undefined>, number] {
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const cooldownRef = useRef(false);
  const remainingRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      if (cooldownRef.current) return undefined;

      cooldownRef.current = true;
      setIsOnCooldown(true);
      remainingRef.current = cooldownMs;

      // Tick down remaining time every 100ms for UI display
      clearTimer();
      timerRef.current = setInterval(() => {
        remainingRef.current = Math.max(0, remainingRef.current - 100);
        if (remainingRef.current <= 0) {
          clearTimer();
          cooldownRef.current = false;
          setIsOnCooldown(false);
        }
      }, 100);

      try {
        const result = await fn(...args);
        return result as ReturnType<T>;
      } catch (e) {
        // Still respect cooldown even on error
        throw e;
      }
    },
    [fn, cooldownMs, clearTimer]
  );

  return [isOnCooldown, execute, remainingRef.current];
}
