import React from 'react';
import { Sparkles, Menu } from 'lucide-react';
import { SenseiChatFrame } from '@/components/chat/SenseiChatHub/SenseiChatFrame';
import { SenseiInput } from '@/components/chat/SenseiChatHub/SenseiInput';
import { useSenseiChat } from '@/components/chat/SenseiChatHub/useSenseiChat';
import { toast } from "sonner";
import { SenseiSidebar } from '@/components/chat/SenseiChatHub/SenseiSidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function SenseiHub() {
  const { 
    conversations, 
    activeConversation, 
    messages, 
    isLoading, 
    sendMessage, 
    createNewConversation, 
    setActiveConversationId,
    pinConversation,
    deleteConversation
  } = useSenseiChat();

  const isMobile = useIsMobile();
  const activeMode = 'tutor';
  const filteredConversations = conversations.filter(c => c.mode === activeMode);

  const sidebarContent = (
    <SenseiSidebar 
      conversations={filteredConversations}
      activeId={activeConversation?.id || null}
      onSelect={setActiveConversationId}
      onNew={() => createNewConversation('Cuộc hội thoại mới', activeMode)}
      onPin={pinConversation}
      onDelete={deleteConversation}
    />
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-background overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="w-72 xl:w-80 border-r border-border/50 flex-shrink-0 overflow-hidden">
            {sidebarContent}
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-4 md:px-6 py-3 flex items-center gap-3 border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-80">
                  {sidebarContent}
                </SheetContent>
              </Sheet>
            )}
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground tracking-tight truncate">
                Sakura Sensei
              </h2>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Trợ lý học tiếng Nhật
              </p>
            </div>
          </div>

          {/* Chat Frame */}
          <SenseiChatFrame 
            conversation={activeConversation}
            messages={messages}
            isLoading={isLoading}
            onSaveWord={(word) => toast.success(`Đã lưu "${word}"`)}
            onSpeak={(text) => {
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = 'ja-JP';
              window.speechSynthesis.speak(utterance);
            }}
          />
          
          {/* Input */}
          <div className="p-3 md:p-4 border-t border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto">
              <SenseiInput 
                onSend={(content, type, metadata) => sendMessage(content, type, metadata)}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
