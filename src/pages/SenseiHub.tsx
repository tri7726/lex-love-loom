import React, { useState } from 'react';
import { Sparkles, History, PanelLeftClose, PanelLeft } from 'lucide-react';
import { SenseiChatFrame } from '@/components/chat/SenseiChatHub/SenseiChatFrame';
import { SenseiInput } from '@/components/chat/SenseiChatHub/SenseiInput';
import { useSenseiChat } from '@/components/chat/SenseiChatHub/useSenseiChat';
import { toast } from "sonner";
import { SenseiSidebar } from '@/components/chat/SenseiChatHub/SenseiSidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { SenseiMode } from '@/components/chat/SenseiChatHub/types';
import { BookOpen, Mic, Languages, MessageSquare } from 'lucide-react';
import FallingPetals from '@/components/chat/SenseiChatHub/FallingPetals';

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
    deleteConversation,
    isGuest,
    guestMessageCount
  } = useSenseiChat();

  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [searchParams] = useSearchParams();
  const activeMode = (searchParams.get('mode') as SenseiMode) || 'tutor';
  const filteredConversations = conversations.filter(c => c.mode === activeMode);

  const getModeInfo = (mode: SenseiMode) => {
    switch (mode) {
      case 'roleplay':
        return { 
          title: 'Roleplay Studio', 
          subtitle: 'Nhập vai tình huống thực tế', 
          icon: MessageSquare,
          color: 'bg-indigo-500/10 text-indigo-500'
        };
      case 'speaking':
        return { 
          title: 'Speaking Lab', 
          subtitle: 'Luyện phát âm chuẩn Sensei', 
          icon: Mic,
          color: 'bg-rose-500/10 text-rose-500' 
        };
      case 'analysis':
        return { 
          title: 'Grammar Analytics', 
          subtitle: 'Phân tích mẫu câu chuyên sâu', 
          icon: Languages,
          color: 'bg-blue-500/10 text-blue-500'
        };
      default:
        return { 
          title: 'Sakura Sensei', 
          subtitle: 'Trợ lý học tiếng Nhật thông minh', 
          icon: Sparkles,
          color: 'bg-sakura/10 text-sakura'
        };
    }
  };

  const modeInfo = getModeInfo(activeMode);

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
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#FDFCFB] overflow-hidden relative font-sans">
      <FallingPetals />
      
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Desktop Sidebar with Transition */}
        {!isMobile && (
          <div 
            className={cn(
              "transition-all duration-500 ease-in-out border-r border-border/40 bg-white/40 backdrop-blur-md overflow-hidden",
              showSidebar ? "w-72 xl:w-80 opacity-100" : "w-0 opacity-0 border-none"
            )}
          >
            {sidebarContent}
          </div>
        )}

        {/* Mobile Sidebar */}
        {isMobile && (
          <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
            <SheetContent side="left" className="p-0 w-80">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {/* Header - ChatGPT/DeepSeek Style */}
          <div className="px-4 md:px-8 py-4 flex items-center justify-between bg-white/50 backdrop-blur-lg border-b border-border/40 shrink-0">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setShowSidebar(!showSidebar)}
                className="group flex items-center gap-2 hover:bg-sakura/10 text-muted-foreground hover:text-sakura transition-all duration-300 px-3 rounded-xl"
              >
                {showSidebar ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest hidden group-hover:inline transition-all duration-300">
                  Lịch sử học tập
                </span>
              </Button>
              
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm", modeInfo.color)}>
                  <modeInfo.icon className="h-5 w-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-foreground tracking-tight font-serif">
                    {modeInfo.title}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
               <div className="hidden md:flex flex-col items-end px-4 border-r border-border/40">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
                    {isGuest ? 'Học thử' : 'Status'}
                  </span>
                  <span className={cn(
                    "text-[10px] font-medium uppercase tracking-wider leading-none",
                    isGuest ? "text-amber-500" : "text-green-500"
                  )}>
                    {isGuest ? `Giới hạn: ${guestMessageCount}/5` : 'Pro Max Ultra Engaged'}
                  </span>
               </div>
               <Button variant="ghost" size="icon" className="rounded-full hover:bg-sakura/10 text-sakura">
                  <Sparkles className="h-5 w-5" />
               </Button>
            </div>
          </div>

          {/* Chat Frame - Centered ChatGPT Style */}
          <div className="flex-1 overflow-hidden flex justify-center">
            <div className="w-full max-w-[80%] h-full flex flex-col">
              <SenseiChatFrame 
                conversation={activeConversation}
                messages={messages}
                isLoading={isLoading}
                onSaveWord={(word) => toast.success(`Đã lưu "${word}" vào kho báu tri thức 🌸`)}
                onSpeak={(text) => {
                  const utterance = new SpeechSynthesisUtterance(text);
                  utterance.lang = 'ja-JP';
                  utterance.rate = 0.9; // More natural, 'Zen' pace
                  window.speechSynthesis.speak(utterance);
                }}
              />
            </div>
          </div>
          
          {/* Input - Floating Pill Style */}
          <div className="px-4 pb-6 pt-2 shrink-0 flex justify-center bg-gradient-to-t from-white via-white/80 to-transparent">
            <div className="w-full max-w-[80%] transform transition-all duration-500 hover:scale-[1.01]">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-sakura/10 via-sakura-light/20 to-sakura/10 rounded-[28px] blur-md opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                <div className="relative bg-white/70 backdrop-blur-2xl border border-border/40 rounded-[26px] shadow-soft p-1 overflow-hidden transition-all duration-500 group-hover:bg-white/90">
                  <SenseiInput 
                    onSend={(content, type, metadata) => sendMessage(content, type, metadata)}
                    isLoading={isLoading}
                    isGuest={isGuest}
                    guestMessageCount={guestMessageCount}
                  />
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] text-muted-foreground uppercase tracking-widest font-medium opacity-50">
                Sensei Hub Pro Max Ultra Plus — Powered by Cultural Wisdom
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
