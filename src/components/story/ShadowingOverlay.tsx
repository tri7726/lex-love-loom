import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, CheckCircle2, AlertCircle, Volume2, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ShadowingOverlayProps {
  targetText: string;
  jpText: string;
  onClose: () => void;
  onComplete: (score: number) => void;
}

export const ShadowingOverlay = ({ targetText, jpText, onClose, onComplete }: ShadowingOverlayProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'ja-JP';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current][0].transcript;
        setTranscript(result);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        calculateScore();
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    setTranscript('');
    setScore(null);
    setFeedback('');
    setIsRecording(true);
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const calculateScore = () => {
    if (!transcript) return;

    // Simple similarity check (for production, use more advanced string distance)
    const normalizedTarget = jpText.replace(/[、。！？]/g, '').trim();
    const normalizedTranscript = transcript.replace(/[、。！？]/g, '').trim();

    // Basic character matching logic
    let matches = 0;
    const targetChars = normalizedTarget.split('');
    const transcriptChars = normalizedTranscript.split('');
    
    targetChars.forEach(char => {
      if (transcriptChars.includes(char)) matches++;
    });

    const calculatedScore = Math.min(100, Math.round((matches / targetChars.length) * 100));
    setScore(calculatedScore);

    if (calculatedScore > 85) {
      setFeedback('Tuyệt vời! Phát âm của bạn rất chuẩn.');
    } else if (calculatedScore > 60) {
      setFeedback('Khá tốt! Hãy chú ý hơn vào các âm tiết.');
    } else {
      setFeedback('Đừng bỏ cuộc! Hãy nghe mẫu và thử lại nhé.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#2d1b24]/60 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden border border-[#ffe4e9]"
      >
        <div className="p-10 space-y-8">
           <div className="flex justify-between items-start">
              <div className="space-y-1">
                 <Badge className="bg-[#fa4b84]/10 text-[#fa4b84] border-none px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2">
                   AI Shadowing
                 </Badge>
                 <h2 className="text-3xl font-black text-[#1a1a1a] tracking-tighter">Luyện Nói Cùng Sensei</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-red-50 text-[#fa4b84]/40 hover:text-[#fa4b84]">
                 <X className="h-6 w-6" />
              </Button>
           </div>

           <div className="bg-[#fdfbf9] border-2 border-[#f5eef0] p-8 rounded-[32px] space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                 <Volume2 className="w-24 h-24 text-[#fa4b84]" />
              </div>
              
              <div className="space-y-4">
                 <p className="text-[#8c7a82] text-sm font-black uppercase tracking-widest">Mẫu của Sensei:</p>
                 <div className="bg-white p-6 rounded-2xl border border-[#ffe4e9] shadow-sm">
                    <p className="text-2xl font-japanese font-black text-[#fa4b84] tracking-wider mb-2">{jpText}</p>
                    <p className="text-[#3c2f2f] text-lg font-medium">{targetText}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <p className="text-[#8c7a82] text-sm font-black uppercase tracking-widest">Giọng của bạn:</p>
                 <div className={cn(
                   "min-h-[80px] p-6 rounded-2xl border-2 transition-all duration-500 flex items-center justify-center text-center",
                   isRecording ? "bg-[#fa4b84]/5 border-[#fa4b84] shadow-[0_0_20px_rgba(250,75,132,0.1)]" : "bg-white border-[#f5eef0]"
                 )}>
                    {transcript ? (
                      <p className="text-2xl font-japanese font-black text-[#1a1a1a] tracking-wider">{transcript}</p>
                    ) : (
                      <p className="text-[#8c7a82] italic font-medium">Nhấn Mic và bắt đầu nói...</p>
                    )}
                 </div>
              </div>
           </div>

           <div className="flex flex-col items-center gap-6">
              <div className="relative">
                 <AnimatePresence>
                   {isRecording && (
                     <motion.div 
                       initial={{ scale: 0.8, opacity: 0 }}
                       animate={{ scale: 1.5, opacity: [0, 0.3, 0] }}
                       exit={{ scale: 0.8, opacity: 0 }}
                       transition={{ repeat: Infinity, duration: 1.5 }}
                       className="absolute inset-0 bg-[#fa4b84] rounded-full -z-10"
                     />
                   )}
                 </AnimatePresence>
                 <Button 
                   onClick={isRecording ? () => recognitionRef.current?.stop() : startRecording}
                   className={cn(
                     "h-24 w-24 rounded-full shadow-2xl transition-all duration-500",
                     isRecording ? "bg-red-500 hover:bg-red-600 scale-110" : "bg-[#fa4b84] hover:bg-[#ff1a66] hover:scale-105"
                   )}
                 >
                    <Mic className={cn("h-10 w-10 transition-all", isRecording && "animate-pulse")} />
                 </Button>
              </div>

              {score !== null && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full space-y-6 text-center"
                >
                  <div className="inline-flex items-center gap-4 bg-white px-8 py-4 rounded-3xl border-2 border-[#f5eef0] shadow-xl">
                     <div className="text-center">
                        <p className="text-[10px] text-[#8c7a82] font-black uppercase tracking-widest mb-1">Độ chính xác</p>
                        <p className={cn("text-4xl font-black italic", score > 80 ? "text-green-500" : score > 50 ? "text-orange-500" : "text-red-500")}>
                          {score}%
                        </p>
                     </div>
                     <div className="h-10 w-px bg-[#f5eef0]" />
                     <div className="max-w-[200px]">
                        <p className="text-[10px] text-[#fa4b84] font-black uppercase tracking-widest mb-1">Đánh giá</p>
                        <p className="text-[#1a1a1a] font-black text-sm line-clamp-2">{feedback}</p>
                     </div>
                  </div>

                  <div className="flex gap-4">
                     <Button 
                       onClick={startRecording}
                       variant="outline"
                       className="flex-1 h-14 rounded-2xl border-2 border-[#f5eef0] text-[#1a1a1a] font-black uppercase tracking-widest text-xs hover:bg-[#fdfbf9]"
                     >
                        Thử lại
                     </Button>
                     <Button 
                       onClick={() => onComplete(score)}
                       className="flex-1 h-14 rounded-2xl bg-[#fa4b84] text-white font-black uppercase tracking-widest text-xs hover:bg-[#ff1a66] shadow-lg"
                     >
                        Tiếp tục <Zap className="ml-2 h-4 w-4" />
                     </Button>
                  </div>
                </motion.div>
              )}
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
