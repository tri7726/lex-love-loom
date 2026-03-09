import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
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
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTTS } from '@/hooks/useTTS';
import { cn } from '@/lib/utils';
import { GrammarPoint } from '@/data/grammar-db';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GrammarSenseiProps {
  currentPoint?: GrammarPoint | null;
}

export const GrammarSensei = ({ currentPoint }: GrammarSenseiProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const { speak, isSpeaking } = useTTS({ lang: 'vi-VN' });
  const { isListening, startListening, stopListening } = useSpeechToText({
    onResult: (transcript) => setInput(transcript)
  });

  const generateWelcomeMessage = React.useCallback(() => {
    if (currentPoint) {
      return `Chào bạn! Chúng ta đang xem cấu trúc **${currentPoint.title}** (${currentPoint.level}). Bạn có thắc mắc gì về cách sử dụng, hay muốn lấy thêm ví dụ không?`;
    }
    return `Chào bạn! Sensei có thể giúp gì cho bạn trong việc học ngữ pháp hôm nay? Bạn có thể hỏi bất kỳ cấu trúc nào!`;
  }, [currentPoint]);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: generateWelcomeMessage() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-update welcome message if context changes and chat is mostly empty
  useEffect(() => {
    if (messages.length <= 2 && currentPoint) {
       setMessages([{ role: 'assistant', content: generateWelcomeMessage() }]);
    }
  }, [currentPoint, generateWelcomeMessage, messages.length]);

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
      const { data, error } = await supabase.functions.invoke('japanese-grammar', {
        body: {
          mode: 'chat',
          text: userMessage,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          context: {
            title: currentPoint?.title || 'Ngữ pháp chung',
            level: currentPoint?.level || 'Tất cả'
          }
        }
      });

      if (error) throw error;

      const responseContent = data.text || "Sensei đang suy nghĩ...";
      setMessages(prev => [...prev, { role: 'assistant', content: responseContent }]);
      
    } catch (err: unknown) {
      console.error('AI Error:', err);
      toast.error('Sensei hiện không thể trả lời.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: generateWelcomeMessage() }]);
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50 transition-all duration-300">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative flex flex-col items-end"
          >
            <Card className={cn(
               "shadow-elevated transition-all flex flex-col border border-primary/10 rounded-[1.5rem] overflow-hidden relative z-10 glass-panel",
               isMinimized ? 'w-[350px] sm:w-[400px] h-20' : 'w-[350px] sm:w-[400px] h-[500px] sm:h-[600px]'
            )}>
              <CardHeader className="p-4 bg-gradient-to-r from-sakura to-primary text-white flex flex-row items-center justify-between shrink-0 m-1 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold tracking-tight drop-shadow-sm">Grammar Sensei</CardTitle>
                    <div className="flex items-center gap-1.5 opacity-90">
                       <Sparkles className="h-3 w-3 text-yellow-300" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">AI Powered</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-lg" onClick={() => setIsMinimized(!isMinimized)}>
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-lg" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {!isMinimized && (
                <>
                  <CardContent className="p-0 flex-1 overflow-hidden flex flex-col relative bg-white/50 dark:bg-slate-900/50">
                    <ScrollArea className="flex-1 px-4 pt-4" ref={scrollRef}>
                      <div className="space-y-6 pb-20">
                        {messages.map((msg, idx) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-white",
                                msg.role === 'user' ? 'bg-primary text-white' : 'bg-gradient-to-br from-sakura to-primary text-white'
                              )}>
                                {msg.role === 'user' ? <User className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                              </div>
                              <div className="space-y-1">
                                <div className={cn(
                                  "p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm relative group",
                                  msg.role === 'user' 
                                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-tl-sm'
                                )}>
                                  <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                                  
                                  {msg.role === 'assistant' && (
                                    <button 
                                      onClick={() => speak(msg.content)} 
                                      disabled={isSpeaking}
                                      className="absolute -right-8 top-1 h-6 w-6 rounded-full bg-white dark:bg-slate-800 shadow-sm border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Volume2 className="h-3 w-3 text-slate-500" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && (
                          <div className="flex justify-start">
                            <div className="flex gap-4 items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 px-5 rounded-2xl border border-primary/10 rounded-tl-sm shadow-sm">
                              <div className="flex gap-1.5">
                                 <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} className="h-2 w-2 rounded-full bg-sakura" />
                                 <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="h-2 w-2 rounded-full bg-sakura" />
                                 <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="h-2 w-2 rounded-full bg-sakura" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>

                  <CardFooter className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t flex flex-col gap-3 z-20">
                    <div className="flex w-full gap-2 items-end">
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl shrink-0" onClick={clearChat} title="Xóa lịch sử">
                        <Trash2 className="h-5 w-5 text-muted-foreground" />
                      </Button>
                      
                      <div className="relative flex-1 bg-muted/50 rounded-xl border focus-within:ring-2 focus-within:ring-sakura focus-within:border-transparent transition-all">
                        <textarea 
                          placeholder="Hỏi Sensei..." 
                          className="w-full bg-transparent border-none resize-none p-3 h-12 max-h-32 text-sm focus:outline-none focus:ring-0"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <div className="absolute right-2 bottom-2 flex items-center gap-1">
                           <Button 
                             onClick={() => isListening ? stopListening() : startListening()}
                             variant="ghost" 
                             size="icon" 
                             className={cn(
                                "h-8 w-8 rounded-lg transition-all",
                                isListening ? "bg-red-50 text-red-500" : "text-slate-400 hover:text-sakura"
                             )}
                           >
                             {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                           </Button>
                        </div>
                      </div>

                      <Button 
                         size="icon" 
                         className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm shrink-0" 
                         onClick={handleSendMessage}
                         disabled={isLoading || !input.trim()}
                       >
                         {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </Button>
                    </div>
                  </CardFooter>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full flex items-center justify-center shadow-elevated bg-gradient-to-tr from-sakura to-primary text-white relative group"
        >
          <div className="absolute inset-0 bg-white/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity" />
          <Bot className="h-8 w-8" />
          
          {/* Notification dot */}
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 border-2 border-white rounded-full animate-pulse" />
        </motion.button>
      )}
    </div>
  );
};
