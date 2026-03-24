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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="h-20 w-20 rounded-[2.5rem] bg-sakura/5 flex items-center justify-center border-2 border-sakura/10 animate-bounce">
           <Sparkles className="h-10 w-10 text-sakura" />
        </div>
        <div className="space-y-2">
           <h3 className="text-xl font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Sensei Chat Hub</h3>
           <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium italic">
             "Chọn một hội thoại hoặc tạo mới để bắt đầu mổ xẻ tiếng Nhật cùng Sensei!"
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white/30 dark:bg-slate-950/30">
      {/* Sticky Header */}
      <header className="px-6 py-4 border-b border-sakura/10 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
           <div className="h-8 w-8 rounded-lg bg-sakura/10 flex items-center justify-center text-sakura">
              <Sparkles className="h-4 w-4" />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sakura leading-none mb-1">Đang trò chuyện</p>
              <h2 className="text-sm font-bold truncate text-slate-800 dark:text-slate-100">{conversation.title || 'Hội thoại không tên'}</h2>
           </div>
        </div>
      </header>

      {/* Message Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-6 h-[calc(100vh-320px)]">
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
