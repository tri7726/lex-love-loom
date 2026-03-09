import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  X, 
  Minimize2, 
  Maximize2, 
  MessageSquare,
  Loader2,
  Trash2,
  Mic,
  MicOff,
  Volume2,
  Crown,
  BookOpen,
  GraduationCap,
  Users,
  Pin,
  PinOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTTS } from '@/hooks/useTTS';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UnitAIAssistantProps {
  unitId: string;
  level: string;
  unitTitle: string;
  contextData?: unknown;
}

export const UnitAIAssistant = ({ unitId, level, unitTitle, contextData }: UnitAIAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [input, setInput] = useState('');
  const { profile } = useProfile();
  const { speak, isSpeaking } = useTTS();
  const { isListening, startListening, stopListening } = useSpeechToText({
    onResult: (transcript) => setInput(transcript)
  });

  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: `Chào ${profile?.full_name || 'Gakusei'}-san! Sensei đã sẵn sàng cho bài **${unitTitle}**. Bạn muốn bắt đầu với ngữ pháp hay luyện nói nhập vai nào?` 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const userContext = profile ? 
        `User: ${profile.full_name}, Level: ${profile.level}, XP: ${profile.xp}.` : 
        "User: Japanese learner.";

      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: {
          task: 'chat',
          text: userMessage,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          isVip: true,
          prompt: `[Context: ${userContext}] Answer like a kind and encouraging Japanese Sensei. Use polite Japanese (Desu/Masu) alongside Vietnamese explanations.`,
          context: {
            unit: unitId,
            level: level,
            title: unitTitle,
            data: contextData
          }
        }
      });

      if (error) throw error;

      const responseContent = data.explanation || data.text || "Sensei dường như đang suy nghĩ điều gì đó sâu xa...";
      setMessages(prev => [...prev, { role: 'assistant', content: responseContent }]);
      
      // Auto-speak if it's short or has Japanese
      if (responseContent.length < 150) {
        speak(responseContent);
      }
    } catch (err) {
      console.error('AI Error:', err);
      toast.error('Sensei hiện không thể trả lời.');
      setMessages(prev => [...prev, { role: 'assistant', content: "Hệ thống Sensei VIP hiện đang được bảo trì nhẹ, bạn quay lại sau nhé!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleplay = (scenario: string) => {
    setInput(`Sensei ơi, chúng ta cùng đóng vai ${scenario} nhé?`);
    handleSendMessage();
  };

  const scenarios = [
    { label: "Mới chuyển trường", value: "học sinh mới chuyển trường" },
    { label: "Mua hàng ở Kombini", value: "khách hàng và nhân viên kombini" },
    { label: "Phỏng vấn xin việc", value: "buổi phỏng vấn Baitô" }
  ];

  const clearChat = () => {
    setMessages([{ 
      role: 'assistant', 
      content: `Chào bạn! Tôi đang theo dõi nội dung của bài **${unitTitle}**. Bạn có muốn giải thích lại phần nào không?` 
    }]);
  };

  return (
    <div className={cn(
      "fixed z-50 transition-all duration-300",
      isPinned 
        ? "top-0 right-0 h-full w-72 lg:w-80 xl:w-[400px] border-l bg-white dark:bg-slate-900 shadow-2xl" 
        : "bottom-6 right-6 flex flex-col items-end gap-3"
    )}>
      <AnimatePresence>
        {(isOpen || isPinned) && (
          <motion.div
            initial={isPinned ? { x: 400 } : { opacity: 0, scale: 0.9, y: 40 }}
            animate={{ x: 0, opacity: 1, scale: 1, y: 0 }}
            exit={isPinned ? { x: 400 } : { opacity: 0, scale: 0.9, y: 40 }}
            className={cn("relative h-full w-full", !isPinned && "flex flex-col items-end")}
          >
            <Card className={cn(
               "shadow-elevated transition-all flex flex-col border-0 rounded-none lg:rounded-[1.5rem] overflow-hidden relative z-10",
               isPinned 
                 ? "w-full h-full rounded-none" 
                 : (isMinimized ? 'w-[350px] md:w-[420px] h-20' : 'w-[350px] md:w-[420px] h-[550px] md:h-[650px]')
            )}>
              <CardHeader className="p-5 bg-slate-900 dark:bg-slate-950 text-white flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold tracking-tight">Sensei Support</CardTitle>
                    <div className="flex items-center gap-1.5 opacity-70">
                       <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">AI Connected</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white hover:bg-white/10 rounded-lg hidden lg:flex" 
                    onClick={() => setIsPinned(!isPinned)}
                    title={isPinned ? "Unpin" : "Pin to sidebar"}
                  >
                    {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </Button>
                  {!isPinned && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10 rounded-lg" onClick={() => setIsMinimized(!isMinimized)}>
                      {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10 rounded-lg" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {!isMinimized && (
                <>
                  <CardContent className="p-0 flex-1 overflow-hidden flex flex-col relative">
                    <ScrollArea className="flex-1 px-6 pt-6" ref={scrollRef}>
                      <div className="space-y-6 pb-24">
                        {messages.map((msg, idx) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                msg.role === 'user' ? 'bg-indigo-600' : 'bg-sakura'
                              )}>
                                {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <GraduationCap className="h-4 w-4 text-white" />}
                              </div>
                              <div className="space-y-1">
                                <div className={cn(
                                  "p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative transition-all group border",
                                  msg.role === 'user' 
                                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900 text-indigo-900 dark:text-indigo-100 rounded-tr-none' 
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-tl-none'
                                )}>
                                  {msg.content}
                                  {msg.role === 'assistant' && (
                                    <button 
                                      onClick={() => speak(msg.content)} 
                                      disabled={isSpeaking}
                                      className="absolute -right-9 top-0 h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Volume2 className="h-full w-full text-slate-500" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && (
                          <div className="flex justify-start">
                            <div className="flex gap-4 items-center bg-white/20 backdrop-blur-md p-3 px-5 rounded-full border border-white/20">
                              <div className="flex gap-1.5">
                                 <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="h-1.5 w-1.5 rounded-full bg-sakura" />
                                 <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-sakura" />
                                 <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-sakura" />
                              </div>
                              <span className="text-xs font-bold text-sakura uppercase tracking-widest">Sensei is typing...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Quick Roleplay Options */}
                    <div className="absolute bottom-20 left-4 right-4 flex flex-wrap gap-2 pointer-events-none">
                       {messages.length < 3 && scenarios.map((s) => (
                         <motion.button
                           key={s.label}
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           onClick={() => handleRoleplay(s.value)}
                           className="pointer-events-auto bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full hover:bg-sakura hover:text-white transition-all shadow-sm"
                         >
                            <Users className="h-3 w-3 inline mr-2" />
                            {s.label}
                         </motion.button>
                       ))}
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 pt-0 border-t-0 flex flex-col gap-4 bg-transparent relative z-20">
                    <div className="flex w-full gap-2 items-center">
                      <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-muted-foreground hover:text-destructive shrink-0" onClick={clearChat} title="Xóa lịch sử">
                        <Trash2 className="h-5 w-5" />
                      </Button>
                      
                      <div className="relative flex-1">
                        <Input 
                          placeholder="Hỏi Sensei..." 
                          className="pr-20 h-11 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-sm focus-visible:ring-indigo-500 shadow-sm"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <div className="absolute right-1 top-1 flex items-center gap-1">
                           <Button 
                             onClick={() => isListening ? stopListening() : startListening()}
                             variant="ghost" 
                             size="icon" 
                             className={cn(
                                "h-9 w-9 rounded-lg transition-all",
                                isListening ? "bg-red-500 text-white shadow-lg" : "text-slate-400 hover:text-sakura"
                             )}
                           >
                             {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                           </Button>
                           <Button 
                             size="icon" 
                             className="h-9 w-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" 
                             onClick={handleSendMessage}
                             disabled={isLoading || !input.trim()}
                           >
                             {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                           </Button>
                        </div>
                      </div>
                    </div>
                  </CardFooter>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!isPinned && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all relative z-[60]",
            isOpen 
              ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white' 
              : 'bg-indigo-600 text-white'
          )}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="x" initial={{ rotate: -90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }}>
                 <X className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div key="chat" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="relative">
                 <MessageSquare className="h-6 w-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      )}
    </div>
  );
};
