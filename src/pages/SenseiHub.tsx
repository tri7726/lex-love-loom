import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { SenseiSidebar } from '@/components/chat/SenseiChatHub/SenseiSidebar';
import { SenseiChatFrame } from '@/components/chat/SenseiChatHub/SenseiChatFrame';
import { SenseiInput } from '@/components/chat/SenseiChatHub/SenseiInput';
import { useSenseiChat } from '@/components/chat/SenseiChatHub/useSenseiChat';
import { SenseiMode } from '@/components/chat/SenseiChatHub/types';
import { 
  Gamepad2, 
  Camera, 
  Mic,
  BrainCircuit,
  Settings2,
  Send,
  BookOpen,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { ScrollArea } from "@/components/ui/scroll-area";

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
  
  // NotebookLM Query state
  const [isQueryDialogOpen, setIsQueryDialogOpen] = useState(false);
  const [notebookId, setNotebookId] = useState('');
  const [queryText, setQueryText] = useState('');
  const [queryResult, setQueryResult] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryHistory, setQueryHistory] = useState<Array<{ q: string; a: string }>>([]);

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

      const response = await supabase.functions.invoke('notebooklm-proxy', {
        body: { action: 'save_session', cookies: cookieInput.trim(), notebook_id: notebookId.trim() || undefined }
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

  const handleQueryNotebook = async () => {
    if (!queryText.trim()) return;

    setIsQuerying(true);
    setQueryResult('');
    try {
      const response = await supabase.functions.invoke('notebooklm-proxy', {
        body: { 
          action: 'query', 
          query: queryText.trim(),
          notebook_id: notebookId.trim() || undefined
        }
      });

      if (response.error) throw new Error(response.error.message);

      const answer = response.data?.answer || 'Không có kết quả';
      setQueryResult(answer);
      setQueryHistory(prev => [{ q: queryText, a: answer }, ...prev]);
      setQueryText('');
    } catch (error: any) {
      console.error('Query error:', error);
      toast.error("Lỗi khi query: " + error.message);
    } finally {
      setIsQuerying(false);
    }
  };

  const filteredConversations = conversations.filter(c => c.mode === activeMode);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      <Navigation />
      
      <main className="flex-1 flex overflow-hidden relative z-10 container max-w-7xl mx-auto px-0 md:px-4 py-0 md:py-4">
        <div className="flex-1 flex bg-card/40 backdrop-blur-2xl border border-border/20 rounded-none md:rounded-[2rem] shadow-2xl overflow-hidden">
          
          {/* Mode Selector Sidebar */}
          <aside className="w-16 md:w-20 border-r border-border/10 flex flex-col items-center py-8 gap-8 bg-card/20">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={cn(
                  "p-3 rounded-2xl transition-all relative group",
                  activeMode === mode.id 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" 
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
                title={mode.name}
              >
                <mode.icon className="h-6 w-6" />
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-popover text-popover-foreground text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-border/10">
                  {mode.name}
                </div>
              </button>
            ))}
            
            <div className="mt-auto pb-4 flex flex-col gap-4">
               {/* NotebookLM Auth Dialog */}
               <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
                 <DialogTrigger asChild>
                   <Button variant="ghost" size="icon" className="rounded-2xl text-muted-foreground hover:text-primary group relative">
                      <BrainCircuit className="h-5 w-5" />
                      <div className="absolute left-full ml-4 px-3 py-1.5 bg-popover text-popover-foreground text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-border/10">
                        Kết nối NotebookLM
                      </div>
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-[500px] border-primary/20 bg-card/95 backdrop-blur-xl">
                   <DialogHeader>
                     <DialogTitle className="flex items-center gap-2 text-primary">
                       <BrainCircuit className="h-5 w-5" />
                       Kết nối NotebookLM Brain
                     </DialogTitle>
                     <DialogDescription>
                       Dán đoạn mã (cookie hoặc cURL) từ NotebookLM để kích hoạt bộ não AI cá nhân hóa.
                     </DialogDescription>
                   </DialogHeader>
                   <div className="grid gap-4 py-4">
                     <div className="grid gap-2">
                       <Label htmlFor="notebook-id" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                         Notebook ID (tùy chọn)
                       </Label>
                       <Input
                         id="notebook-id"
                         placeholder="a6d31377-ccf1-45ac-8801-..."
                         value={notebookId}
                         onChange={(e) => setNotebookId(e.target.value)}
                       />
                     </div>
                     <div className="grid gap-2">
                       <Label htmlFor="cookie" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                         Mã định danh (Cookie String / cURL)
                       </Label>
                       <textarea
                         id="cookie"
                         placeholder="Dán mã tại đây..."
                         className="flex min-h-[120px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                         value={cookieInput}
                         onChange={(e) => setCookieInput(e.target.value)}
                       />
                       <p className="text-[10px] text-muted-foreground italic">
                         Mẹo: Dán toàn bộ đoạn lệnh cURL (từ tab Network) vào đây.
                       </p>
                     </div>
                   </div>
                   <DialogFooter>
                     <Button 
                       onClick={handleSaveSession} 
                       disabled={isSavingSession}
                       className="w-full"
                     >
                       {isSavingSession ? "Đang lưu..." : "Kích hoạt bộ não Sensei"}
                     </Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>

               {/* NotebookLM Query Dialog */}
               <Dialog open={isQueryDialogOpen} onOpenChange={setIsQueryDialogOpen}>
                 <DialogTrigger asChild>
                   <Button variant="ghost" size="icon" className="rounded-2xl text-muted-foreground hover:text-primary group relative">
                      <BookOpen className="h-5 w-5" />
                      <div className="absolute left-full ml-4 px-3 py-1.5 bg-popover text-popover-foreground text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-border/10">
                        Query NotebookLM
                      </div>
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-[700px] max-h-[80vh] border-primary/20 bg-card/95 backdrop-blur-xl">
                   <DialogHeader>
                     <DialogTitle className="flex items-center gap-2 text-primary">
                       <BookOpen className="h-5 w-5" />
                       Query NotebookLM
                     </DialogTitle>
                     <DialogDescription>
                       Hỏi bất kỳ câu hỏi nào về nội dung trong notebook của bạn.
                     </DialogDescription>
                   </DialogHeader>
                   
                   <div className="space-y-4">
                     <div className="grid gap-2">
                       <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                         Notebook ID (để trống nếu đã lưu)
                       </Label>
                       <Input
                         placeholder="a6d31377-ccf1-45ac-8801-..."
                         value={notebookId}
                         onChange={(e) => setNotebookId(e.target.value)}
                       />
                     </div>
                     
                     <div className="flex gap-2">
                       <Input
                         placeholder="Hỏi về ngữ pháp N5, từ vựng bài 3..."
                         value={queryText}
                         onChange={(e) => setQueryText(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && !isQuerying && handleQueryNotebook()}
                         disabled={isQuerying}
                       />
                       <Button onClick={handleQueryNotebook} disabled={isQuerying || !queryText.trim()}>
                         {isQuerying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                       </Button>
                     </div>

                     {/* Results Area */}
                     <ScrollArea className="h-[400px] rounded-xl border border-border bg-background/50 p-4">
                       {queryResult && (
                         <div className="mb-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                           <p className="text-xs font-semibold text-primary mb-2">Kết quả mới nhất:</p>
                           <div className="text-sm whitespace-pre-wrap text-foreground">{queryResult}</div>
                         </div>
                       )}
                       
                       {queryHistory.length > 1 && (
                         <div className="space-y-3">
                           <p className="text-xs font-semibold text-muted-foreground">Lịch sử:</p>
                           {queryHistory.slice(1).map((item, i) => (
                             <div key={i} className="p-3 rounded-lg border border-border/50 space-y-2">
                               <p className="text-xs font-medium text-primary">Q: {item.q}</p>
                               <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.a}</p>
                             </div>
                           ))}
                         </div>
                       )}
                       
                       {!queryResult && queryHistory.length === 0 && (
                         <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                           <BookOpen className="h-12 w-12 mb-3 opacity-20" />
                           <p className="text-sm">Nhập câu hỏi để bắt đầu</p>
                         </div>
                       )}
                     </ScrollArea>
                   </div>
                 </DialogContent>
               </Dialog>

               <Button variant="ghost" size="icon" className="rounded-2xl text-muted-foreground hover:text-foreground">
                  <Settings2 className="h-5 w-5" />
               </Button>
            </div>
          </aside>
  
          {/* Conversation Sidebar */}
          <div className="w-72 lg:w-80 hidden md:block border-r border-border/10 bg-card/5">
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
