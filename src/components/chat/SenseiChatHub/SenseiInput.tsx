import React, { useState, useRef } from 'react';
import { Send, Camera, Mic, MicOff, Sparkles, Languages, Loader2, BookOpen, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SenseiMessageType, SenseiMode } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface SenseiInputProps {
  onSend: (content: string, type: SenseiMessageType, metadata?: any) => void;
  isLoading: boolean;
  isAnalyzingImage?: boolean;
  setIsAnalyzingImage?: (val: boolean) => void;
  isGuest?: boolean;
  guestMessageCount?: number;
  activeMode?: SenseiMode;
}

export const SenseiInput: React.FC<SenseiInputProps> = ({ 
  onSend, 
  isLoading, 
  isAnalyzingImage = false, 
  setIsAnalyzingImage = () => {},
  isGuest = false,
  guestMessageCount = 0,
  activeMode = 'tutor'
}) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<SenseiMessageType>('text');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Speech Recognition (Fix #2) ──
  const { isListening, startListening, stopListening, isSupported: isSpeechSupported } 
    = useSpeechRecognition({
        lang: activeMode === 'speaking' ? 'ja-JP' : 'vi-VN',
        onResult: (transcript) => setText(transcript),
      });

  const isLimited = isGuest && guestMessageCount >= 5;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLimited) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    if ((!text.trim() && !selectedImage) || isLoading || isLimited) return;
    if (isListening) stopListening();
    
    if (selectedImage) {
      onSend(text, 'image', { imageUrl: selectedImage });
    } else {
      onSend(text, mode);
    }
    
    setText('');
    setMode('text');
    setSelectedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    if (!isSpeechSupported) {
      toast.error("Trình duyệt của bạn chưa hỗ trợ nhận giọng nói.");
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      setText('');
      startListening();
      toast.info(activeMode === 'speaking' ? "🎙️ Đang lắng nghe tiếng Nhật..." : "🎙️ Đang lắng nghe...");
    }
  };

  // ── Mode-aware chips (Fix #4) ──
  const getChips = (): { id: SenseiMessageType; label: string; icon: React.FC<{ className?: string }> }[] => {
    switch (activeMode) {
      case 'speaking':
        return [
          { id: 'text', label: 'Luyện nói', icon: Sparkles },
          { id: 'correction', label: 'Sửa phát âm', icon: Languages },
        ];
      case 'analysis':
        return [
          { id: 'analysis', label: 'Phân tích', icon: Sparkles },
          { id: 'correction', label: 'Sửa lỗi', icon: Languages },
        ];
      case 'roleplay':
        return [
          { id: 'text', label: 'Nhập vai', icon: MessageSquare },
          { id: 'analysis', label: 'Hỏi Sensei', icon: BookOpen },
        ];
      default:
        return [
          { id: 'text', label: 'Chat', icon: Sparkles },
          { id: 'analysis', label: 'Phân tích', icon: Sparkles },
          { id: 'correction', label: 'Sửa lỗi', icon: Languages },
        ];
    }
  };

  const getPlaceholder = () => {
    if (isListening) return "🎙️ Đang lắng nghe... hãy nói vào micro";
    if (activeMode === 'speaking') return "Nhập hoặc nói câu tiếng Nhật để luyện tập...";
    if (activeMode === 'roleplay') return "Nói điều gì đó trong nhân vật của bạn...";
    if (mode === 'analysis') return "Phân tích mẫu câu...";
    if (mode === 'correction') return "Kiểm tra ngữ pháp...";
    return "Thổ lộ cùng Sensei...";
  };

  const chips = getChips();

  return (
    <div className="p-2 md:p-3 bg-transparent space-y-4">
      {!isLimited && (
        <div className="flex gap-4 mb-2 overflow-x-auto no-scrollbar pb-1">
          {chips.map((chip) => {
            const isActive = mode === chip.id;
            return (
              <Button
                key={chip.id}
                variant="outline"
                size="sm"
                onClick={() => setMode(chip.id as SenseiMessageType)}
                className={cn(
                  "rounded-2xl px-6 h-10 text-[10px] font-black uppercase tracking-[0.3em] transition-all gap-2 shrink-0 border-0",
                  isActive 
                    ? "bg-white text-sakura shadow-sm ring-1 ring-sakura/10" 
                    : "bg-sakura/5 text-sakura/30 hover:bg-sakura/10 hover:text-sakura"
                )}
              >
                <chip.icon className="h-3.5 w-3.5" />
                {chip.label}
              </Button>
            );
          })}
        </div>
      )}

      <div className="relative group max-w-5xl mx-auto">
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
        />
        
        {isLimited ? (
          <div className="min-h-[100px] w-full rounded-[2.5rem] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-sakura/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-sakura" />
              </div>
              <span className="text-sm font-bold text-foreground font-serif">Khai mở tiềm năng Pro Max</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4 font-medium">
              Bạn đã hết lượt dùng thử. Đăng nhập để tiếp tục hành trình tinh hoa.
            </p>
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="rounded-full bg-sakura hover:bg-sakura-dark text-white px-8 py-2 h-10 text-xs font-bold uppercase tracking-widest shadow-lg shadow-sakura/20 transition-all hover:scale-105 active:scale-95"
            >
              Đăng nhập ngay 🌸
            </Button>
          </div>
        ) : (
          <>
            {selectedImage && (
              <div className="absolute left-6 bottom-24 z-10 animate-in fade-in slide-in-from-bottom-2">
                <div className="relative group/img h-20 w-20 rounded-2xl overflow-hidden border-2 border-sakura shadow-lg">
                  <img src={selectedImage} alt="Selected" className="h-full w-full object-cover" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    <Loader2 className="h-3 w-3 rotate-45" />
                  </button>
                </div>
              </div>
            )}
            <div className="absolute left-6 bottom-4 flex items-center gap-2 z-10">
              <Button 
                variant="ghost" size="icon" 
                disabled={isLoading || isAnalyzingImage}
                className="h-12 w-12 rounded-2xl text-slate-300 hover:text-sakura hover:bg-sakura/5 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                {isAnalyzingImage ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              </Button>

              <Button 
                variant="ghost" size="icon" 
                className={cn(
                  "h-12 w-12 rounded-2xl transition-all",
                  isListening 
                    ? "text-red-500 bg-red-50 animate-pulse hover:bg-red-100" 
                    : "text-slate-300 hover:text-sakura hover:bg-sakura/5"
                )}
                onClick={handleMicClick}
                title={isListening ? "Nhấn để dừng nghe" : "Nhấn để nói"}
              >
                {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className={cn(
                "min-h-[100px] max-h-[250px] w-full pl-36 pr-16 py-6 rounded-[2.5rem] border-0 bg-white shadow-[0_15px_40px_-10px_rgba(0,0,0,0.03)] focus-visible:ring-sakura/5 resize-none font-serif text-lg transition-all placeholder:italic placeholder:text-slate-200",
                mode === 'analysis' && "ring-1 ring-rose-50",
                mode === 'correction' && "ring-1 ring-blue-50",
                isListening && "ring-2 ring-red-200"
              )}
            />

            <div className="absolute right-4 bottom-4 z-10">
              <Button
                onClick={handleSend}
                disabled={(!text.trim() && !selectedImage) || isLoading}
                className={cn(
                   "h-12 w-12 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 duration-300",
                   mode === 'analysis' ? "bg-rose-500 hover:bg-rose-600" :
                   mode === 'correction' ? "bg-blue-500 hover:bg-blue-600" :
                   "bg-slate-900 hover:bg-black shadow-slate-200"
                )}
              >
                <Send className="h-6 w-6 text-white" />
              </Button>
            </div>
          </>
        )}
      </div>
      
      {!isLimited && (
        <p className="text-center text-[9px] text-slate-200 font-black uppercase tracking-[0.5em] pb-2">
          {isListening ? "🔴 Đang ghi âm — Nói thật tự nhiên" : "Đàm đạo tinh hoa"}
        </p>
      )}
    </div>
  );
};
