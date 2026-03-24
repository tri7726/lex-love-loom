import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  MapPin, 
  ShoppingBag, 
  Coffee, 
  Plane, 
  Briefcase, 
  Utensils,
  ChevronLeft,
  Sparkles,
  Loader2,
  Volume2,
  User,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Navigation } from '@/components/Navigation';
import { useAI } from '@/contexts/AIContext';
import { useTTS } from '@/hooks/useTTS';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  persona: string;
  systemPrompt: string;
  firstMessage: string;
  color: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'airport',
    title: 'Tại Sân Bay',
    description: 'Làm thủ tục check-in và hỏi đường tại sân bay Narita.',
    icon: <Plane className="h-6 w-6" />,
    image: 'https://images.unsplash.com/photo-1530132027412-2849f9114d2e?w=800&auto=format&fit=crop',
    persona: 'Nhân viên sân bay (Airport Staff)',
    color: 'sakura',
    systemPrompt: 'Bạn là nhân viên check-in tại sân bay Narita. Hãy nói bằng tiếng Nhật lịch sự (Keigo/Teineigo). Mục tiêu của người dùng là check-in cho chuyến bay đi Hà Nội. Hãy hỏi về hộ chiếu và hành lý của họ.',
    firstMessage: 'いらっしゃいませ。成田空港へようこそ。パスポートをお願いします。',
  },
  {
    id: 'restaurant',
    title: 'Gọi Món Tại Izakaya',
    description: 'Trải nghiệm không khí quán nhậu Nhật Bản và gọi món.',
    icon: <Utensils className="h-6 w-6" />,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
    persona: 'Phục vụ quán (Waiter)',
    color: 'matcha',
    systemPrompt: 'Bạn là phục vụ tại một quán Izakaya truyền thống. Hãy nói năng nhiệt tình, dùng tiếng Nhật tự nhiên. Hãy giới thiệu món đặc sản hôm nay là Sashimi.',
    firstMessage: 'いらっしゃいませ！お飲み物は何になさいますか？本日のおすすめは刺身の盛り合わせです。',
  },
  {
    id: 'coffee',
    title: 'Quán Cà Phê Ở Tokyo',
    description: 'Tán gẫu với bạn bè hoặc gọi một ly Latte đá.',
    icon: <Coffee className="h-6 w-6" />,
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop',
    persona: 'Bạn bè (Friend) hoặc Barista',
    color: 'indigo-jp',
    systemPrompt: 'Bạn là một nhân viên pha chế tại quán cà phê hiện đại ở Shibuya. Hãy nói chuyện thân thiện nhưng vẫn chuyên nghiệp. Hãy hỏi xem người dùng muốn uống tại đây hay mang về.',
    firstMessage: 'こんにちは！ご注文をお伺いします。店内でお召し上がりですか？',
  },
  {
    id: 'interview',
    title: 'Phỏng Vấn Xin Việc',
    description: 'Thử sức với buổi phỏng vấn bằng tiếng Nhật chuyên nghiệp.',
    icon: <Briefcase className="h-6 w-6" />,
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&auto=format&fit=crop',
    persona: 'Người phỏng vấn (Interviewer)',
    color: 'sumi',
    systemPrompt: 'Bạn là người phỏng vấn tại một công ty công nghệ lớn ở Tokyo. Hãy dùng kính ngữ (Sonkeigo/Kenjougo) chuẩn mực. Hãy bắt đầu bằng cách yêu cầu người dùng giới thiệu bản thân.',
    firstMessage: '本日はお越しいただきありがとうございます。まずは、簡単に自己紹介をお願いいたします。',
  },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIRoleplay = () => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { chat, isChatting: isLoading } = useAI();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { speak, isSpeaking } = useTTS();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setMessages([{ role: 'assistant', content: scenario.firstMessage }]);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedScenario || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    try {
      const data = await chat(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        selectedScenario.systemPrompt
      );

      if (data) {
        let content = '';
        if (typeof data === 'string') {
          content = data;
        } else if (data.content) {
          content = data.content;
        } else if (data.text) {
          content = data.text;
        }
        
        if (content) {
          setMessages([...newMessages, { role: 'assistant', content }]);
        }
      }
    } catch (error) {
      console.error('Roleplay chat error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <main className="container py-10">
        <AnimatePresence mode="wait">
          {!selectedScenario ? (
            <motion.div
              key="selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                <Badge variant="outline" className="px-4 py-1 border-primary/20 bg-primary/5 text-primary">
                  AI Roleplay Studio
                </Badge>
                <h1 className="text-4xl md:text-5xl font-display font-bold">Hội thoại tình huống</h1>
                <p className="text-muted-foreground text-lg">
                  Luyện tập tiếng Nhật trong môi trường thực tế với AI Sensei. Hãy chọn một bối cảnh để bắt đầu.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {SCENARIOS.map((scenario) => (
                  <Card 
                    key={scenario.id} 
                    className="group overflow-hidden cursor-pointer hover:shadow-elevated transition-all border-2 border-transparent hover:border-primary/20"
                    onClick={() => startScenario(scenario)}
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img 
                        src={scenario.image} 
                        alt={scenario.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
                        <div className={cn("p-2 rounded-lg bg-white/20 backdrop-blur-md")}>
                          {scenario.icon}
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-bold text-lg">{scenario.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {scenario.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-4xl mx-auto space-y-4"
            >
              <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => setSelectedScenario(null)} className="rounded-full">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <div>
                  <h2 className="text-2xl font-bold">{selectedScenario.title}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Bot className="h-3 w-3" /> Đang nói chuyện với: {selectedScenario.persona}
                  </p>
                </div>
              </div>

              <Card className="h-[60vh] flex flex-col border-2 border-primary/10 shadow-soft overflow-hidden bg-card/50 backdrop-blur-sm">
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin"
                >
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-4 max-w-[85%]",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                        msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}>
                        {msg.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                      </div>
                      <div className="space-y-2">
                        <div className={cn(
                          "px-5 py-3 rounded-2xl text-sm leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-primary text-primary-foreground shadow-sakura-sm" 
                            : "bg-white dark:bg-slate-800 shadow-soft border border-border"
                        )}>
                          <p className="font-medium whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.role === 'assistant' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs gap-1.5 opacity-50 hover:opacity-100"
                            onClick={() => speak(msg.content)}
                            disabled={isSpeaking}
                          >
                            <Volume2 className="h-3.5 w-3.5" /> Thuyết minh
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div className="flex gap-4 max-w-[85%]">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                      <div className="px-5 py-3 rounded-2xl bg-muted/50 text-sm italic text-muted-foreground animate-pulse">
                        Sensei đang soạn lời đáp...
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="p-4 border-t border-border bg-background/50">
                  <div className="flex gap-2">
                    <Textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Viết câu trả lời của bạn bằng tiếng Nhật..."
                      className="min-h-[60px] max-h-[150px] resize-none border-2 focus-visible:ring-primary/20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button 
                      onClick={handleSend} 
                      disabled={isLoading || !input.trim()}
                      className="h-auto px-6 rounded-xl bg-primary hover:bg-primary/90 shadow-sakura"
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 text-center flex items-center justify-center gap-1">
                    <Sparkles className="h-3 w-3" /> Mẹo: Sử dụng <strong>Shift + Enter</strong> để xuống dòng.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
