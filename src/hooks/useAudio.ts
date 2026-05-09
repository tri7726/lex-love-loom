import { useCallback, useRef } from 'react';

const SOUND_URLS: Record<string, string> = {
  correct: '/sounds/correct.mp3',
  incorrect: '/sounds/incorrect.mp3',
  levelup: '/sounds/levelup.mp3',
  notification: '/sounds/notification.mp3',
  streak: '/sounds/streak.mp3',
};

export const useAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((soundName: string, volume: number = 0.5) => {
    const url = SOUND_URLS[soundName];
    if (!url) {
      console.log(`[Audio] No URL configured for: ${soundName}`);
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      const audio = new Audio(url);
      audio.volume = volume;
      audioRef.current = audio;
      audio.play().catch(() => {
        // Autoplay may be blocked — that's OK, just ignore
      });
    } catch {
      console.log(`[Audio] Failed to play: ${soundName}`);
    }
  }, []);

  return { playSound };
};
