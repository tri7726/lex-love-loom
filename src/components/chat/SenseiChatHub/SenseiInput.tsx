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
  isAnalyzingImage: boolean;
  setIsAnalyzingImage: (val: boolean) => void;
}

export const SenseiInput: React.FC<SenseiInputProps> = ({ 
  onSend, isLoading, isAnalyzingImage, setIsAnalyzingImage 
}) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<SenseiMessageType>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          // Send the recognized object as a message with the full result as metadata
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
    if (!text.trim() || isLoading) return;
    onSend(text, mode);
    setText('');
    setMode('text'); // Reset to default after send
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chips = [
    { id: 'text', label: 'Chat', icon: Sparkles, color: 'hover:bg-sakura/10 text-sakura border-sakura/20' },
    { id: 'analysis', label: 'Phân tích', icon: Sparkles, color: 'hover:bg-rose-500/10 text-rose-500 border-rose-500/20' },
    { id: 'correction', label: 'Sửa lỗi', icon: Languages, color: 'hover:bg-blue-500/10 text-blue-500 border-blue-500/20' },
  ];

  return (
    <div className="p-4 md:p-6 border-t border-sakura/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl space-y-4">
      <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
        {chips.map((chip) => {
          const isActive = mode === chip.id;
          return (
            <Button
              key={chip.id}
              variant="outline"
              size="sm"
              onClick={() => setMode(chip.id as SenseiMessageType)}
              className={cn(
                "rounded-full px-4 h-8 text-[10px] font-black uppercase tracking-widest transition-all gap-1.5 shrink-0 border-2",
                chip.color,
                isActive ? "bg-current text-white scale-105 shadow-md" : "bg-background/50"
              )}
            >
              <chip.icon className="h-3 w-3" />
              {chip.label}
            </Button>
          );
        })}
      </div>

      <div className="relative group">
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
        />
        <div className="absolute left-3 bottom-3 flex items-center gap-1 z-10">
          <Button 
            variant="ghost" size="icon" 
            disabled={isLoading || isAnalyzingImage}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-sakura hover:bg-sakura/10 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            {isAnalyzingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          </Button>
          <Button 
            variant="ghost" size="icon" 
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-sakura hover:bg-sakura/10 transition-all"
          >
            <Mic className="h-5 w-5" />
          </Button>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'analysis' ? "Nhập từ vựng hoặc đoạn văn cần mổ xẻ..." :
            mode === 'correction' ? "Nhập câu tiếng Nhật cần kiểm tra ngữ pháp..." :
            "Nhắn gì đó cho Sensei..."
          }
          className={cn(
            "min-h-[100px] w-full pl-24 pr-14 py-4 rounded-3xl border-2 border-sakura/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md focus-visible:ring-sakura/30 focus-visible:border-sakura/30 resize-none text-sm transition-all",
            mode === 'analysis' && "border-rose-500/30 ring-rose-500/10",
            mode === 'correction' && "border-blue-500/30 ring-blue-500/10"
          )}
        />

        <div className="absolute right-3 bottom-3 z-10">
          <Button
            onClick={handleSend}
            disabled={!text.trim() || isLoading}
            className={cn(
               "h-9 w-9 rounded-xl shadow-lg transition-all",
               mode === 'analysis' ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20" :
               mode === 'correction' ? "bg-blue-500 hover:bg-blue-600 shadow-blue-500/20" :
               "bg-sakura hover:bg-sakura/90 shadow-sakura/20"
            )}
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
      
      <p className="text-center text-[9px] text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-60">
        Giữ <kbd className="px-1 py-0.5 rounded bg-muted">Shift</kbd> + <kbd className="px-1 py-0.5 rounded bg-muted">Enter</kbd> để xuống dòng
      </p>
    </div>
  );
};
