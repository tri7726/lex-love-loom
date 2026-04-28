import React, { useRef, useEffect } from 'react';
import { ChevronLeft, Phone, Video, MoreVertical, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  partnerLevel: string | null;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  onSend: (content: string) => Promise<void> | void;
  onBack: () => void;
  sending?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  currentUserId,
  onSend,
  onBack,
  sending = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <section
      className={cn(
        'flex-1 bg-white/40 dark:bg-card/20 backdrop-blur-md border-2 border-sakura/20 rounded-[2.5rem] flex flex-col overflow-hidden shadow-elevated',
      )}
    >
      {/* Chat Header */}
      <div className="p-5 border-b border-sakura/10 flex items-center justify-between bg-sakura/5 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-xl hover:bg-sakura/10"
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-sakura/20 shadow-md">
              <AvatarImage src={conversation.partnerAvatar ?? undefined} />
              <AvatarFallback className="font-bold">
                <User />
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h2 className="font-black text-sm leading-tight flex items-center gap-2">
              {conversation.partnerName}
              {conversation.partnerLevel && (
                <Badge className="bg-amber-500 text-[9px] h-4 px-1.5 font-black border-0">
                  {conversation.partnerLevel}
                </Badge>
              )}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-sakura hover:bg-sakura/10 rounded-2xl h-10 w-10">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-sakura hover:bg-sakura/10 rounded-2xl h-10 w-10">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-2xl h-10 w-10">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.sender_id === currentUserId}
            partnerAvatar={conversation.partnerAvatar}
          />
        ))}
      </div>

      {/* Chat Input */}
      <ChatInput onSend={onSend} sending={sending} />
    </section>
  );
};

/** Empty state shown when no conversation is selected */
export const ChatWindowEmptyState: React.FC = () => (
  <section
    className={cn(
      'flex-1 bg-white/40 dark:bg-card/20 backdrop-blur-md border-2 border-sakura/20 rounded-[2.5rem] flex flex-col overflow-hidden shadow-elevated',
      'hidden md:flex items-center justify-center italic text-muted-foreground bg-muted/20',
    )}
  >
    <div className="text-center space-y-6 p-20">
      <div className="h-24 w-24 bg-sakura/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-sakura/30">
        <MessageSquare className="h-10 w-10 text-sakura/40" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-display font-black">Trung tâm tin nhắn</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Chọn một người bạn hoặc giảng viên để bắt đầu cuộc hội thoại học tập ngay bây giờ.
        </p>
      </div>
    </div>
  </section>
);
