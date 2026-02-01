import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mic, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navigation from '@/components/Navigation';

const SpeakingPractice = () => {
  const [message, setMessage] = React.useState('');
  const [conversation, setConversation] = React.useState([
    {
      role: 'assistant',
      content: 'こんにちは！日本語で話しましょう。',
      translation: "Hello! Let's speak in Japanese.",
    },
  ]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;

    setConversation([
      ...conversation,
      { role: 'user', content: message, translation: '' },
      {
        role: 'assistant',
        content: 'いい質問ですね！もう一度言ってください。',
        translation: "That's a good question! Please say it again.",
      },
    ]);
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-2">
            <MessageSquare className="h-8 w-8 text-matcha" />
            AI Speaking Practice
          </h1>
          <p className="text-muted-foreground">
            Practice conversation with AI
          </p>
        </div>

        {/* Chat Area */}
        <Card className="shadow-card min-h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
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
                  <p className="font-jp">{msg.content}</p>
                  {msg.translation && (
                    <p className="text-sm opacity-70 mt-1">{msg.translation}</p>
                  )}
                  {msg.role === 'assistant' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => speak(msg.content)}
                      className="mt-2 h-8"
                    >
                      <Volume2 className="h-4 w-4 mr-1" />
                      Listen
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type in Japanese..."
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button variant="outline" size="icon">
            <Mic className="h-5 w-5" />
          </Button>
          <Button onClick={handleSend}>Send</Button>
        </div>
      </main>
    </div>
  );
};

export default SpeakingPractice;
