import { useState, useCallback, useEffect, useRef } from 'react';

export type TTSSpeed = 0.5 | 0.75 | 1 | 1.25;

interface UseTTSOptions {
  lang?: string;
  rate?: TTSSpeed;
  pitch?: number;
}

interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  rate: TTSSpeed;
  setRate: (rate: TTSSpeed) => void;
}

// Get rate from localStorage or default
const getStoredRate = (): TTSSpeed => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('tts-rate');
  if (stored) {
    const parsed = parseFloat(stored) as TTSSpeed;
    if ([0.5, 0.75, 1, 1.25].includes(parsed)) {
      return parsed;
    }
  }
  return 1;
};

export const useTTS = (options: UseTTSOptions = {}): UseTTSReturn => {
  const { lang = 'ja-JP', rate: initialRate, pitch = 1 } = options;
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRateState] = useState<TTSSpeed>(initialRate || getStoredRate());
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const setRate = useCallback((newRate: TTSSpeed) => {
    setRateState(newRate);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts-rate', String(newRate));
    }
  }, []);

  // Load voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      // Filter voices for the specified language
      const languageVoices = availableVoices.filter(
        (voice) => voice.lang.startsWith(lang.split('-')[0])
      );
      
      setVoices(languageVoices.length > 0 ? languageVoices : availableVoices);
      
      // Auto-select best Japanese voice
      if (!selectedVoice && languageVoices.length > 0) {
        // Prefer Google voices for better quality
        const googleVoice = languageVoices.find(v => 
          v.name.toLowerCase().includes('google') || 
          v.name.toLowerCase().includes('haruka') ||
          v.name.toLowerCase().includes('sayaka')
        );
        setSelectedVoice(googleVoice || languageVoices[0]);
      }
    };

    loadVoices();
    
    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isSupported, lang, selectedVoice]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, lang, rate, pitch, selectedVoice]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    rate,
    setRate,
  };
};

export default useTTS;
