import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  BookMarked, 
  ChevronRight, 
  Filter, 
  Info,
  Layers,
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX,
  PlayCircle,
  Brain,
  CheckCircle,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { useTTS } from '@/hooks/useTTS';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GrammarAIPreview } from '@/components/grammar/GrammarAIPreview';
import { GrammarPracticeModal } from '@/components/grammar/GrammarPracticeModal';
import { GrammarSensei } from '@/components/grammar/GrammarSensei';
import { GrammarComparisonDialog } from '@/components/grammar/GrammarComparisonDialog';
import { useGrammarMastery } from '@/hooks/useGrammarMastery';
import { GrammarMasteryBadge } from '@/components/grammar/GrammarMasteryBadge';
import { SakuraParticles } from '@/components/ui/SakuraParticles';

import { GRAMMAR_DB, GrammarPoint } from '../data/grammar-db';

export const GrammarWiki = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('library');
  const [selectedPracticePoint, setSelectedPracticePoint] = useState<GrammarPoint | null>(null);
  
  const { speak, isSpeaking, stop } = useTTS({ lang: 'ja-JP' });
  const { toast } = useToast();
  const { mastery } = useGrammarMastery();

  const filteredPoints = GRAMMAR_DB.filter(point => {
    const matchesSearch = point.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         point.explanation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = !selectedLevel || point.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Đã sao chép vào bộ nhớ tạm",
      duration: 2000,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative">
      <SakuraParticles />
      <main className="container py-8 space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <Link to="/learning-path">
              <Button variant="ghost" size="sm" className="gap-2 mb-2">
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
            </Link>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <BookMarked className="h-8 w-8 text-sakura" />
              Ngữ pháp Nhật ngữ
            </h1>
            <p className="text-muted-foreground">
              Tra cứu cấu trúc N5-N1 và kiểm tra ngữ pháp cùng AI thông minh.
            </p>
          </div>
        </div>

        <Tabs defaultValue="library" className="w-full" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
            <TabsList className="bg-muted/50 p-1 h-12 rounded-2xl border">
              <TabsTrigger value="library" className="rounded-xl px-8 data-[state=active]:bg-sakura data-[state=active]:text-white">
                Thư viện
              </TabsTrigger>
              <TabsTrigger value="ai-checker" className="rounded-xl px-8 data-[state=active]:bg-sakura data-[state=active]:text-white gap-2">
                <Sparkles className="h-4 w-4" />
                Kiểm tra AI
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'library' && (
               <div className="flex gap-2">
                 {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => (
                   <Button
                     key={level}
                     variant={selectedLevel === level ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
                     className={`h-10 px-4 font-bold rounded-xl transition-all ${selectedLevel === level ? 'bg-sakura hover:bg-sakura/90 border-none' : ''}`}
                   >
                     {level}
                   </Button>
                 ))}
               </div>
            )}
          </div>

          <TabsContent value="library" className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Tìm kiếm mẫu câu, ý nghĩa (ví dụ: は, です...)" 
                  className="pl-12 h-14 text-lg rounded-2xl shadow-soft border-2 focus-visible:ring-sakura/20 focus-visible:border-sakura"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <GrammarComparisonDialog />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredPoints.length > 0 ? (
                  filteredPoints.map((point, index) => (
                    <motion.div
                      key={point.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="shadow-card hover:shadow-elevated transition-all border-none overflow-hidden group">
                        <div className="h-1 bg-sakura opacity-30 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-3 border-b bg-muted/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex gap-2 items-center">
                              <Badge className="bg-sakura/10 text-sakura border-sakura/20 font-bold px-3">
                                {point.level}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest hidden sm:inline-block">
                                {point.category}
                              </span>
                            </div>
                            <GrammarMasteryBadge 
                              level={mastery[point.title]?.level || 'new'} 
                              progress={mastery[point.title]?.progress || 0} 
                            />
                          </div>
                            <CardTitle className="text-2xl font-bold font-jp text-primary flex items-center justify-between">
                              {point.title}
                              <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full hover:bg-sakura/10 hover:text-sakura"
                                    onClick={() => setSelectedPracticePoint(point)}
                                    title="Luyện bài tập Quiz"
                                  >
                                    <Brain className="h-4 w-4" />
                                  </Button>
                                  <Link to={`/sensei?mode=analysis&q=${encodeURIComponent(`Hãy giải thích chuyên sâu và cùng tôi luyện tập mẫu câu ngữ pháp: ${point.title}`)}`}>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 rounded-full hover:bg-indigo-500/10 hover:text-indigo-500"
                                      title="Hỏi AI Sensei về ngữ pháp này"
                                    >
                                      <Sparkles className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full hover:bg-sakura/10 hover:text-sakura"
                                    onClick={() => handleCopy(point.title)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                              </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="bg-background border-2 border-primary/5 p-4 rounded-2xl space-y-3">
                            <div className="flex items-start gap-3">
                              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <p className="font-medium text-foreground/90 leading-relaxed">
                                {point.explanation}
                              </p>
                            </div>
                            
                            <div className="pt-3 border-t border-dashed space-y-1">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cách dùng</p>
                              <code className="block text-primary font-bold text-lg font-jp">
                                {point.usage}
                              </code>
                            </div>
                          </div>

                          <div className="space-y-2 relative group/example">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ví dụ</p>
                            <div className="p-4 bg-muted/30 rounded-2xl flex items-center justify-between gap-4">
                                <p className="font-jp text-xl flex-1 leading-relaxed">
                                {point.example}
                                </p>
                                <Button 
                                  variant="secondary" 
                                  size="icon" 
                                  className={cn(
                                    "h-10 w-10 shrink-0 rounded-xl transition-all",
                                    isSpeaking ? "bg-sakura text-white" : "bg-white shadow-soft"
                                  )}
                                  onClick={() => speak(point.example)}
                                >
                                  {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                </Button>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              className="flex-1 rounded-xl border-sakura/20 text-sakura hover:bg-sakura hover:text-white transition-all gap-2 font-bold h-11"
                              onClick={() => setSelectedPracticePoint(point)}
                            >
                              <PlayCircle className="h-4 w-4" />
                              Luyện tập ngay
                            </Button>
                            <Link to={`/sensei?mode=analysis&q=${encodeURIComponent(`Hãy giải thích chuyên sâu và cùng tôi luyện tập mẫu câu ngữ pháp: ${point.title}`)}`} className="flex-1">
                              <Button 
                                className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-all gap-2 font-bold h-11 shadow-sm"
                              >
                                <Brain className="h-4 w-4" />
                                Hỏi Sensei
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-primary/10">
                    <Layers className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <h3 className="text-xl font-bold mb-1 font-display">Chưa thấy nội dung này</h3>
                    <p className="text-muted-foreground">Thử tìm kiếm mẫu cấu khác hoặc đổi cấp độ JLPT bạn nhé!</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="ai-checker" className="mt-8">
            <GrammarAIPreview />
          </TabsContent>
        </Tabs>

        {/* Practice Modal */}
        {selectedPracticePoint && (
           <GrammarPracticeModal
            isOpen={!!selectedPracticePoint}
            onClose={() => setSelectedPracticePoint(null)}
            grammarPoint={{
              title: selectedPracticePoint.title,
              level: selectedPracticePoint.level,
              explanation: selectedPracticePoint.explanation
            }}
           />
        )}

        <GrammarSensei />
      </main>
    </div>
  );
};

