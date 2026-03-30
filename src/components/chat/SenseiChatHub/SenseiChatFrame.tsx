import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { SenseiMessage, SenseiConversation, SenseiMode } from './types';
import { Sparkles, MessageSquare, Mic, Languages } from 'lucide-react';

interface SenseiChatFrameProps {
  conversation: SenseiConversation | null;
  messages: SenseiMessage[];
  isLoading: boolean;
  onSaveWord: (word: string) => void;
  onMistake?: (content: string, metadata?: any) => void;
  onSpeak: (text: string) => void;
  activeMode?: SenseiMode;
}

const EMPTY_STATE_CONFIG: Record<SenseiMode, {
  icon: React.FC<{ className?: string }>;
  title: string;
  subtitle: string;
  hint: string;
}> = {
  tutor: {
    icon: Sparkles,
    title: 'Khai phóng bản lĩnh Tiếng Nhật',
    subtitle: 'Chọn một chương mục hội thoại để bắt đầu hành trình cùng Sensei',
    hint: 'Hỏi bất cứ điều gì — từ vựng, ngữ pháp, văn hóa.',
  },
  roleplay: {
    icon: MessageSquare,
    title: 'Roleplay Studio',
    subtitle: 'Nhập vai tình huống thực tế bằng tiếng Nhật',
    hint: 'Thử: "Tôi muốn đặt bàn tại nhà hàng Nhật." hoặc "Sensei, hãy đóng vai khách hàng."',
  },
  speaking: {
    icon: Mic,
    title: 'Speaking Lab',
    subtitle: 'Luyện phát âm — Nói đúng như người bản xứ',
    hint: 'Nhấn nút Micro 🎙️ và nói câu tiếng Nhật. Sensei sẽ sửa và hướng dẫn ngay.',
  },
  analysis: {
    icon: Languages,
    title: 'Grammar Analytics',
    subtitle: 'Phân tích mẫu câu và cấu trúc ngữ pháp chuyên sâu',
    hint: 'Dán vào đây một câu tiếng Nhật để Sensei mổ xẻ từng thành phần.',
  },
};

export const SenseiChatFrame: React.FC<SenseiChatFrameProps> = ({
  conversation, messages, isLoading, onSaveWord, onMistake, onSpeak, activeMode = 'tutor'
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!conversation) {
    const cfg = EMPTY_STATE_CONFIG[activeMode];
    const Icon = cfg.icon;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 bg-transparent relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 bg-sakura/5 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="h-40 w-40 rounded-[4rem] bg-white/40 backdrop-blur-xl flex items-center justify-center border border-sakura/10 shadow-soft animate-float mb-12">
            <Icon className="h-20 w-20 text-sakura opacity-40" />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-medium text-slate-800 mb-4 font-serif max-w-3xl leading-tight tracking-tight">
            {cfg.title}
          </h2>
          <p className="text-xs md:text-sm text-slate-400 uppercase tracking-[0.4em] font-medium max-w-lg leading-loose opacity-70 mb-4">
            {cfg.subtitle}
          </p>
          <p className="text-xs text-sakura/50 italic font-serif max-w-md leading-relaxed">
            💡 {cfg.hint}
          </p>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-sakura/20 to-transparent mt-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      <ScrollArea ref={scrollRef} className="flex-1 p-6 md:px-12 hide-scrollbar">
        <div className="max-w-[80%] mx-auto py-8 pb-24 space-y-8">
          {messages?.map((m) => (
            <ChatMessage 
              key={m.id} 
              message={m} 
              onSaveWord={onSaveWord}
              onMistake={onMistake}
              onSpeak={onSpeak}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-start mb-6 px-4"
            >
               <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl rounded-tl-none border border-sakura/20 shadow-sm flex gap-1.5 items-center">
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 bg-sakura rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-1.5 w-1.5 bg-sakura rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-1.5 w-1.5 bg-sakura rounded-full animate-bounce" />
                  </div>
                  <span className="text-[10px] font-bold text-sakura/60 uppercase tracking-widest ml-2">Sensei đang nghĩ...</span>
               </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
