import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  GraduationCap,
  Users,
  Pin,
  PinOff,
  
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTTS } from '@/hooks/useTTS';
import { useProfile } from '@/hooks/useProfile';
import { useSenseiChat } from '@/components/chat/SenseiChatHub/useSenseiChat';
import { useNavigate } from 'react-router-dom';

interface UnitAIAssistantProps {
  unitId: string;
  level: string;
  unitTitle: string;
  contextData?: unknown;
}

export const UnitAIAssistant = ({ unitId, level, unitTitle, contextData }: UnitAIAssistantProps) => {
  const [isOpen, setIsOpen]         = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinned, setIsPinned]     = useState(false);
  const [input, setInput]           = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const { profile }  = useProfile();
  const { speak, isSpeaking } = useTTS();
  const navigate = useNavigate();
  const { isListening, startListening, stopListening } = useSpeechToText({
    onResult: (transcript) => setInput(transcript),
  });

  // ─── useSenseiChat — cùng service với SenseiHub ─────────────────────────────
  const {
    messages,
    isLoading,
    sendMessage,
    createNewConversation,
    conversations,
    setActiveConversationId,
    activeConversation,
    isGuest,
    guestMessageCount,
  } = useSenseiChat();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Khởi tạo conversation mới khi mở chat lần đầu hoặc đổi unit
  useEffect(() => {
    if (isOpen && !activeConversation) {
      createNewConversation(`Hỗ trợ: ${unitTitle}`, 'tutor');
    }
  }, [isOpen, unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async (messageOverride?: string) => {
    const msg = messageOverride || input.trim();
    if (!msg || isLoading) return;
    setInput('');

    // Thêm context unit vào tin nhắn đầu tiên
    const contextPrefix = messages.length === 0
      ? `[Đang học: ${unitTitle} (${level})] `
      : '';

    await sendMessage(contextPrefix + msg, 'text');

    // TTS cho reply ngắn
    const lastAssistant = messages.filter(m => m.role === 'assistant').at(-1);
    if (lastAssistant && lastAssistant.content.length < 150) {
      speak(lastAssistant.content);
    }
  }, [input, isLoading, messages, unitTitle, level, sendMessage, speak]);

  const handleQuickAction = (action: 'kanji' | 'quiz' | 'grammar') => {
    const prompts = {
      kanji:   `Sensei ơi, hãy phân tích các chữ Kanji trong bài **${unitTitle}** giúp em với!`,
      quiz:    `Sensei ơi, kiểm tra kiến thức bài **${unitTitle}** của em nhé!`,
      grammar: `Sensei ơi, giải thích kỹ hơn về ngữ pháp của bài **${unitTitle}** được không ạ?`,
    };
    handleSend(prompts[action]);
  };

  const handleRoleplay = (scenario: string) => {
    handleSend(`Sensei ơi, chúng ta cùng đóng vai ${scenario} nhé?`);
  };

  const handleClearChat = () => {
    createNewConversation(`Hỗ trợ: ${unitTitle}`, 'tutor');
  };


  const scenarios = [
    { label: 'Mới chuyển trường',   value: 'học sinh mới chuyển trường' },
    { label: 'Mua ở Kombini',       value: 'khách hàng và nhân viên kombini' },
    { label: 'Phỏng vấn Baitô',     value: 'buổi phỏng vấn xin việc' },
  ];

  // Lọc conversations của unit này (theo title)
  const unitConversations = conversations
    .filter(c => c.title?.includes(unitTitle) || c.title?.includes('Hỗ trợ'))
    .slice(0, 5);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'fixed z-50 transition-all duration-300',
      isPinned
        ? 'top-0 right-0 h-full w-72 lg:w-80 xl:w-[400px] border-l bg-white shadow-2xl'
        : 'bottom-6 right-6 flex flex-col items-end gap-3',
    )}>
      <AnimatePresence>
        {(isOpen || isPinned) && (
          <motion.div
            initial={isPinned ? { x: 400 } : { opacity: 0, scale: 0.9, y: 40 }}
            animate={{ x: 0, opacity: 1, scale: 1, y: 0 }}
            exit={isPinned ? { x: 400 } : { opacity: 0, scale: 0.9, y: 40 }}
            className={cn('relative h-full w-full', !isPinned && 'flex flex-col items-end')}
          >
            <Card className={cn(
              'shadow-elevated transition-all flex flex-col border-0 rounded-none lg:rounded-[1.5rem] overflow-hidden relative z-10',
              isPinned
                ? 'w-full h-full rounded-none'
                : (isMinimized ? 'w-[350px] md:w-[420px] h-20' : 'w-[350px] md:w-[420px] h-[550px] md:h-[650px]'),
            )}>

              {/* ── Header ── */}
              <CardHeader className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-sakura/20 border border-sakura/30 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-sakura" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold tracking-tight">Sensei</CardTitle>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">
                        {isGuest ? `Học thử ${guestMessageCount}/5` : unitTitle}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  {/* Nút xem lịch sử */}
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-white/70 hover:bg-white/10 rounded-lg"
                    onClick={() => setShowHistory(v => !v)}
                    title="Lịch sử hội thoại"
                  >
                    <History className="h-3.5 w-3.5" />
                  </Button>
                  {/* Pin */}
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-white/70 hover:bg-white/10 rounded-lg hidden lg:flex"
                    onClick={() => setIsPinned(!isPinned)}
                    title={isPinned ? 'Unpin' : 'Pin to sidebar'}
                  >
                    {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </Button>
                  {!isPinned && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:bg-white/10 rounded-lg" onClick={() => setIsMinimized(!isMinimized)}>
                      {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:bg-white/10 rounded-lg" onClick={() => setIsOpen(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              {!isMinimized && (
                <>
                  {/* ── History drawer ── */}
                  <AnimatePresence>
                    {showHistory && unitConversations.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-border/50 bg-cream overflow-hidden"
                      >
                        <div className="px-4 py-2 space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Hội thoại gần đây</p>
                          {unitConversations.map(c => (
                            <button
                              key={c.id}
                              onClick={() => { setActiveConversationId(c.id); setShowHistory(false); }}
                              className="w-full text-left text-xs px-3 py-2 rounded-xl hover:bg-white border border-transparent hover:border-border transition-all text-foreground/70 font-medium truncate"
                            >
                              {c.title}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <CardContent className="p-0 flex-1 overflow-hidden flex flex-col relative">
                    <ScrollArea className="flex-1 px-4 pt-4" ref={scrollRef}>
                      <div className="space-y-4 pb-28">
                        {messages.length === 0 && (
                          <div className="text-center py-8 space-y-2">
                            <div className="h-12 w-12 rounded-2xl bg-sakura/10 flex items-center justify-center mx-auto">
                              <Sparkles className="h-6 w-6 text-sakura" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">
                              Xin chào {profile?.full_name || 'bạn'}!
                            </p>
                            <p className="text-xs text-muted-foreground opacity-70">
                              Đang học: <span className="font-bold text-sakura">{unitTitle}</span>
                            </p>
                          </div>
                        )}

                        {messages.map((msg, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                              <div className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm mt-0.5',
                                msg.role === 'user' ? 'bg-indigo-600' : 'bg-sakura',
                              )}>
                                {msg.role === 'user'
                                  ? <User className="h-3.5 w-3.5 text-white" />
                                  : <GraduationCap className="h-3.5 w-3.5 text-white" />
                                }
                              </div>
                              <div className="space-y-1">
                                <div className={cn(
                                  'p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm relative group border',
                                  msg.role === 'user'
                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-900 rounded-tr-none'
                                    : 'bg-white border-border rounded-tl-none',
                                )}>
                                  {/* Render markdown bold & newlines */}
                                  {msg.content.split('\n').map((line, i) => (
                                    <p key={i} className={i > 0 ? 'mt-1' : ''}>
                                      {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                                    </p>
                                  ))}
                                  {msg.role === 'assistant' && (
                                    <button
                                      onClick={() => speak(msg.content)}
                                      disabled={isSpeaking}
                                      className="absolute -right-8 top-0 h-6 w-6 rounded-full bg-sakura-light/20 border p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Volume2 className="h-full w-full text-muted-foreground" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}

                        {isLoading && (
                          <div className="flex justify-start">
                            <div className="flex gap-3 items-center bg-white/80 backdrop-blur-md p-3 px-4 rounded-full border border-border shadow-sm">
                              <div className="flex gap-1">
                                {[0, 0.2, 0.4].map((delay, i) => (
                                  <motion.div
                                    key={i}
                                    animate={{ scale: [1, 1.5, 1] }}
                                    transition={{ repeat: Infinity, duration: 1, delay }}
                                    className="h-1.5 w-1.5 rounded-full bg-sakura"
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] font-bold text-sakura uppercase tracking-widest">Sensei đang soạn...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Quick actions — hiện sau tin nhắn thứ 2 */}
                    {messages.length >= 2 && (
                      <div className="absolute bottom-[72px] left-3 right-3 flex flex-wrap gap-1.5 pointer-events-none">
                        {(['kanji', 'quiz', 'grammar'] as const).map((action) => (
                          <motion.button
                            key={action}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => handleQuickAction(action)}
                            className={cn(
                              'pointer-events-auto backdrop-blur-md text-[9px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5',
                              action === 'kanji' ? 'bg-indigo-600/90 text-white hover:bg-indigo-700' :
                              action === 'quiz'  ? 'bg-sakura/90 text-white hover:bg-rose-500' :
                                                   'bg-emerald-600/90 text-white hover:bg-emerald-700'
                            )}
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            {action === 'kanji' ? 'Kanji' : action === 'quiz' ? 'Quiz' : 'Ngữ pháp'}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {/* Roleplay suggestions — hiện khi < 5 tin nhắn */}
                    {messages.length < 4 && (
                      <div className="absolute bottom-[110px] left-3 right-3 flex flex-wrap gap-1.5 pointer-events-none">
                        {scenarios.map((s) => (
                          <motion.button
                            key={s.label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => handleRoleplay(s.value)}
                            className="pointer-events-auto bg-white/70 backdrop-blur-md border border-white/40 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full hover:bg-sakura hover:text-white transition-all shadow-sm"
                          >
                            <Users className="h-2.5 w-2.5 inline mr-1" />
                            {s.label}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  {/* ── Footer / Input ── */}
                  <CardFooter className="p-3 border-t border-border/50 flex gap-2 items-center bg-white/80 backdrop-blur-sm">
                    <Button
                      variant="ghost" size="icon"
                      className="h-9 w-9 rounded-xl text-muted-foreground/70 hover:text-destructive hover:bg-destructive/5 shrink-0"
                      onClick={handleClearChat}
                      title="Cuộc hội thoại mới"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="relative flex-1">
                      <Input
                        placeholder="Hỏi Sensei..."
                        className="pr-20 h-10 rounded-xl text-sm border-border bg-cream focus-visible:ring-indigo-500 focus-visible:ring-1"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                      />
                      <div className="absolute right-1 top-0.5 flex items-center gap-0.5">
                        <Button
                          onClick={() => isListening ? stopListening() : startListening()}
                          variant="ghost" size="icon"
                          className={cn('h-9 w-9 rounded-lg transition-all', isListening ? 'bg-red-500 text-white' : 'text-muted-foreground/70 hover:text-sakura')}
                        >
                          {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          className="h-9 w-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => handleSend()}
                          disabled={isLoading || !input.trim()}
                        >
                          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB Button ── */}
      {!isPinned && (
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all relative z-[60]',
            isOpen
              ? 'bg-white border border-border text-foreground/80'
              : 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white',
          )}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="x" initial={{ rotate: -90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }}>
                <X className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div key="chat" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="relative">
                <MessageSquare className="h-5 w-5" />
                {/* Unread badge nếu có tin nhắn mới */}
                {messages.length > 1 && !isOpen && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-sakura text-[8px] font-bold text-white flex items-center justify-center">
                    {Math.min(messages.filter(m => m.role === 'assistant').length, 9)}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      )}
    </div>
  );
};
