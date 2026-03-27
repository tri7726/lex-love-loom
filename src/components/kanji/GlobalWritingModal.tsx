import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { WordWritingLab } from './WordWritingLab';
import { X, Sparkles, PenTool, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GlobalWritingModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: string;
}

export const GlobalWritingModal: React.FC<GlobalWritingModalProps> = ({
  isOpen,
  onClose,
  word,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[3rem] border-none bg-cream/95 backdrop-blur-xl shadow-2xl">
        <div className="relative h-full flex flex-col md:flex-row min-h-[600px]">
          {/* Sidebar / Info */}
          <div className="w-full md:w-80 bg-sakura/5 p-8 flex flex-col justify-between border-r border-sakura/10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <PenTool className="h-5 w-5 text-sakura" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-slate-800 text-lg uppercase tracking-tight">Writing Lab</h3>
                  <div className="h-0.5 w-12 bg-sakura rounded-full" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-sakura/60 uppercase tracking-widest">Đang luyện tập</p>
                <h2 className="text-5xl font-jp font-black text-slate-900 break-all leading-tight">
                  {word}
                </h2>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3 p-4 bg-white/60 rounded-2xl border border-sakura/5 text-xs text-slate-500 italic leading-relaxed">
                  <Sparkles className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <p>"Nét chữ nết người – Hãy tập trung cao độ vào từng điểm dừng bút để đạt độ chuẩn xác nghệ nhân."</p>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 rounded-xl border-sakura/20 text-slate-600 hover:bg-sakura/5"
                  onClick={() => {
                    onClose();
                    window.location.href = `/vocabulary?search=${word}`;
                  }}
                >
                  <BookOpen className="h-4 w-4 text-sakura" />
                  <span className="text-xs font-bold">Xem chi tiết từ điển</span>
                </Button>
              </div>
            </div>

            <Button 
              variant="ghost" 
              onClick={onClose}
              className="mt-8 rounded-xl h-12 text-slate-400 hover:bg-sakura/5 hover:text-sakura group transition-all"
            >
              <X className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
              Đóng Phòng Lab
            </Button>
          </div>

          {/* Main Lab Area */}
          <div className="flex-1 p-8 md:p-12 flex items-center justify-center bg-white/40">
            {/* Ink-Bleed SVG Filter Definition */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
              <filter id="ink-bleed">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
                <feGaussianBlur stdDeviation="0.4" />
              </filter>
            </svg>

            {/* Background Zen Audio */}
            <audio 
              autoPlay 
              loop 
              src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3" 
              className="hidden"
              onPlay={(e) => { e.currentTarget.volume = 0.2; }}
            />
            
            <ScrollArea className="w-full h-full max-h-[80vh]">
              <div className="flex flex-col items-center justify-center min-h-full py-8">
                <div style={{ filter: 'url(#ink-bleed)' }}>
  <WordWritingLab word={word} size={360} />
</div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Decorative Sakura Petals */}
        <div className="absolute top-10 right-10 pointer-events-none opacity-20 animate-float">
          <span className="text-3xl">🌸</span>
        </div>
        <div className="absolute bottom-20 left-10 pointer-events-none opacity-10 animate-float-slow">
          <span className="text-2xl">💮</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
