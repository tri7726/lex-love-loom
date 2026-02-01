import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechToTextOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface UseSpeechToTextReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  error: string | null;
}

// Check if SpeechRecognition is available
const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
};

export const useSpeechToText = (options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn => {
  const {
    lang = 'ja-JP',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const SpeechRecognition = getSpeechRecognition();
  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    if (!isSupported) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      let errorMessage = 'Lỗi nhận diện giọng nói';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Không phát hiện giọng nói';
          break;
        case 'audio-capture':
          errorMessage = 'Không tìm thấy microphone';
          break;
        case 'not-allowed':
          errorMessage = 'Quyền truy cập microphone bị từ chối';
          break;
        case 'network':
          errorMessage = 'Lỗi kết nối mạng';
          break;
        case 'aborted':
          errorMessage = 'Đã dừng nhận diện';
          break;
      }
      
      setError(errorMessage);
      setIsListening(false);
      onError?.(errorMessage);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);
      onResult?.(currentTranscript, !!finalTranscript);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [isSupported, lang, continuous, interimResults, onResult, onError]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Trình duyệt không hỗ trợ nhận diện giọng nói');
      return;
    }

    setTranscript('');
    setError(null);
    
    try {
      recognitionRef.current?.start();
    } catch (e) {
      // Already started
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      // Already stopped
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    error,
  };
};

export default useSpeechToText;
