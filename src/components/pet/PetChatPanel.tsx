import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef, useEffect, useState } from 'react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'pet';
  text: string;
  type?: 'action' | 'system' | 'evolution';
}

export interface Suggestion {
  id: string;
  label: string;
  icon: string;
}

interface PetChatPanelProps {
  messages: ChatMessage[];
  petEmoji: string;
  petName: string;
  suggestions: Suggestion[];
  onSuggestion: (id: string) => void;
  onSendText: (text: string) => void;
  disabled?: boolean;
}

export const PetChatPanel = ({
  messages,
  petEmoji,
  petName,
  suggestions,
  onSuggestion,
  onSendText,
  disabled,
}: PetChatPanelProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendText(text.trim());
      setText('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div ref={viewportRef} className="px-4 py-4 space-y-3 min-h-full">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-16"
              >
                <MessageCircle className="h-14 w-14 mb-4 opacity-20" />
                <p className="font-medium text-base">Bắt đầu trò chuyện với {petName || 'thú cưng'}!</p>
                <p className="text-xs mt-1.5 max-w-xs">
                  Hãy gửi lời chào hoặc chọn một gợi ý bên dưới nhé.
                </p>
              </motion.div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    'flex',
                    msg.sender === 'user' ? 'justify-end' : 'justify-start',
                    msg.type === 'system' ? 'justify-center' : '',
                  )}
                >
                  {msg.type === 'system' ? (
                    <p className="text-[11px] text-muted-foreground italic bg-muted/50 px-3 py-1.5 rounded-full">
                      {msg.text}
                    </p>
                  ) : (
                    <div
                      className={cn(
                        'max-w-[85%] px-4 py-2.5 text-sm leading-relaxed',
                        msg.sender === 'user'
                          ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm shadow-sm'
                          : msg.type === 'evolution'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl rounded-bl-sm'
                            : msg.type === 'action'
                              ? 'bg-muted/70 text-muted-foreground rounded-2xl italic'
                              : 'bg-white border shadow-sm rounded-2xl rounded-bl-sm',
                      )}
                    >
                      {msg.sender === 'pet' && (
                        <span className="mr-1.5">{petEmoji}</span>
                      )}
                      {msg.text}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Suggestion chips */}
      {suggestions.length > 0 && (
        <div className="px-4 py-3 flex gap-2 overflow-x-auto border-t">
          {suggestions.map((s) => (
            <Button
              key={s.id}
              variant="outline"
              size="sm"
              onClick={() => onSuggestion(s.id)}
              disabled={disabled}
              className="rounded-full whitespace-nowrap text-xs font-medium shrink-0 h-9"
            >
              {s.icon} {s.label}
            </Button>
          ))}
        </div>
      )}

      {/* Text input */}
      <div className="px-4 pb-4 pt-2 border-t bg-gradient-to-t from-background to-transparent">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Nhắn với ${petName || 'thú cưng'}...`}
            disabled={disabled}
            className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sakura/40 focus:border-sakura transition-all placeholder:text-muted-foreground/50"
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-xl shrink-0 h-10 w-10"
            disabled={!text.trim() || disabled}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
