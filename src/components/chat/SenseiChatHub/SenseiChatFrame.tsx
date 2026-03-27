import React, { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { SenseiMessage, SenseiConversation } from './types';
import { Sparkles } from 'lucide-react';

interface SenseiChatFrameProps {
  conversation: SenseiConversation | null;
  messages: SenseiMessage[];
  isLoading: boolean;
  onSaveWord: (word: string) => void;
  onSpeak: (text: string) => void;
}

export const SenseiChatFrame: React.FC<SenseiChatFrameProps> = ({
  conversation, messages, isLoading, onSaveWord, onSpeak
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 bg-gradient-to-b from-transparent via-white/50 to-sakura/5 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-1/4 -left-20 h-96 w-96 bg-sakura/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 h-96 w-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10">
          <div className="h-40 w-40 rounded-[4rem] bg-white/80 backdrop-blur-md flex items-center justify-center border border-sakura/10 shadow-[0_20px_50px_-15px_rgba(255,183,197,0.2)] animate-float">
             <Sparkles className="h-16 w-16 text-sakura opacity-40" />
          </div>
          <div className="absolute -top-4 -right-4 h-12 w-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-sakura/10 animate-pulse">
            <span className="text-xl">🌸</span>
          </div>
        </div>
        
        <div className="space-y-4 max-w-md z-10">
           <h3 className="text-4xl font-serif font-black text-slate-800 tracking-tight leading-tight">
             Khai phóng bản lĩnh Tiếng Nhật
           </h3>
           <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.4em] leading-relaxed max-w-xs mx-auto">
             Chọn một chương mục hội thoại để bắt đầu hành trình cùng Sensei
           </p>
        </div>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-sakura/30 to-transparent z-10" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Message Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-4">
          {messages?.map((m) => (
            <ChatMessage 
              key={m.id} 
              message={m} 
              onSaveWord={onSaveWord}
              onSpeak={onSpeak}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-6">
               <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl rounded-tl-none border border-sakura/10 shadow-sm flex gap-2">
                  <div className="h-2 w-2 bg-sakura rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 bg-sakura rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 bg-sakura rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
