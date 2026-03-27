import React, { useState, useRef } from 'react';
import { Send, Camera, Mic, Sparkles, Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SenseiMessageType } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SenseiInputProps {
  onSend: (content: string, type: SenseiMessageType, metadata?: any) => void;
  isLoading: boolean;
  isAnalyzingImage?: boolean;
  setIsAnalyzingImage?: (val: boolean) => void;
  isGuest?: boolean;
  guestMessageCount?: number;
}

export const SenseiInput: React.FC<SenseiInputProps> = ({ 
  onSend, 
  isLoading, 
  isAnalyzingImage = false, 
  setIsAnalyzingImage = () => {},
  isGuest = false,
  guestMessageCount = 0
}) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<SenseiMessageType>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLimited = isGuest && guestMessageCount >= 5;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLimited) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];

      try {
        const { data, error } = await supabase.functions.invoke('japanese-analysis', {
          body: {
            image: base64Data,
            isImageAnalysis: true,
            isVip: true,
          },
        });

        if (error) throw error;
        
        if (data.format === 'vision') {
          onSend(
            `Sensei, hãy phân tích vật thể này: ${data.result.object_name}`, 
            'image', 
            { visionResult: data.result, imageUrl: base64 }
          );
        }
      } catch (err) {
        console.error('OCR Error:', err);
        toast.error("Sensei không thể nhìn rõ ảnh này, hãy thử lại nhé!");
      } finally {
        setIsAnalyzingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    if (!text.trim() || isLoading || isLimited) return;
    onSend(text, mode);
    setText('');
    setMode('text');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chips = [
    { id: 'text', label: 'Chat', icon: Sparkles },
    { id: 'analysis', label: 'Phân tích', icon: Sparkles },
    { id: 'correction', label: 'Sửa lỗi', icon: Languages },
  ];

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
                className="h-12 w-12 rounded-2xl text-slate-300 hover:text-sakura hover:bg-sakura/5 transition-all"
              >
                <Mic className="h-6 w-6" />
              </Button>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'analysis' ? "Phân tích mẫu câu..." :
                mode === 'correction' ? "Kiểm tra ngữ pháp..." :
                "Thổ lộ cùng Sensei..."
              }
              className={cn(
                "min-h-[100px] max-h-[250px] w-full pl-36 pr-16 py-6 rounded-[2.5rem] border-0 bg-white shadow-[0_15px_40px_-10px_rgba(0,0,0,0.03)] focus-visible:ring-sakura/5 resize-none font-serif text-lg transition-all placeholder:italic placeholder:text-slate-200",
                mode === 'analysis' && "ring-1 ring-rose-50",
                mode === 'correction' && "ring-1 ring-blue-50"
              )}
            />

            <div className="absolute right-4 bottom-4 z-10">
              <Button
                onClick={handleSend}
                disabled={!text.trim() || isLoading}
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
          Đàm đạo tinh hoa
        </p>
      )}
    </div>
  );
};
