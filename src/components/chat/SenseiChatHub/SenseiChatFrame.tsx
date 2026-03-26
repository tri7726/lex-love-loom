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
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 bg-gradient-to-b from-white to-cream/20">
        <div className="relative">
          <div className="h-32 w-32 rounded-[3.5rem] bg-white flex items-center justify-center border border-slate-50 shadow-sm animate-float">
             <Sparkles className="h-14 w-14 text-sakura opacity-20" />
          </div>
          <div className="absolute -top-2 -right-2 h-8 w-8 bg-white rounded-full shadow-md flex items-center justify-center border border-sakura/5 animate-pulse">
            <span className="text-sm">🌸</span>
          </div>
        </div>
        <div className="space-y-4 max-w-sm">
           <h3 className="text-3xl font-serif font-black text-slate-800 tracking-tight">Khởi nguồn trí tuệ</h3>
           <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em] leading-relaxed">
             Chọn một chương mục hội thoại để bắt đầu hành trình khai phóng ngôn ngữ cùng Sensei
           </p>
        </div>
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-sakura/20 to-transparent" />
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
