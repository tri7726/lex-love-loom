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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  const [isSavingSession, setIsSavingSession] = useState(false);

  const handleSaveSession = async () => {
    if (!cookieInput.trim()) {
      toast.error("Vui lòng nhập mã cookie");
      return;
    }

    setIsSavingSession(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Bạn cần đăng nhập để thực hiện việc này");
        return;
      }

      // Save session via Edge Function proxy
      const response = await supabase.functions.invoke('notebooklm-proxy', {
        body: { action: 'save_session', cookies: cookieInput.trim() }
      });

      if (response.error) throw new Error(response.error.message);

      toast.success("Đã lưu session NotebookLM thành công!");
      setIsAuthDialogOpen(false);
      setCookieInput('');
    } catch (error: any) {
      console.error('Error saving session:', error);
      toast.error("Lỗi khi lưu session: " + error.message);
    } finally {
      setIsSavingSession(false);
    }
  };

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
            
            <div className="mt-auto pb-4 flex flex-col gap-4">
               <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
                 <DialogTrigger asChild>
                   <Button variant="ghost" size="icon" className="rounded-2xl text-slate-400 hover:text-sakura group relative">
                      <BrainCircuit className="h-5 w-5" />
                      <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                        Kết nối NotebookLM
                      </div>
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-[500px] border-sakura/20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
                   <DialogHeader>
                     <DialogTitle className="flex items-center gap-2 text-sakura">
                       <BrainCircuit className="h-5 w-5" />
                       Kết nối NotebookLM Brain
                     </DialogTitle>
                     <DialogDescription>
                       Dán đoạn mã (cookie hoặc cURL) từ NotebookLM để kích hoạt bộ não AI cá nhân hóa của bạn.
                     </DialogDescription>
                   </DialogHeader>
                   <div className="grid gap-4 py-4">
                     <div className="grid gap-2">
                       <Label htmlFor="cookie" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                         Mã định danh (Cookie String / cURL)
                       </Label>
                       <textarea
                         id="cookie"
                         placeholder="Dán mã tại đây..."
                         className="flex min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sakura disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950"
                         value={cookieInput}
                         onChange={(e) => setCookieInput(e.target.value)}
                       />
                       <p className="text-[10px] text-slate-400 italic">
                         Mẹo: Bạn có thể dán toàn bộ đoạn lệnh cURL (từ tab Network) vào đây, hệ thống sẽ tự động xử lý.
                       </p>
                     </div>
                   </div>
                   <DialogFooter>
                     <Button 
                       onClick={handleSaveSession} 
                       disabled={isSavingSession}
                       className="bg-sakura hover:bg-sakura-dark text-white rounded-xl w-full"
                     >
                       {isSavingSession ? "Đang lưu..." : "Kích hoạt bộ não Sensei"}
                     </Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>

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
                onSend={(content, type, metadata) => sendMessage(content, type, metadata)}
                isLoading={isLoading}
                isAnalyzingImage={isAnalyzingImage}
                setIsAnalyzingImage={setIsAnalyzingImage}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
