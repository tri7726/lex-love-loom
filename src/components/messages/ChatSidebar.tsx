import React from 'react';
import { motion } from 'framer-motion';
import { Search, MoreVertical, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SakuraSkeleton } from '@/components/ui/SakuraSkeleton';
import { cn } from '@/lib/utils';

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  partnerLevel: string | null;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConv: Conversation | null;
  search: string;
  loadingConvs: boolean;
  onSelectConv: (conv: Conversation) => void;
  onSearchChange: (value: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  selectedConv,
  search,
  loadingConvs,
  onSelectConv,
  onSearchChange,
}) => {
  const filteredConvs = conversations.filter((c) =>
    c.partnerName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <aside
      className={cn(
        'w-full md:w-80 flex flex-col gap-4 transition-all shrink-0',
        selectedConv && 'hidden md:flex',
      )}
    >
      <div className="flex items-center justify-between px-2">
        <h1 className="text-2xl font-bold">Tin nhắn</h1>
        <Button variant="ghost" size="icon" className="rounded-xl">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative px-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm hội thoại..."
          className="pl-10 bg-card rounded-xl border-2"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-4">
          {loadingConvs ? (
            <SakuraSkeleton variant="message-bubble" count={4} />
          ) : filteredConvs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Chưa có hội thoại nào
            </p>
          ) : (
            filteredConvs.map((conv) => (
              <motion.div
                key={conv.partnerId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  onClick={() => onSelectConv(conv)}
                  className={cn(
                    'p-3 rounded-2xl cursor-pointer transition-all flex gap-3 group items-center',
                    selectedConv?.partnerId === conv.partnerId
                      ? 'bg-primary/10 shadow-sm'
                      : 'hover:bg-muted/50',
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                      <AvatarImage src={conv.partnerAvatar ?? undefined} />
                      <AvatarFallback>
                        <User />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className="font-bold truncate text-sm flex items-center gap-1">
                        {conv.partnerName}
                        {conv.partnerLevel && (
                          <span className="text-[10px] bg-amber-500 text-white px-1 rounded-sm">
                            {conv.partnerLevel}
                          </span>
                        )}
                      </p>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {conv.lastTime}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-xs truncate',
                        conv.unread > 0 ? 'font-bold text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <div className="h-5 w-5 rounded-full bg-primary text-[10px] font-black text-white flex items-center justify-center">
                      {conv.unread}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};
