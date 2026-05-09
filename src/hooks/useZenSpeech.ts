import { useCallback, useRef } from 'react';
import { KANJI_DB } from '@/data/kanji-db';

export const useZenSpeech = () => {
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  const getVoice = (lang: string) => {
    const voices = synthRef.current.getVoices();
    // Try to find a precise match
    let voice = voices.find(v => v.lang.startsWith(lang));
    // Fallback for Vietnamese if 'vi-VN' not found
    if (!voice && lang === 'vi') voice = voices.find(v => v.lang.includes('vi'));
    // Fallback for Japanese if 'ja-JP' not found
    if (!voice && lang === 'ja') voice = voices.find(v => v.lang.includes('ja'));
    
    return voice;
  };

  const speak = useCallback((text: string, lang: string, rate: number = 0.9) => {
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = getVoice(lang);
      if (voice) utterance.voice = voice;
      utterance.lang = lang === 'ja' ? 'ja-JP' : 'vi-VN';
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synthRef.current.speak(utterance);
    });
  }, []);

  const readKanjiWisdom = useCallback(async (kanjiChar: string) => {
    const entry = KANJI_DB.find(k => k.character === kanjiChar);
    if (!entry) return;

    // Stop any current speech
    synthRef.current.cancel();

    // 1. Han-Viet & Meaning (Vietnamese)
    const hanvietPart = `Hán Việt: ${entry.hanviet}.`;
    const meaningPart = `Nghĩa là: ${entry.meaning_vi}.`;
    
    await speak(hanvietPart, 'vi');
    await speak(meaningPart, 'vi', 0.85);

    // 2. Readings (Japanese)
    if (entry.on_reading) {
      await speak("Âm On.", 'vi');
      await speak(entry.on_reading, 'ja', 0.8);
    }
    
    if (entry.kun_reading) {
      await speak("Âm Kun.", 'vi');
      await speak(entry.kun_reading, 'ja', 0.8);
    }
  }, [speak]);

  return { readKanjiWisdom, isSpeaking: synthRef.current.speaking };
};
