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
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { GrammarPoint } from '@/data/grammar-db';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface VideoContext {
  title: string;
  segmentText?: string;
  segmentTranslation?: string;
}

interface GrammarSenseiProps {
  currentPoint?: GrammarPoint | null;
  videoContext?: VideoContext | null;
  initialOpen?: boolean;
  onClose?: () => void;
}

const SYSTEM_PROMPT = `Bạn là Grammar Sensei — chuyên gia sư phạm tiếng Nhật.
Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn.
Giúp người học hiểu sâu về ngữ pháp tiếng Nhật, giải thích rõ ràng có ví dụ minh họa.
Khi giải thích, luôn bao gồm: ý nghĩa, cách dùng, và 1-2 ví dụ ngắn.`;

export const GrammarSensei = ({ currentPoint, videoContext, initialOpen, onClose }: GrammarSenseiProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const { speak, isSpeaking } = useTTS({ lang: 'vi-VN' });
  const { isListening, startListening, stopListening } = useSpeechToText({
    onResult: (transcript) => setInput(transcript)
  });
  const { user } = useAuth();
  const lastSendTime = useRef(0);

  const buildSystemPrompt = React.useCallback(() => {
    let prompt = SYSTEM_PROMPT;
    if (currentPoint) {
      prompt += `\n\nNgười dùng đang xem cấu trúc: "${currentPoint.title}" (${currentPoint.level})\nGiải thích: ${currentPoint.explanation}\nCách dùng: ${currentPoint.usage}\nVí dụ: ${currentPoint.example}`;
    }
    if (videoContext) {
      prompt += `\n\nNgữ cảnh video: Người dùng đang xem video "${videoContext.title}".`;
      if (videoContext.segmentText) {
        prompt += `\nPhụ đề hiện tại: "${videoContext.segmentText}"`;
      }
      if (videoContext.segmentTranslation) {
        prompt += `\nDịch: "${videoContext.segmentTranslation}"`;
      }
    }
    return prompt;
  }, [currentPoint, videoContext]);

  const generateWelcomeMessage = React.useCallback(() => {
    if (currentPoint) {
      return `Chào bạn! Chúng ta đang xem cấu trúc **${currentPoint.title}** (${currentPoint.level}). Bạn có thắc mắc gì về cách sử dụng, hay muốn lấy thêm ví dụ không?`;
    }
    if (videoContext) {
      return `Chào bạn! Bạn đang xem video **${videoContext.title}**${videoContext.segmentText ? ` với phụ đề "${videoContext.segmentText}"` : ''}. Sensei có thể giúp gì về ngữ pháp hay từ vựng trong video này?`;
    }
    return `Chào bạn! Sensei có thể giúp gì cho bạn trong việc học ngữ pháp hôm nay? Bạn có thể hỏi bất kỳ cấu trúc nào!`;
  }, [currentPoint, videoContext]);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: generateWelcomeMessage() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-open when initialOpen changes to true
  useEffect(() => {
    if (initialOpen) setIsOpen(true);
  }, [initialOpen]);

  // Auto-update welcome message if context changes and chat is mostly empty
  useEffect(() => {
    if (messages.length <= 2 && (currentPoint || videoContext)) {
       setMessages([{ role: 'assistant', content: generateWelcomeMessage() }]);
    }
  }, [currentPoint, videoContext, generateWelcomeMessage, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /** Log chat result to RAG knowledge base */
  const logToRag = async (userMsg: string, assistantMsg: string) => {
    if (!user?.id) return;
    try {
      await supabase.functions.invoke('sensei-rag', {
        body: {
          action: 'index',
          user_id: user.id,
          content: `Grammar Sensei chat về "${currentPoint?.title || 'ngữ pháp'}": Hỏi: ${userMsg} — Đáp: ${assistantMsg}`,
          source_type: 'grammar_chat',
          metadata: {
            grammar_point: currentPoint?.title || null,
            level: currentPoint?.level || null,
            page: 'grammar-wiki'
          }
        }
      });
    } catch (e) {
      console.warn('Failed to log grammar chat to RAG:', e);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Client-side cooldown: 2s between sends
    const now = Date.now();
    if (now - lastSendTime.current < 2000) {
      toast.error("Vui lòng đợi một chút trước khi gửi tin nhắn tiếp theo.");
      return;
    }
    lastSendTime.current = now;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Add placeholder assistant message for streaming
    const assistantMsgId = 'assistant-stream-' + Date.now();
    setMessages(prev => [...prev, { role: 'assistant', content: '', _id: assistantMsgId } as any]);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const chatHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const streamResponse = await fetch(`${supabaseUrl}/functions/v1/japanese-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          messages: [...chatHistory, { role: 'user', content: userMessage }],
          systemPrompt: buildSystemPrompt(),
          user_id: user?.id,
          engine: 'gemini',
          stream: true
        }),
      });

      if (!streamResponse.ok) throw new Error(`Stream error: ${streamResponse.status}`);
      if (!streamResponse.body) throw new Error('No response body');

      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let accumulatedResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          const line = textBuffer.slice(0, newlineIndex).replace(/\r$/, '');
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.startsWith(':') || !line.trim() || !line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulatedResponse += content;
              setMessages(prev => prev.map(m =>
                (m as any)._id === assistantMsgId ? { ...m, content: accumulatedResponse } : m
              ));
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Log to RAG after successful response
      if (accumulatedResponse) {
        logToRag(userMessage, accumulatedResponse);
      }
    } catch (err: unknown) {
      console.error('AI Error:', err);
      // Remove the placeholder message on error
      setMessages(prev => prev.filter(m => (m as any)._id !== assistantMsgId));
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 rounded-lg"
                    onClick={() => setIsMinimized(!isMinimized)}
                    aria-label={isMinimized ? 'Mở rộng Grammar Sensei' : 'Thu nhỏ Grammar Sensei'}
                    title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 rounded-lg"
                    onClick={() => { setIsOpen(false); onClose?.(); }}
                    aria-label="Đóng Grammar Sensei"
                    title="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {!isMinimized && (
                <>
                  <CardContent className="p-0 flex-1 overflow-hidden flex flex-col relative bg-white/50">
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
                                    : 'bg-white border-border border rounded-tl-sm'
                                )}>
                                  <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />

                                  {msg.role === 'assistant' && (
                                    <button
                                      onClick={() => speak(msg.content)}
                                      disabled={isSpeaking}
                                      className="absolute -right-8 top-1 h-6 w-6 rounded-full bg-white shadow-sm border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Volume2 className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && messages[messages.length - 1]?.content === '' && (
                          <div className="flex justify-start">
                            <div className="flex gap-4 items-center bg-white/80 backdrop-blur-md p-3 px-5 rounded-2xl border border-primary/10 rounded-tl-sm shadow-sm">
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

                  <CardFooter className="p-4 bg-white/80 backdrop-blur-md border-t flex flex-col gap-3 z-20">
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
                                isListening ? "bg-red-50 text-red-500" : "text-muted-foreground/70 hover:text-sakura"
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
