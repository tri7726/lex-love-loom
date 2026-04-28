import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(totalSeconds: number, onTimeout?: () => void) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

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
  }, [isActive, timeLeft]);

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
