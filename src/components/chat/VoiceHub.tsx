import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WaveVisualizer } from './WaveVisualizer';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTTS } from '@/hooks/useTTS';

interface VoiceHubProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt?: string;
}

export const VoiceHub: React.FC<VoiceHubProps> = ({ isOpen, onClose, systemPrompt }) => {
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-lg bg-white dark:bg-slate-900 border-none rounded-[3rem] shadow-2xl relative overflow-hidden">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="absolute top-6 right-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-6 w-6" />
        </Button>
        
        <div className="p-12 flex flex-col items-center gap-12 text-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-black">AI Voice Hub</h2>
            <p className="text-slate-400">Nói chuyện trực tiếp với Sensei</p>
          </div>

          <div className="relative">
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={isListening ? stopListening : startListening}
               className={cn(
                 "w-32 h-32 rounded-full flex items-center justify-center text-white shadow-2xl transition-all",
                 isListening ? "bg-red-500 ring-8 ring-red-500/20" : "bg-sakura shadow-rose-200"
               )}
             >
               {isListening ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
             </motion.button>
          </div>

          <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl min-h-[100px] flex items-center justify-center italic text-slate-500">
            {transcript || "Đang nghe..."}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

interface CardProps {
  children: React.ReactNode;
  className?: string;
}
const Card = ({ children, className }: CardProps) => (
  <div className={className}>{children}</div>
);
