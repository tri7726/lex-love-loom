import React, { useState } from 'react';
import { Send, Image as ImageIcon, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  onSend: (content: string) => Promise<void> | void;
  sending?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, sending = false }) => {
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    try {
      await onSend(content);
    } catch {
      setInput(content); // restore on failure
    }
  };

  return (
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
  );
};
