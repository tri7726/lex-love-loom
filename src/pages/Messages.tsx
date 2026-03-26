import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  ChevronLeft,
  Search,
  MoreVertical,
  Phone,
  Video,
  Image as ImageIcon,
  Smile,
  User,
  CheckCheck,
  MessageSquare,
} from 'lucide-react';
import { SakuraSkeleton } from '@/components/ui/SakuraSkeleton';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  jlpt_level: string | null;
  total_xp: number;
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return date.toLocaleDateString('vi-VN', { weekday: 'short' });
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Messages = () => {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedConv]);

  // ── Fetch conversations ──────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);

    try {
      // Get all messages where user is sender or receiver
      const { data: msgs, error } = await (supabase.from('messages' as any) as any)
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by partner
      const partnerMap = new Map<string, { lastMsg: Message; unread: number }>();
      for (const msg of (msgs as Message[]) ?? []) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, {
            lastMsg: msg,
            unread: !msg.is_read && msg.receiver_id === user.id ? 1 : 0,
          });
        } else {
          const entry = partnerMap.get(partnerId)!;
          if (!msg.is_read && msg.receiver_id === user.id) {
            entry.unread += 1;
          }
        }
      }

      if (partnerMap.size === 0) {
        setConversations([]);
        setLoadingConvs(false);
        return;
      }

      // Fetch profiles for all partners
      const partnerIds = Array.from(partnerMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, jlpt_level, total_xp')
        .in('user_id', partnerIds);

      const profileMap = new Map<string, Profile>();
      for (const p of (profiles as Profile[]) ?? []) {
        profileMap.set(p.user_id, p);
      }

      const convList: Conversation[] = partnerIds.map((pid) => {
        const { lastMsg, unread } = partnerMap.get(pid)!;
        const profile = profileMap.get(pid);
        return {
          partnerId: pid,
          partnerName: profile?.display_name ?? 'Người dùng',
          partnerAvatar: profile?.avatar_url ?? null,
          partnerLevel: profile?.jlpt_level ?? null,
          lastMessage: lastMsg.content,
          lastTime: formatTime(lastMsg.created_at),
          unread,
        };
      });

      setConversations(convList);
    } catch (err) {
      console.error('fetchConversations error:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ── Fetch messages for selected conversation ─────────────────────────────────
  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!user) return;

    const { data, error } = await (supabase.from('messages' as any) as any)
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('fetchMessages error:', error);
      return;
    }
    setMessages((data as Message[]) ?? []);
  }, [user]);

  // ── Mark messages as read ────────────────────────────────────────────────────
  const markAsRead = useCallback(async (partnerId: string) => {
    if (!user) return;
    await (supabase.from('messages' as any) as any)
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', partnerId)
      .eq('is_read', false);

    // Update local unread count
    setConversations((prev) =>
      prev.map((c) => (c.partnerId === partnerId ? { ...c, unread: 0 } : c))
    );
  }, [user]);

  // ── Global real-time subscription for conversation list ──────────────────
  useEffect(() => {
    if (!user) return;

    const globalChannel = supabase
      .channel('global_messages')
      .on(
        'postgres_changes' as never,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: { new: Message }) => {
          const msg = payload.new;
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [user, fetchConversations]);

  // ── Select conversation ──────────────────────────────────────────────────────
  const handleSelectConv = useCallback(async (conv: Conversation) => {
    setSelectedConv(conv);
    await fetchMessages(conv.partnerId);
    await markAsRead(conv.partnerId);

    // Unsubscribe previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to realtime for this specific conversation (to update messages area)
    if (!user) return;
    const channel = supabase
      .channel(`active_messages:${[user.id, conv.partnerId].sort().join('-')}`)
      .on(
        'postgres_changes' as never,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: { new: Message }) => {
          const msg = payload.new;
          const isRelevant =
            (msg.sender_id === user.id && msg.receiver_id === conv.partnerId) ||
            (msg.sender_id === conv.partnerId && msg.receiver_id === user.id);
          if (!isRelevant) return;

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // Auto mark as read if we're the receiver and this conv is active
          if (msg.receiver_id === user.id) {
            (supabase.from('messages' as any) as any)
              .update({ is_read: true })
              .eq('id', msg.id);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [user, fetchMessages, markAsRead]);

  // Cleanup channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !user || !selectedConv || sending) return;
    setSending(true);

    const content = input.trim();
    setInput('');

    const { error } = await (supabase.from('messages' as any) as any).insert({
      sender_id: user.id,
      receiver_id: selectedConv.partnerId,
      content,
      is_read: false,
    });

    if (error) {
      console.error('Send message error:', error);
      setInput(content); // restore on failure
    }

    setSending(false);
  };

  // ── Filtered conversations ───────────────────────────────────────────────────
  const filteredConvs = conversations.filter((c) =>
    c.partnerName.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navigation />

      <main className="flex-1 container py-6 flex gap-6 min-h-0">
        {/* Chat List */}
        <aside
          className={cn(
            'w-full md:w-80 flex flex-col gap-4 transition-all shrink-0',
            selectedConv && 'hidden md:flex'
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
              onChange={(e) => setSearch(e.target.value)}
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
                    onClick={() => handleSelectConv(conv)}
                    className={cn(
                      'p-3 rounded-2xl cursor-pointer transition-all flex gap-3 group items-center',
                      selectedConv?.partnerId === conv.partnerId
                        ? 'bg-primary/10 shadow-sm'
                        : 'hover:bg-muted/50'
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
                          conv.unread > 0
                            ? 'font-bold text-foreground'
                            : 'text-muted-foreground'
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

        {/* Chat Window */}
        <section
          className={cn(
            'flex-1 bg-white/40 dark:bg-card/20 backdrop-blur-md border-2 border-sakura/20 rounded-[2.5rem] flex flex-col overflow-hidden shadow-elevated',
            !selectedConv &&
              'hidden md:flex items-center justify-center italic text-muted-foreground bg-muted/20'
          )}
        >
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-5 border-b border-sakura/10 flex items-center justify-between bg-sakura/5 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden rounded-xl hover:bg-sakura/10"
                    onClick={() => setSelectedConv(null)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-sakura/20 shadow-md">
                      <AvatarImage src={selectedConv.partnerAvatar ?? undefined} />
                      <AvatarFallback className="font-bold">
                        <User />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <h2 className="font-black text-sm leading-tight flex items-center gap-2">
                      {selectedConv.partnerName}
                      {selectedConv.partnerLevel && (
                        <Badge className="bg-amber-500 text-[9px] h-4 px-1.5 font-black border-0">
                          {selectedConv.partnerLevel}
                        </Badge>
                      )}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-sakura hover:bg-sakura/10 rounded-2xl h-10 w-10"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-sakura hover:bg-sakura/10 rounded-2xl h-10 w-10"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-2xl h-10 w-10">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin"
              >
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={cn(
                        'flex gap-4 max-w-[85%]',
                        isMe ? 'ml-auto flex-row-reverse text-right' : ''
                      )}
                    >
                      {!isMe && (
                        <Avatar className="h-10 w-10 mt-auto shrink-0 border-2 border-sakura/20 shadow-sm">
                          <AvatarImage src={selectedConv.partnerAvatar ?? undefined} />
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
                              : 'bg-white dark:bg-slate-800 border-2 border-sakura/5 rounded-tl-none'
                          )}
                        >
                          <p className="font-medium">{msg.content}</p>
                        </div>
                        <div
                          className={cn(
                            'flex items-center gap-2 px-1',
                            isMe ? 'flex-row-reverse' : ''
                          )}
                        >
                          <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                            {formatTime(msg.created_at)}
                          </span>
                          {isMe && (
                            <CheckCheck
                              className={cn(
                                'h-3.5 w-3.5',
                                msg.is_read ? 'text-sakura' : 'text-muted-foreground'
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Chat Input */}
              <div className="p-8 bg-sakura/[0.02] border-t border-sakura/10">
                <div className="flex items-center gap-3 bg-white/60 dark:bg-card/40 backdrop-blur-md border-2 border-sakura/20 rounded-3xl p-2.5 focus-within:border-sakura transition-all shadow-soft group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-sakura rounded-2xl h-11 w-11 hover:bg-sakura/10"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-sakura rounded-2xl h-11 w-11 hover:bg-sakura/10"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Input
                    placeholder="Nhập tin nhắn..."
                    className="border-0 bg-transparent focus-visible:ring-0 shadow-none px-2 font-medium"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <Button
                    variant="default"
                    size="icon"
                    className="rounded-2xl bg-sakura shadow-lg shadow-sakura/25 shrink-0 h-12 w-12 active:scale-95 transition-all outline-none border-0"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                  >
                    <Send className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
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
          )}
        </section>
      </main>
    </div>
  );
};
