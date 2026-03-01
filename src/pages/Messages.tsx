import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  MessageSquare
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const MOCK_CHATS = [
  { id: '1', name: 'Vũ Hải', avatar: '', lastMessage: 'Hôm nay học N3 thế nào rồi?', time: '10:30 AM', unread: 2, online: true },
  { id: '2', name: 'Thùy Dương', avatar: '', lastMessage: 'Gửi mình tài liệu Kanji nhé!', time: 'Hôm qua', unread: 0, online: false },
  { id: '3', name: 'Sensei Tanaka', avatar: '', lastMessage: 'Chào bạn, bài tập của bạn rất tốt.', time: 'Thứ 2', unread: 0, online: true, role: 'sensei' },
];

const MOCK_MESSAGES = [
  { id: '1', senderId: '1', content: 'Chào bạn! Hôm nay bạn có rảnh không?', time: '10:25 AM' },
  { id: '2', senderId: 'me', content: 'Mình rảnh, có chuyện gì thế?', time: '10:28 AM' },
  { id: '3', senderId: '1', content: 'Hôm nay học N3 thế nào rồi? Mình thấy bạn vừa lên top bảng xếp hạng!', time: '10:30 AM' },
];

export const Messages = () => {
  const [selectedChat, setSelectedChat] = useState<typeof MOCK_CHATS[0] | null>(MOCK_CHATS[0]);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedChat]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      content: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([...messages, newMessage]);
    setInput('');
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navigation />
      
      <main className="flex-1 container py-6 flex gap-6 min-h-0">
        {/* Chat List */}
        <aside className={cn(
          "w-full md:w-80 flex flex-col gap-4 transition-all shrink-0",
          selectedChat && "hidden md:flex"
        )}>
          <div className="flex items-center justify-between px-2">
            <h1 className="text-2xl font-bold">Tin nhắn</h1>
            <Button variant="ghost" size="icon" className="rounded-xl"><MoreVertical className="h-5 w-5" /></Button>
          </div>
          
          <div className="relative px-2">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm hội thoại..." className="pl-10 bg-card rounded-xl border-2" />
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-4">
              {MOCK_CHATS.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={cn(
                    "p-3 rounded-2xl cursor-pointer transition-all flex gap-3 group items-center",
                    selectedChat?.id === chat.id ? "bg-primary/10 shadow-sm" : "hover:bg-muted/50"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                      <AvatarImage src={chat.avatar} />
                      <AvatarFallback><User /></AvatarFallback>
                    </Avatar>
                    {chat.online && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className="font-bold truncate text-sm">
                        {chat.name}
                        {chat.role === 'sensei' && <span className="ml-1 text-[10px] bg-amber-500 text-white px-1 rounded-sm">SENSEI</span>}
                      </p>
                      <span className="text-[10px] text-muted-foreground uppercase">{chat.time}</span>
                    </div>
                    <p className={cn(
                      "text-xs truncate",
                      chat.unread > 0 ? "font-bold text-foreground" : "text-muted-foreground"
                    )}>
                      {chat.lastMessage}
                    </p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="h-5 w-5 rounded-full bg-primary text-[10px] font-black text-white flex items-center justify-center">
                      {chat.unread}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Chat Window */}
        <section className={cn(
          "flex-1 bg-white/40 dark:bg-card/20 backdrop-blur-md border-2 border-sakura/20 rounded-[2.5rem] flex flex-col overflow-hidden shadow-elevated",
          !selectedChat && "hidden md:flex items-center justify-center italic text-muted-foreground bg-muted/20"
        )}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-5 border-b border-sakura/10 flex items-center justify-between bg-sakura/5 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden rounded-xl hover:bg-sakura/10"
                    onClick={() => setSelectedChat(null)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-sakura/20 shadow-md">
                      <AvatarImage src={selectedChat.avatar} />
                      <AvatarFallback className="font-bold"><User /></AvatarFallback>
                    </Avatar>
                    {selectedChat.online && (
                      <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-900 shadow-sm" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-black text-sm leading-tight flex items-center gap-2">
                      {selectedChat.name}
                      {selectedChat.role === 'sensei' && <Badge className="bg-amber-500 text-[9px] h-4 px-1.5 font-black border-0">SENSEI</Badge>}
                    </h2>
                    <p className="text-[10px] text-green-500 mt-1 font-bold uppercase tracking-widest flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      {selectedChat.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-sakura hover:bg-sakura/10 rounded-2xl h-10 w-10"><Phone className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-sakura hover:bg-sakura/10 rounded-2xl h-10 w-10"><Video className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-2xl h-10 w-10"><MoreVertical className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin"
              >
                {messages.map((msg, idx) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex gap-4 max-w-[85%]",
                      msg.senderId === 'me' ? "ml-auto flex-row-reverse text-right" : ""
                    )}
                  >
                    {msg.senderId !== 'me' && (
                      <Avatar className="h-10 w-10 mt-auto shrink-0 border-2 border-sakura/20 shadow-sm">
                        <AvatarFallback className="font-bold"><User className="h-5 w-5" /></AvatarFallback>
                      </Avatar>
                    )}
                    <div className="space-y-2">
                      <div className={cn(
                        "p-5 rounded-[1.8rem] text-sm leading-relaxed shadow-card group relative",
                        msg.senderId === 'me' 
                          ? "bg-sakura text-white rounded-tr-none shadow-sakura/20" 
                          : "bg-white dark:bg-slate-800 border-2 border-sakura/5 rounded-tl-none"
                      )}>
                        <p className="font-medium">{msg.content}</p>
                      </div>
                      <div className={cn(
                        "flex items-center gap-2 px-1",
                        msg.senderId === 'me' ? "flex-row-reverse" : ""
                      )}>
                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{msg.time}</span>
                        {msg.senderId === 'me' && <CheckCheck className="h-3.5 w-3.5 text-sakura" />}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-8 bg-sakura/[0.02] border-t border-sakura/10">
                <div className="flex items-center gap-3 bg-white/60 dark:bg-card/40 backdrop-blur-md border-2 border-sakura/20 rounded-3xl p-2.5 focus-within:border-sakura transition-all shadow-soft group">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-sakura rounded-2xl h-11 w-11 hover:bg-sakura/10"><ImageIcon className="h-5.5 w-5.5" /></Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-sakura rounded-2xl h-11 w-11 hover:bg-sakura/10"><Smile className="h-5.5 w-5.5" /></Button>
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
                    disabled={!input.trim()}
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
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">Chọn một người bạn hoặc giảng viên để bắt đầu cuộc hội thoại học tập ngay bây giờ.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
