import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Languages, Camera, MessageSquare, BrainCircuit, Library, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { GrammarCheckInput } from '@/components/chat/GrammarCheckInput';
import { GrammarHistory } from '@/components/chat/GrammarHistory';
import { SnapLearn } from '@/components/chat/SnapLearn';
import { HybridTutor } from '@/components/chat/HybridTutor';
import { AnalysisHistory } from '@/components/chat/AnalysisHistory';
import { FlashcardGenerator } from '@/components/chat/FlashcardGenerator';
import { cn } from '@/lib/utils';

export const AITutor = () => {
  const [reloadText, setReloadText] = useState('');
  const [historyItem, setHistoryItem] = useState<unknown>(null);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 relative overflow-hidden">
      <div className="absolute inset-0 bg-sakura-light/5 dark:bg-slate-950/50 pointer-events-none z-0" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sakura/5 rounded-full blur-[120px] pointer-events-none -mr-40 -mt-40 z-0" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-sakura/5 rounded-full blur-[100px] pointer-events-none -ml-20 -mb-20 z-0" />

      <Navigation />

      <main className="max-w-7xl mx-auto py-8 px-4 md:px-8 space-y-10 relative z-10">
        {/* --- Premium Hero Section --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-sakura/10 pb-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-sakura flex items-center justify-center text-white shadow-xl shadow-sakura/20 scale-110">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-800 dark:text-slate-100">AI Sensei <span className="text-sakura">Station</span></h1>
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60 pl-1">
              Hệ thống mổ xẻ ngôn ngữ chuyên sâu
            </p>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="hidden md:flex items-center gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-4 rounded-3xl border border-sakura/10 shadow-soft"
          >
             <div className="h-10 w-10 rounded-full border-2 border-sakura/20 flex items-center justify-center bg-sakura/5">
                <Sparkles className="h-5 w-5 text-sakura animate-pulse" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-sakura tracking-widest leading-tight">Sensei status</p>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 italic">"Sẵn sàng mổ xẻ mọi đoạn văn cùng bạn!"</p>
             </div>
          </motion.div>
        </div>

        <Tabs defaultValue="hybrid" className="space-y-8">
          <TabsList className="inline-flex h-auto bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border-2 border-sakura/10 p-2 gap-2 shadow-xl shadow-sakura/5 overflow-x-auto no-scrollbar">
            {[
              { value: 'hybrid', label: 'Sensei Lab', icon: MessageSquare },
              { value: 'grammar', label: 'Ngữ pháp', icon: Languages },
              { value: 'snap', label: 'Snap & Learn', icon: Camera },
              { value: 'flashcards', label: 'Flashcard VIP', icon: Library },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "px-6 md:px-10 py-3 rounded-[1.5rem] transition-all font-black uppercase tracking-widest text-[10px] gap-2 outline-none border border-transparent",
                  "data-[state=active]:bg-sakura data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sakura/30 data-[state=active]:scale-105",
                  "hover:bg-sakura/5 text-slate-500 dark:text-slate-400"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key="active-tab-content"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <TabsContent value="hybrid" className="mt-0 focus-visible:outline-none">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                    
                    <aside className="lg:col-span-1 lg:sticky lg:top-24 h-fit">
                      {/* --- Lịch sử bên TRÁI --- */}
                      <Card className="border border-border bg-card rounded-3xl shadow-sm overflow-hidden">
                        <AnalysisHistory onSelect={setHistoryItem} />
                      </Card>
                    </aside>

                    <div className="lg:col-span-3 space-y-8">
                      {/* --- Nhập liệu bên PHẢI --- */}
                      <Card className="border border-border bg-card rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
                        <CardContent className="p-0">
                          <HybridTutor initialData={historyItem} />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Grammar: 2-column layout */}
                <TabsContent value="grammar" className="mt-0 focus-visible:outline-none">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1">
                      <Card className="border-2 border-border bg-card rounded-3xl shadow-sm overflow-hidden min-h-[200px]">
                        <GrammarHistory onReload={(t) => setReloadText(t + '\u200b')} />
                      </Card>
                    </div>
                    <div className="lg:col-span-2">
                      <Card className="border-2 border-border bg-card rounded-3xl shadow-sm">
                        <CardContent className="p-6 sm:p-8">
                          <GrammarCheckInput
                            initialValue={reloadText}
                            key={reloadText || 'default'}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="snap" className="mt-0 focus-visible:outline-none">
                  <Card className="border-2 border-sakura/5 shadow-soft bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
                    <CardContent className="p-0">
                      <SnapLearn />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="flashcards" className="mt-0 focus-visible:outline-none">
                  <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-[2.5rem] border-2 border-sakura/5 overflow-hidden shadow-soft">
                    <FlashcardGenerator />
                  </div>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
           {[
             { icon: Sparkles, title: "PHÂN TÍCH CHUYÊN SÂU", desc: "Mổ xẻ từng tầng nghĩa, ngữ pháp & văn hóa.", color: "text-sakura" },
             { icon: Zap, title: "TRÍ TUỆ TỨC THÌ", desc: "Xử lý tốc độ cao với các hệ thống AI VIP.", color: "text-gold" },
             { icon: BrainCircuit, title: "TRẠM HỌC TẬP THÔNG MINH", desc: "Giao diện tối ưu cho việc ghi nhớ & tra cứu.", color: "text-matcha" }
           ].map((feature, i) => (
             <div
               key={i}
               className="p-8 rounded-[2rem] border-2 border-sakura/5 bg-white/50 dark:bg-slate-900/50 flex flex-col items-center text-center space-y-4 shadow-sm hover:border-sakura/20 hover:shadow-md transition-all"
             >
                <div className="h-14 w-14 rounded-2xl bg-sakura/5 flex items-center justify-center border border-sakura/10">
                   <feature.icon className={cn("h-6 w-6", feature.color)} />
                </div>
                <h4 className="font-black text-xs uppercase tracking-widest">{feature.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">{feature.desc}</p>
             </div>
           ))}
        </div>
      </main>
    </div>
  );
};
