import React from 'react';
import { Sparkles } from 'lucide-react';
import { SenseiChatFrame } from '@/components/chat/SenseiChatHub/SenseiChatFrame';
import { SenseiInput } from '@/components/chat/SenseiChatHub/SenseiInput';
import { useSenseiChat } from '@/components/chat/SenseiChatHub/useSenseiChat';
import { toast } from "sonner";
import { SenseiSidebar } from '@/components/chat/SenseiChatHub/SenseiSidebar';

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

  // Locked to tutor mode for the main Hub
  const activeMode = 'tutor';
  const filteredConversations = conversations.filter(c => c.mode === activeMode);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-cream flex flex-col relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-sakura/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-sakura-light/20 rounded-full blur-[150px] pointer-events-none animate-pulse" />
      
      <main className="flex-1 flex overflow-hidden relative z-10 container max-w-7xl mx-auto px-0 py-0 pb-6 md:px-6">
        <div className="flex-1 flex bg-white/95 backdrop-blur-[100px] border border-sakura/5 rounded-none md:rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(255,183,197,0.15)] overflow-hidden mt-6 ring-1 ring-white/50">
          
          {/* Conversation Sidebar */}
          <div className="w-80 flex overflow-hidden">
            <SenseiSidebar 
              conversations={filteredConversations}
              activeId={activeConversation?.id || null}
              onSelect={setActiveConversationId}
              onNew={() => createNewConversation('Cuộc hội thoại mới', activeMode)}
              onPin={pinConversation}
              onDelete={deleteConversation}
            />
          </div>
  
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col relative bg-gradient-to-br from-white to-cream/30">
            <div className="px-8 py-7 flex items-center justify-between bg-white/40 backdrop-blur-3xl shrink-0 z-20">
               <div className="flex items-center gap-6">
                 <div className="h-12 w-12 rounded-[1.5rem] bg-gradient-to-br from-white to-sakura/5 flex items-center justify-center text-sakura border border-sakura/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02),0_4px_12px_rgba(255,183,197,0.1)]">
                   <Sparkles className="h-6 w-6" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-serif font-black text-slate-800 tracking-tight flex items-center gap-3">
                     Sakura Sensei
                   </h2>
                   <p className="text-[10px] text-sakura uppercase tracking-[0.4em] font-black opacity-60">Thanh tao & Thông tuệ</p>
                 </div>
               </div>
            </div>

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
            
            <div className="p-2 w-full max-w-4xl mx-auto border-t border-sakura/10 bg-white/10 backdrop-blur-md">
              <SenseiInput 
                onSend={(content, type, metadata) => sendMessage(content, type, metadata)}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
