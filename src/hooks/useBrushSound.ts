import { useRef, useCallback } from 'react';

/**
 * A hook that synthesizes a "brush-on-paper" sound using Web Audio API.
 * This avoids the need for external MP3 files while providing low-latency, 
 * dynamic feedback based on writing speed.
 */
export const useBrushSound = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playStrokeSound = useCallback((intensity: number = 1.0) => {
    initAudio();
    const ctx = audioCtxRef.current!;
    if (!ctx || ctx.state === 'suspended') return;

    // Create noise source
    const bufferSize = ctx.sampleRate * 0.15; // 150ms burst
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter: Higher intensity = Higher frequency (more "friction")
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const baseFreq = 600;
    const maxFreq = 1800;
    const targetFreq = Math.min(maxFreq, baseFreq + (intensity * 800));
    filter.frequency.setValueAtTime(targetFreq, ctx.currentTime);
    filter.Q.value = 1;

    const gain = ctx.createGain();
    const baseGain = 0.02;
    const targetGain = Math.min(0.08, baseGain * intensity);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + 0.15);
  }, []);

  return { playStrokeSound };
};
