import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Send, 
  MoreVertical, 
  Phone, 
  Video, 
  Image as ImageIcon, 
  Smile,
  ChevronLeft,
  User,
  CheckCheck,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Conversation {
  id: string;
  user_1: string;
  user_2: string;
  last_message_preview: string;
  last_message_at: string;
  other_user?: {
    id: string;
    display_name: string;
    avatar_url: string;
    role: string;
  };
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export const Chat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data, error } = await (supabase as any)
        .from('conversations')
        .select(`
          *,
          user1_profile:user_1 (user_id, display_name, avatar_url, role),
          user2_profile:user_2 (user_id, display_name, avatar_url, role)
        `)
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) console.error('Error fetching conversations:', error);
      else {
        const processed = data.map((conv: any) => {
          const otherUser = conv.user_1 === user.id ? conv.user2_profile : conv.user1_profile;
          return { ...conv, other_user: {
            id: otherUser?.user_id,
            display_name: otherUser?.display_name,
            avatar_url: otherUser?.avatar_url,
            role: otherUser?.role
          }};
        });
        setConversations(processed);
      }
      setLoading(false);
    };

    fetchConversations();

    const channel = supabase
      .channel('chat-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchConversations())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (selectedConv && payload.new.conversation_id === selectedConv.id) {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConv]);

  useEffect(() => {
    if (selectedConv) {
      const fetchMessages = async () => {
        const { data, error } = await (supabase as any)
          .from('messages')
          .select('*')
          .eq('conversation_id', selectedConv.id)
          .order('created_at', { ascending: true });

        if (error) console.error('Error fetching messages:', error);
        else setMessages(data as any[] || []);
      };
      fetchMessages();
    }
  }, [selectedConv]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !user || !selectedConv) return;

    const receiver_id = selectedConv.user_1 === user.id ? selectedConv.user_2 : selectedConv.user_1;
    const { error } = await (supabase as any)
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id,
        content: newMessage.trim(),
        conversation_id: selectedConv.id
      });

    if (error) console.error('Error sending message:', error);
    else setNewMessage('');
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-sakura" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white/40 backdrop-blur-2xl border-2 border-sakura-light/30 rounded-[3rem] shadow-card overflow-hidden my-10">
      {/* Sidebar */}
      <aside className={cn(
        "w-full md:w-[350px] border-r border-sakura-light/20 bg-sakura-light/5 flex flex-col transition-all",
        selectedConv ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-display font-black text-sumi">Trò chuyện</h1>
            <Badge className="bg-sakura text-white rounded-full font-black text-[10px] uppercase tracking-widest px-3">Live</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm bạn bè..." 
              className="pl-10 rounded-2xl border-2 border-sakura-light/30 bg-white/50 focus:ring-sakura/20 h-11 font-medium"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-3 space-y-2 pb-6">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={cn(
                  "w-full p-4 rounded-[2rem] flex gap-4 transition-all hover:bg-sakura-light/20 group",
                  selectedConv?.id === conv.id ? "bg-white shadow-soft" : ""
                )}
              >
                <Avatar className="h-14 w-14 rounded-2xl border-2 border-white shadow-soft">
                  <AvatarImage src={conv.other_user?.avatar_url} />
                  <AvatarFallback className="bg-sakura-light text-sakura"><User /></AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0 space-y-1">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-sumi truncate">{conv.other_user?.display_name || 'Người dùng'}</p>
                    <span className="text-[10px] font-black text-muted-foreground opacity-60">
                      {format(new Date(conv.last_message_at), 'HH:mm', { locale: vi })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate opacity-70 group-hover:opacity-100 transition-opacity font-medium">
                    {conv.last_message_preview || 'Bắt đầu cuộc hội thoại...'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Chat Area */}
      <main className={cn(
        "flex-1 flex flex-col bg-white/50 backdrop-blur-sm",
        !selectedConv ? "hidden md:flex items-center justify-center" : "flex"
      )}>
        {selectedConv ? (
          <>
            {/* Header */}
            <header className="p-4 md:p-6 border-b border-sakura-light/20 flex items-center justify-between bg-white/30">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" size="icon" className="md:hidden rounded-full"
                  onClick={() => setSelectedConv(null)}
                >
                  <ChevronLeft />
                </Button>
                <Avatar className="h-12 w-12 rounded-2xl border-2 border-white shadow-soft">
                  <AvatarImage src={selectedConv.other_user?.avatar_url} />
                  <AvatarFallback className="bg-sakura-light text-sakura"><User /></AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-black text-sumi flex items-center gap-2">
                    {selectedConv.other_user?.display_name}
                    {selectedConv.other_user?.role === 'admin' && <ShieldCheck className="h-4 w-4 text-sakura" />}
                  </h2>
                  <p className="text-[10px] font-black text-matcha uppercase tracking-widest flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-matcha animate-pulse" /> Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full text-sumi/50 hover:text-sakura transition-colors"><Phone className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full text-sumi/50 hover:text-sakura transition-colors"><Video className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full text-sumi/50 hover:text-sakura transition-colors"><MoreVertical className="h-5 w-5" /></Button>
              </div>
            </header>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={cn(
                        "flex group",
                        isMine ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[75%] space-y-1",
                        isMine ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "p-4 rounded-[2rem] shadow-soft font-bold text-sm transition-transform hover:scale-[1.01]",
                          isMine 
                            ? "bg-sakura text-white rounded-tr-none" 
                            : "bg-white border-2 border-sakura-light/20 text-sumi rounded-tl-none"
                        )}>
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            {format(new Date(msg.created_at), 'HH:mm', { locale: vi })}
                          </span>
                          {isMine && <CheckCheck className="h-3 w-3 text-sakura" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <footer className="p-6 bg-white/40 border-t border-sakura-light/10">
              <form 
                onSubmit={handleSendMessage}
                className="flex items-center gap-3 bg-white p-2 rounded-[2.5rem] shadow-card border-2 border-sakura-light/10"
              >
                <Button type="button" variant="ghost" size="icon" className="rounded-full hover:bg-sakura-light/30 text-sakura"><ImageIcon className="h-5 w-5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="rounded-full hover:bg-sakura-light/30 text-sakura"><Smile className="h-5 w-5" /></Button>
                <Input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Viết lời nhắn gửi hoa anh đào..."
                  className="border-0 focus-visible:ring-0 shadow-none bg-transparent h-12 text-sm font-bold"
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="rounded-full h-12 w-12 bg-sakura hover:bg-sakura-dark text-white shadow-elevated transition-all active:scale-90 flex-shrink-0"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </footer>
          </>
        ) : (
          <div className="text-center space-y-4 opacity-50 px-10">
            <div className="h-24 w-24 bg-sakura-light/20 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-soft">
              <MessageSquare className="h-12 w-12 text-sakura" />
            </div>
            <h3 className="text-2xl font-display font-black text-sumi">Mở hộp thư anh đào</h3>
            <p className="text-sm font-bold max-w-xs mx-auto leading-relaxed">Kết nối với bạn bè để cùng nhau chinh phục tiếng Nhật. Hãy chọn một cuộc hội thoại để bắt đầu.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Chat;
