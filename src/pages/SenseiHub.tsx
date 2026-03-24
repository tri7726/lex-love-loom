import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { SenseiSidebar } from '@/components/chat/SenseiChatHub/SenseiSidebar';
import { SenseiChatFrame } from '@/components/chat/SenseiChatHub/SenseiChatFrame';
import { SenseiInput } from '@/components/chat/SenseiChatHub/SenseiInput';
import { useSenseiChat } from '@/components/chat/SenseiChatHub/useSenseiChat';
import { SenseiMode } from '@/components/chat/SenseiChatHub/types';
import { 
  Sparkles, 
  MessageSquare, 
  Gamepad2, 
  Camera, 
  Mic,
  BrainCircuit,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const MODES = [
  { id: 'tutor' as SenseiMode, name: 'Sensei Tutor', icon: BrainCircuit, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Học tập và giải đáp thắc mắc' },
  { id: 'roleplay' as SenseiMode, name: 'Nhập vai', icon: Gamepad2, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Luyện tập tình huống thực tế' },
  { id: 'analysis' as SenseiMode, name: 'Phân tích', icon: Camera, color: 'text-orange-500', bg: 'bg-orange-500/10', desc: 'Nhận diện vật thể qua ảnh' },
  { id: 'speaking' as SenseiMode, name: 'Luyện nói', icon: Mic, color: 'text-green-500', bg: 'bg-green-500/10', desc: 'Phát âm và nói tự nhiên' }
];

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

  const [activeMode, setActiveMode] = useState<SenseiMode>('tutor');

  const filteredConversations = conversations.filter(c => c.mode === activeMode);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-sakura/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <Navigation />
      
      <main className="flex-1 flex overflow-hidden relative z-10 container max-w-7xl mx-auto px-0 md:px-4 py-0 md:py-4">
        <div className="flex-1 flex bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-slate-800/20 rounded-none md:rounded-[2rem] shadow-2xl overflow-hidden">
          
          {/* Mode Selector Sidebar (Leftmost) - Sleek & Minimal */}
          <aside className="w-16 md:w-20 border-r border-white/10 dark:border-slate-800/10 flex flex-col items-center py-8 gap-8 bg-white/20 dark:bg-slate-900/20">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={cn(
                  "p-3 rounded-2xl transition-all relative group",
                  activeMode === mode.id 
                    ? "bg-sakura text-white shadow-lg shadow-sakura/30 scale-110" 
                    : "text-slate-400 hover:bg-sakura/10 hover:text-sakura"
                )}
                title={mode.name}
              >
                <mode.icon className="h-6 w-6" />
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                  {mode.name}
                </div>
              </button>
            ))}
            
            <div className="mt-auto pb-4">
               <Button variant="ghost" size="icon" className="rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <Settings2 className="h-5 w-5" />
               </Button>
            </div>
          </aside>
  
          {/* Conversation Sidebar - Modern & Clean */}
          <div className="w-72 lg:w-80 hidden md:block border-r border-white/10 dark:border-slate-800/10 bg-white/5 dark:bg-slate-900/5">
            <SenseiSidebar 
              conversations={filteredConversations}
              activeId={activeConversation?.id || null}
              onSelect={setActiveConversationId}
              onNew={() => createNewConversation('Cuộc hội thoại mới', activeMode)}
              onPin={pinConversation}
              onDelete={deleteConversation}
            />
          </div>
  
          {/* Main Chat Area - Immersive */}
          <div className="flex-1 flex flex-col relative">
            <SenseiChatFrame 
              conversation={activeConversation}
              messages={messages}
              isLoading={isLoading}
              onSaveWord={(word) => console.log('Save word', word)}
              onSpeak={(text) => {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ja-JP';
                window.speechSynthesis.speak(utterance);
              }}
            />
            
            <div className="p-4 md:p-8 w-full max-w-4xl mx-auto">
              <SenseiInput 
                onSend={(content) => sendMessage(content, activeMode)}
                disabled={isLoading || (!activeConversation && messages.length > 0)}
                placeholder={
                  activeMode === 'speaking' ? "Nhấn micro để luyện nói..." :
                  activeMode === 'analysis' ? "Tải lên ảnh để phân tích..." :
                  "Nhập tin nhắn cho Sensei..."
                }
                mode={activeMode}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
