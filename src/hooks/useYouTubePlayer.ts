import { useState, useEffect, useCallback, useRef } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface UseYouTubePlayerProps {
  videoId: string;
  containerId: string;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
}

export const useYouTubePlayer = ({
  videoId,
  containerId,
  onReady,
  onStateChange,
}: UseYouTubePlayerProps) => {
  const [player, setPlayer] = useState<unknown>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<unknown>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initPlayer;
    };

    const initPlayer = () => {
      if (playerRef.current) {
        (playerRef.current as { destroy?: () => void }).destroy?.();
      }

      const container = document.getElementById(containerId);
      if (!container) return;

      playerRef.current = new (window.YT as { Player: new (id: string, opts: object) => unknown }).Player(containerId, {
        videoId,
        playerVars: {
          controls: 1,
          modestbranding: 1,
          rel: 0,
          cc_load_policy: 0,
        },
        events: {
          onReady: (event: { target: unknown }) => {
            setPlayer(event.target);
            setIsReady(true);
            onReady?.();
          },
          onStateChange: (event: { data: number }) => {
            onStateChange?.(event.data);
          },
        },
      });
    };

    loadYouTubeAPI();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [videoId, containerId, onReady, onStateChange]);

  // Track current time
  useEffect(() => {
    if (isReady && player) {
      intervalRef.current = setInterval(() => {
        const time = (player as { getCurrentTime?: () => number }).getCurrentTime?.() || 0;
        setCurrentTime(time);
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isReady, player]);

  const play = useCallback(() => {
    (player as { playVideo?: () => void })?.playVideo?.();
  }, [player]);

  const pause = useCallback(() => {
    (player as { pauseVideo?: () => void })?.pauseVideo?.();
  }, [player]);

  const seekTo = useCallback((seconds: number, allowSeekAhead = true) => {
    (player as { seekTo?: (s: number, a: boolean) => void })?.seekTo?.(seconds, allowSeekAhead);
  }, [player]);

  const playSegment = useCallback((startTime: number, endTime: number) => {
    if (!player) return;
    
    seekTo(startTime);
    play();

    // Set up timeout to pause at end time
    const duration = (endTime - startTime) * 1000;
    setTimeout(() => {
      const current = (player as { getCurrentTime?: () => number }).getCurrentTime?.() || 0;
      if (current >= startTime && current <= endTime + 0.5) {
        pause();
      }
    }, duration);
  }, [player, seekTo, play, pause]);

  return {
    player,
    isReady,
    currentTime,
    play,
    pause,
    seekTo,
    playSegment,
  };
};

// export default useYouTubePlayer;
