import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Languages, CheckCircle2, Info, Volume2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SenseiMessage } from './types';

interface ChatMessageProps {
  message: SenseiMessage;
  onSaveWord?: (word: string) => void;
  onSpeak?: (text: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSaveWord, onSpeak }) => {
  const isAssistant = message.role === 'assistant';

  const renderContent = () => {
    switch (message.type) {
      case 'analysis':
        return (
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest">
                <Sparkles className="h-3 w-3" />
                Phân tích chuyên sâu
             </div>
             <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
             {/* We can add buttons here for specific words detected in the analysis */}
          </div>
        );
      case 'image':
        const vision = (message.metadata as any)?.visionResult;
        const imageUrl = (message.metadata as any)?.imageUrl;
        if (!vision) return <div className="text-sm">{message.content}</div>;
        
        return (
          <div className="space-y-4">
             {imageUrl && (
               <div className="relative rounded-xl overflow-hidden border border-sakura/20 shadow-sm max-w-xs">
                 <img src={imageUrl} alt="Analysis" className="w-full h-full object-cover" />
               </div>
             )}
             <div className="space-y-1">
                <Badge className="bg-sakura/10 text-sakura border-0 text-[11px] uppercase font-black px-2 py-0.5 rounded-md">Nhận diện vật thể</Badge>
                <h3 className="text-xl font-jp font-black text-sakura">{vision.object_name}</h3>
                <p className="text-sm font-bold text-muted-foreground italic">"{vision.vietnamese_meaning}"</p>
             </div>
             
             <div className="p-3 bg-sakura/5 rounded-xl border border-sakura/10 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tóm tắt của Sensei</p>
                <p className="text-xs leading-relaxed italic">{vision.description}</p>
             </div>

             <div className="grid grid-cols-1 gap-2">
                {vision.vocabulary?.slice(0, 3).map((v: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-sakura/5">
                    <div className="flex flex-col">
                      <span className="text-xs font-jp font-bold">{v.word}</span>
                      <span className="text-[9px] text-muted-foreground">{v.reading} - {v.meaning}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onSaveWord?.(v.word)}>
                      <Save className="h-3 w-3 text-sakura" />
                    </Button>
                  </div>
                ))}
             </div>
          </div>
        );
      case 'correction':
        return (
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest">
                <Languages className="h-3 w-3" />
                Sửa lỗi ngữ pháp
             </div>
             <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 text-sm">
                {message.content}
             </div>
          </div>
        );
      default:
        return <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex w-full gap-3 mb-6",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sakura to-pink-500 flex items-center justify-center text-white shrink-0 shadow-md">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      
      <div className={cn(
        "max-w-[85%] md:max-w-[70%] rounded-2xl p-4 relative group",
        isAssistant 
          ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-sakura/10 text-foreground shadow-sm rounded-tl-none" 
          : "bg-sakura text-white shadow-lg shadow-sakura/20 rounded-tr-none"
      )}>
        {renderContent()}
        
        {isAssistant && (
          <div className="absolute -bottom-10 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-sakura/10" onClick={() => onSpeak?.(message.content)}>
              <Volume2 className="h-3.5 w-3.5 text-sakura" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-sakura/10">
              <Save className="h-3.5 w-3.5 text-sakura" />
            </Button>
          </div>
        )}
      </div>

      {!isAssistant && (
        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 border border-slate-300 dark:border-slate-700">
           B
        </div>
      )}
    </motion.div>
  );
};
