import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Sparkles, Plus } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { SenseiSidebar } from '@/components/chat/SenseiChatHub/SenseiSidebar';
import { SenseiChatFrame } from '@/components/chat/SenseiChatHub/SenseiChatFrame';
import { SenseiInput } from '@/components/chat/SenseiChatHub/SenseiInput';
import { useSenseiChat } from '@/components/chat/SenseiChatHub/useSenseiChat';
import { useFlashcardFolders } from '@/hooks/useFlashcardFolders';
import { toast } from 'sonner';

export const AITutor = () => {
  const { 
    conversations, 
    activeConversationId, 
    setActiveConversationId,
    messages, 
    isLoading, 
    sendMessage, 
    createNewConversation,
    togglePin,
    deleteConversation
  } = useSenseiChat();

  const [isAnalyzingImage, setIsAnalyzingImage] = React.useState(false);
  const { saveToInbox } = useFlashcardFolders();
  const activeConv = conversations.find(c => c.id === activeConversationId) || null;

  const handleSaveWord = async (word: string) => {
    try {
      await saveToInbox({
        word,
        meaning: 'Đang chờ cập nhật nghĩa...',
        reading: '',
      });
      toast.success(`Đã lưu "${word}" vào Hộp thư đến!`);
    } catch (err) {
      toast.error('Không thể lưu từ vựng.');
    }
  };

  const handleSpeak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 flex flex-col h-screen overflow-hidden">
      <Navigation />

      <main className="flex-1 flex overflow-hidden relative z-10 pt-16">
        {/* Sidebar Container */}
        <aside className="w-80 hidden lg:block border-r border-sakura/10 overflow-hidden">
          <SenseiSidebar 
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={setActiveConversationId}
            onNew={createNewConversation}
            onPin={togglePin}
            onDelete={deleteConversation}
          />
        </aside>

        {/* Chat Hub Main Area */}
        <section className="flex-1 flex flex-col min-w-0 bg-sakura-light/5 dark:bg-slate-950/20">
          <div className="flex-1 flex flex-col min-h-0">
             <SenseiChatFrame 
                conversation={activeConv}
                messages={messages}
                isLoading={isLoading}
                onSaveWord={handleSaveWord}
                onSpeak={handleSpeak}
             />
             
             {activeConversationId || messages.length > 0 ? (
               <SenseiInput 
                  onSend={sendMessage}
                  isLoading={isLoading}
                  isAnalyzingImage={isAnalyzingImage}
                  setIsAnalyzingImage={setIsAnalyzingImage}
               />
             ) : (
               <div className="p-10 text-center">
                  <Button 
                    onClick={createNewConversation}
                    className="bg-sakura text-white rounded-2xl gap-2 font-black uppercase tracking-widest px-8"
                  >
                    <Plus className="h-4 w-4" />
                    Bắt đầu hội thoại đầu tiên
                  </Button>
               </div>
             )}
          </div>
        </section>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sakura/5 rounded-full blur-[120px] pointer-events-none -mr-40 -mt-40 -z-10" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-sakura/5 rounded-full blur-[100px] pointer-events-none -ml-20 -mb-20 -z-10" />
      </main>
    </div>
  );
};

// Mock Button for usage in the bottom placeholder
const Button = ({ children, onClick, className }: any) => (
  <button onClick={onClick} className={className + " py-3 transition-all hover:scale-105 active:scale-95"}>
    {children}
  </button>
);
