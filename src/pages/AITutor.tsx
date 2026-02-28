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
import { FlashcardGenerator } from '@/components/chat/FlashcardGenerator';
import { cn } from '@/lib/utils';

export const AITutor = () => {
  const [reloadText, setReloadText] = useState('');

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 relative overflow-hidden">
      <div className="absolute inset-0 bg-sakura-light/5 dark:bg-slate-950/50 pointer-events-none z-0" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sakura/5 rounded-full blur-[120px] pointer-events-none -mr-40 -mt-40 z-0" />

      <Navigation />

      <main className="max-w-6xl mx-auto py-8 px-4 md:px-6 space-y-8 relative z-10">
        <Tabs defaultValue="hybrid" className="space-y-6">
          <TabsList className="flex h-auto bg-white/60 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-sakura/20 dark:border-slate-800 p-1.5 gap-1.5 overflow-x-auto no-scrollbar shadow-soft">
            {[
              { value: 'hybrid', label: 'Hỏi đáp & Phân tích', icon: MessageSquare },
              { value: 'grammar', label: 'Ngữ pháp', icon: Languages },
              { value: 'snap', label: 'Snap & Learn', icon: Camera },
              { value: 'flashcards', label: 'Flashcard VIP', icon: Library },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex-1 items-center justify-center px-4 md:px-8 py-3 rounded-xl transition-all font-bold gap-2 text-sm outline-none border border-transparent",
                  "data-[state=active]:bg-sakura data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-sakura/20",
                  "hover:bg-sakura/10 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <tab.icon className="h-4 w-4 opacity-70" />
                <span className="truncate">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key="active-tab-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="hybrid" className="mt-0 focus-visible:outline-none">
                  <Card className="border-sakura/10 shadow-soft bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-3xl overflow-hidden">
                    <CardContent className="p-0">
                      <HybridTutor />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Grammar: 2-column layout */}
                <TabsContent value="grammar" className="mt-0 focus-visible:outline-none">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    {/* Left: input + result */}
                    <div className="lg:col-span-2">
                      <Card className="border border-border bg-card rounded-2xl shadow-sm">
                        <CardContent className="p-4 sm:p-5">
                          <GrammarCheckInput
                            initialValue={reloadText}
                            key={reloadText || 'default'}
                          />
                        </CardContent>
                      </Card>
                    </div>
                    {/* Right: saved history panel */}
                    <div className="lg:col-span-1">
                      <Card className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden min-h-[200px]">
                        <GrammarHistory onReload={(t) => setReloadText(t + '\u200b')} />
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="snap" className="mt-0 focus-visible:outline-none">
                  <Card className="border-sakura/10 shadow-soft bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-3xl overflow-hidden">
                    <CardContent className="p-0">
                      <SnapLearn />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="flashcards" className="mt-0 focus-visible:outline-none">
                  <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-3xl border border-sakura/10 overflow-hidden shadow-soft">
                    <FlashcardGenerator />
                  </div>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
           {[
             { icon: Sparkles, title: "Cá nhân hóa", desc: "Phân tích trình độ học tập thực tế.", color: "text-sakura" },
             { icon: Zap, title: "Tốc độ xử lý", desc: "Phản hồi thông tin tức thì từ Groq.", color: "text-gold" },
             { icon: BrainCircuit, title: "Đa nền tảng", desc: "Hỗ trợ deep analysis văn hóa & ngôn ngữ.", color: "text-matcha" }
           ].map((feature, i) => (
             <div
               key={i}
               className="p-6 rounded-2xl border bg-white dark:bg-slate-900 flex flex-col items-center text-center space-y-3 shadow-sm"
             >
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                   <feature.icon className={cn("h-5 w-5", feature.color)} />
                </div>
                <h4 className="font-bold">{feature.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">{feature.desc}</p>
             </div>
           ))}
        </div>
      </main>
    </div>
  );
};
