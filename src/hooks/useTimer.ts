import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(totalSeconds: number, onTimeout?: () => void) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(false);
  const onTimeoutRef = useRef(onTimeout);
  const isActiveRef = useRef(false);
  onTimeoutRef.current = onTimeout;

  // Sync ref with state so the interval closure always reads latest value
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (next <= 0) {
          setIsActive(false);
          onTimeoutRef.current?.();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]); // removed timeLeft to avoid restarting every second

  const start = useCallback(() => {
    setTimeLeft(totalSeconds);
    setIsActive(true);
  }, [totalSeconds]);

  const stop = useCallback(() => setIsActive(false), []);

  const reset = useCallback(() => {
    setTimeLeft(totalSeconds);
    setIsActive(false);
  }, [totalSeconds]);

  return { timeLeft, isActive, start, stop, reset };
}
