import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mic, Volume2, Send, Loader2, Trash2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTTS } from '@/hooks/useTTS';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  translation?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/japanese-chat`;

const SpeakingPractice = () => {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'こんにちは！日本語で話しましょう。何か質問がありますか？',
      translation: 'Xin chào! Hãy nói chuyện bằng tiếng Nhật. Bạn có câu hỏi gì không?',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { speak, stop, isSpeaking, isSupported } = useTTS({ lang: 'ja-JP', rate: 0.85 });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);
  const parseResponse = (content: string): { japanese: string; translation: string } => {
    // Try to extract translation marked with [翻訳] or similar patterns
    const translationMatch = content.match(/\[翻訳\]\s*(.+?)(?:\n|$)/);
    const vietnameseMatch = content.match(/\[Tiếng Việt\]\s*(.+?)(?:\n|$)/i);
    
    let japanese = content;
    let translation = '';
    
    if (translationMatch) {
      japanese = content.replace(/\[翻訳\]\s*.+?(?:\n|$)/, '').trim();
      translation = translationMatch[1].trim();
    } else if (vietnameseMatch) {
      japanese = content.replace(/\[Tiếng Việt\]\s*.+?(?:\n|$)/i, '').trim();
      translation = vietnameseMatch[1].trim();
    }
    
    return { japanese, translation };
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: message };
    setConversation(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...conversation, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      // Add empty assistant message
      setConversation(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setConversation(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  const { japanese, translation } = parseResponse(assistantContent);
                  updated[updated.length - 1] = {
                    ...last,
                    content: japanese,
                    translation,
                  };
                }
                return updated;
              });
            }
          } catch {
            // Partial JSON, continue
          }
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.',
        variant: 'destructive',
      });
      // Remove the empty assistant message if error occurred
      setConversation(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    setConversation([
      {
        role: 'assistant',
        content: 'こんにちは！日本語で話しましょう。何か質問がありますか？',
        translation: 'Xin chào! Hãy nói chuyện bằng tiếng Nhật. Bạn có câu hỏi gì không?',
      },
    ]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 space-y-2">
            <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-2">
              <MessageSquare className="h-8 w-8 text-matcha" />
              AI Speaking Practice
            </h1>
            <p className="text-muted-foreground">
              Luyện hội thoại tiếng Nhật với AI
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={clearConversation}>
            <Trash2 className="h-4 w-4 mr-2" />
            Xóa hội thoại
          </Button>
        </div>

        {/* Chat Area */}
        <Card className="shadow-card min-h-[400px] max-h-[60vh] flex flex-col">
          <CardHeader className="py-3">
            <CardTitle className="text-lg">Hội thoại</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 overflow-y-auto">
            {conversation.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="font-jp whitespace-pre-wrap">{msg.content}</p>
                  {msg.translation && (
                    <p className="text-sm opacity-70 mt-2 pt-2 border-t border-current/20">
                      {msg.translation}
                    </p>
                  )}
                  {msg.role === 'assistant' && msg.content && isSupported && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => isSpeaking ? stop() : speak(msg.content)}
                      className="mt-2 h-8"
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="h-4 w-4 mr-1" />
                          Dừng
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4 mr-1" />
                          Nghe
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && conversation[conversation.length - 1]?.role !== 'assistant' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-muted p-4 rounded-2xl">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nhập tiếng Nhật hoặc tiếng Việt..."
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isLoading}
          />
          <Button variant="outline" size="icon" disabled>
            <Mic className="h-5 w-5" />
          </Button>
          <Button onClick={handleSend} disabled={isLoading || !message.trim()}>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          💡 Mẹo: Hãy thử hỏi "〇〇は日本語で何ですか？" để học từ mới!
        </p>
      </main>
    </div>
  );
};

export default SpeakingPractice;
