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
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 bg-transparent relative overflow-hidden">
        {/* Simplified Decorative elements for Zen feel */}
        <div className="absolute top-1/4 left-1/4 h-64 w-64 bg-sakura/5 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="h-40 w-40 rounded-[4rem] bg-white/40 backdrop-blur-xl flex items-center justify-center border border-sakura/10 shadow-soft animate-float mb-12">
             <Sparkles className="h-20 w-20 text-sakura opacity-40 shadow-sakura" />
          </div>
          
          <h2 className="text-4xl md:text-6xl font-medium text-slate-800 mb-6 font-serif max-w-3xl leading-tight tracking-tight">
            Khai phóng bản lĩnh Tiếng Nhật
          </h2>
          <p className="text-xs md:text-sm text-slate-400 uppercase tracking-[0.5em] font-medium max-w-lg leading-loose opacity-70">
            Chọn một chương mục hội thoại để bắt đầu hành trình cùng Sensei
          </p>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-sakura/20 to-transparent mt-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      {/* Message Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-6 md:px-12 hide-scrollbar">
        <div className="max-w-[80%] mx-auto py-8 pb-24 space-y-8">
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
