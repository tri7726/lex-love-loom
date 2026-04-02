import { useState, useRef, useCallback } from 'react';

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
  getAudioData: () => Uint8Array | null;
  error: string | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  // This ref acts as a resolution for the stop() promise
  const stopResolverRef = useRef<((blob: Blob | null) => void) | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    
    try {
      // 1. Request microphone with Echo Cancellation & Noise Suppression
      // This is crucial for Shadowing (so the video audio doesn't bleed in)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // 2. Setup AudioContext and Analyser for Visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser); // We don't connect to destination to avoid feedback
      
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      // 3. Setup MediaRecorder
      // Choose webm standard for web, or fallback to mp4 (Safari)
      const options = MediaRecorder.isTypeSupported('audio/webm') 
        ? { mimeType: 'audio/webm' } 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? { mimeType: 'audio/mp4' } 
          : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // When stopped, resolve the promise with the Blob
        if (stopResolverRef.current) {
          if (chunksRef.current.length > 0) {
            const blobInfo = mediaRecorderRef.current?.mimeType || 'audio/webm';
            const blob = new Blob(chunksRef.current, { type: blobInfo });
            stopResolverRef.current(blob);
          } else {
            stopResolverRef.current(null);
          }
          stopResolverRef.current = null;
        }
        cleanup();
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (err) {
      console.error("Failed to start recording:", err);
      // Determine if it's a permission error
      const errObj = err as Error;
      if (errObj.name === 'NotAllowedError' || errObj.name === 'PermissionDeniedError') {
        setError('Quyền truy cập Micro bị từ chối. Vui lòng cho phép Micro trên trình duyệt.');
      } else if (errObj.name === 'NotFoundError') {
        setError('Không tìm thấy thiết bị Micro nào.');
      } else {
        setError('Lỗi khi khởi chạy trình thu âm: ' + errObj.message);
      }
      cleanup();
      setIsRecording(false);
      throw err;
    }
  }, [cleanup]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }
      
      // Store resolve to call in the onstop event
      stopResolverRef.current = resolve;
      mediaRecorderRef.current.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      stopResolverRef.current = null; // Do not emit Blob
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
      setIsRecording(false);
    }
  }, [cleanup]);

  const getAudioData = useCallback(() => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
      return dataArrayRef.current;
    }
    return null;
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
    getAudioData,
    error,
  };
};
