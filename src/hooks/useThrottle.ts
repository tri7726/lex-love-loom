import { useRef, useEffect, useState } from 'react';

/**
 * Throttle a callback: at most one invocation per `delay` ms.
 * The last call within the window wins — trailing edge fires.
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 1000
): (...args: Parameters<T>) => void {
  const lastCall = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgs = useRef<Parameters<T> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const throttledFn = (...args: Parameters<T>) => {
    const now = Date.now();
    const elapsed = now - lastCall.current;

    if (elapsed >= delay) {
      lastCall.current = now;
      callbackRef.current(...args);
    } else {
      lastArgs.current = args;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        lastCall.current = Date.now();
        if (lastArgs.current) {
          callbackRef.current(...lastArgs.current);
          lastArgs.current = null;
        }
      }, delay - elapsed);
    }
  };

  return throttledFn;
}

/**
 * Throttle a value: returns the last value that was set at least `delay` ms ago.
 * Unlike `useDebounce`, updates fire immediately on first call
 * but subsequent updates are blocked until `delay` ms have passed.
 */
export function useThrottledValue<T>(value: T, delay: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastUpdate = useRef(0);

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastUpdate.current;

    if (elapsed >= delay) {
      lastUpdate.current = now;
      setThrottled(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdate.current = Date.now();
        setThrottled(value);
      }, delay - elapsed);
      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttled;
}
