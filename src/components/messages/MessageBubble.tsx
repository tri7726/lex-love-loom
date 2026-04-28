import { memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCheck, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  partnerAvatar?: string | null;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return date.toLocaleDateString('vi-VN', { weekday: 'short' });
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export const MessageBubble = memo(function MessageBubble({ message, isMe, partnerAvatar }: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn('flex gap-4 max-w-[85%]', isMe ? 'ml-auto flex-row-reverse text-right' : '')}
    >
      {!isMe && (
        <Avatar className="h-10 w-10 mt-auto shrink-0 border-2 border-sakura/20 shadow-sm">
          <AvatarImage src={partnerAvatar ?? undefined} />
          <AvatarFallback className="font-bold">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className="space-y-2">
        <div
          className={cn(
            'p-5 rounded-[1.8rem] text-sm leading-relaxed shadow-card group relative',
            isMe
              ? 'bg-sakura text-white rounded-tr-none shadow-sakura/20'
              : 'bg-white dark:bg-slate-800 border-2 border-sakura/5 rounded-tl-none',
          )}
        >
          <p className="font-medium">{message.content}</p>
        </div>
        <div className={cn('flex items-center gap-2 px-1', isMe ? 'flex-row-reverse' : '')}>
          <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
            {formatTime(message.created_at)}
          </span>
          {isMe && (
            <CheckCheck
              className={cn('h-3.5 w-3.5', message.is_read ? 'text-sakura' : 'text-muted-foreground')}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
});
