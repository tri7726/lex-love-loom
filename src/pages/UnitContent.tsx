import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  BookOpen, 
  Book, 
  Layers, 
  Video, 
  Zap,
  Play,
  Heart,
  Share2,
  Volume2,
  CheckCircle2,
  Brain,
  ArrowRight,
  Eraser,
  PenTool,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from '@/components/ui/progress';
import { UnitAIAssistant } from '@/components/UnitAIAssistant';
import { KanjiCanvas } from '@/components/kanji/KanjiCanvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GRAMMAR_DB } from '../data/grammar-db';
import { KANJI_DB } from '../data/kanji-db';

interface Vocabulary {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  hanviet?: string;
  jlpt_level?: string;
}

interface Grammar {
  title: string;
  usage: string;
  explanation: string;
  example: string;
  lesson?: number;
  level?: string;
}

interface Kanji {
  id: string;
  character: string;
  meaning_vi: string;
  hanviet: string;
  lesson?: number;
  level?: string;
}

export const UnitContent = () => {
  const { level, unitId } = useParams<{ level: string; unitId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('vocabulary');
  const [loading, setLoading] = useState(true);
  const [vocabData, setVocabData] = useState<Vocabulary[]>([]);
  const [kanjiData, setKanjiData] = useState<Kanji[]>([]);
  const [grammarData, setGrammarData] = useState<Grammar[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch vocabulary from flashcards
        // For Minna, lesson number corresponds to unitId
        const lessonNum = parseInt(unitId || '1');
        
        // Fetch vocabulary (we'll still use Supabase for vocab if database is ready, 
        // otherwise we might need to fallback to minna-n5/n4 files. 
        // But for now, let's keep the Supabase call for vocab but filter better if possible)
        const { data: vocab, error: vocabError } = await supabase
          .from('flashcards')
          .select('*')
          .eq('jlpt_level', level?.toUpperCase())
          .limit(50); // Increased limit as per user request

        if (vocabError) throw vocabError;
        setVocabData(vocab || []);

        // Filter local Grammar DB
        const unitGrammar = GRAMMAR_DB.filter(g => 
          g.lesson === lessonNum && g.level === level?.toUpperCase()
        );
        setGrammarData(unitGrammar);

        // Filter local Kanji DB
        const unitKanji = KANJI_DB.filter(k => 
          k.lesson === lessonNum && k.level === level?.toUpperCase()
        );
        setKanjiData(unitKanji);

      } catch (err) {
        console.error('Fetch error:', err);
        toast.error('Không thể tải nội dung bài học.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [level, unitId]);

  const contentTitle = `Unit ${unitId}: Chinh phục ${level?.toUpperCase()}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <main className="container py-6 space-y-6">
        {/* Breadcrumbs & Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/learning-path" className="hover:text-primary transition-colors">Lộ trình</Link>
            <ChevronLeft className="h-3 w-3 rotate-180" />
            <Link to={`/learning-path/${level}`} className="hover:text-primary transition-colors">{level?.toUpperCase()}</Link>
            <ChevronLeft className="h-3 w-3 rotate-180" />
            <span className="text-foreground font-medium">Unit {unitId}</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-display font-bold">{contentTitle}</h1>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-sakura/10 text-sakura">{level?.toUpperCase()}</Badge>
                <Badge variant="outline">Bài {unitId}</Badge>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => navigate('/quiz')} className="gap-2 shadow-soft">
                <Play className="h-4 w-4 fill-current" />
                Luyện tập ngay
              </Button>
              <Button variant="outline" size="icon">
                <Heart className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="vocabulary" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md bg-muted/50 p-1">
            <TabsTrigger value="vocabulary" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-soft">
              <BookOpen className="h-4 w-4" />
              Từ vựng
            </TabsTrigger>
            <TabsTrigger value="grammar" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-soft">
              <Book className="h-4 w-4" />
              Ngữ pháp
            </TabsTrigger>
            <TabsTrigger value="kanji" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-soft">
              <Layers className="h-4 w-4" />
              Hán tự
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <TabsContent value="vocabulary" className="mt-0 focus-visible:outline-none">
                <div className="grid gap-3">
                  {vocabData.map((vocab, i) => (
                    <motion.div
                      key={vocab.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="shadow-none hover:border-primary/30 transition-colors group">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="space-y-0.5">
                              <p className="text-xl font-jp font-bold flex items-center gap-2">
                                {vocab.word}
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Volume2 className="h-3 w-3" />
                                </Button>
                              </p>
                              <p className="text-xs text-muted-foreground font-jp">{vocab.reading}</p>
                            </div>
                            <div className="w-px h-8 bg-border hidden sm:block" />
                            <div>
                               <p className="font-medium">{vocab.meaning}</p>
                               {vocab.hanviet && <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{vocab.hanviet}</p>}
                            </div>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-muted-foreground group-hover:text-matcha transition-colors" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  {vocabData.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">Chưa có dữ liệu từ vựng cho trình độ này.</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="grammar" className="mt-0 focus-visible:outline-none">
                <div className="space-y-4">
                  {grammarData.map((gram, i) => (
                    <Card key={i} className="shadow-soft overflow-hidden border-l-4 border-l-sakura">
                      <CardHeader className="bg-muted/30 pb-3">
                        <CardTitle className="text-lg font-jp text-sakura">{gram.title}</CardTitle>
                        <code className="text-sm font-bold bg-background px-2 py-1 rounded inline-block w-fit mt-2">
                          {gram.usage}
                        </code>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        <p className="text-sm text-foreground">{gram.explanation}</p>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Ví dụ:</p>
                          <p className="font-jp text-lg">{gram.example}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {grammarData.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">Chưa có dữ liệu ngữ pháp cho bài học này.</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="kanji" className="mt-0 focus-visible:outline-none">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {kanjiData.map((k, i) => (
                    <Dialog key={k.id}>
                      <DialogTrigger asChild>
                        <Card className="text-center hover:border-indigo-500/50 transition-all cursor-pointer group shadow-soft">
                          <CardContent className="p-6 space-y-3">
                            <div className="text-4xl font-jp font-bold py-2 group-hover:scale-110 transition-transform">{k.character}</div>
                            <div className="space-y-1">
                              <p className="font-bold text-indigo-600">{k.meaning_vi}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">{k.hanviet}</p>
                            </div>
                            <div className="pt-2">
                               <Badge variant="outline" className="text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <PenTool className="h-3 w-3" />
                                 Luyện viết
                               </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Luyện viết chữ Hán</DialogTitle>
                        </DialogHeader>
                        <KanjiCanvas 
                          kanji={k.character} 
                          meaning={k.meaning_vi} 
                        />
                      </DialogContent>
                    </Dialog>
                  ))}
                  {kanjiData.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground col-span-full">Chưa có dữ liệu chữ Hán cho trình độ này.</div>
                  )}
                </div>
              </TabsContent>
            </div>

            {/* Sidebar Stats & Actions */}
            <div className="w-full lg:w-80 space-y-6">
              <Card className="shadow-soft border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Tiến độ Unit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-3xl font-bold">24%</span>
                    <span className="text-xs text-muted-foreground">15/65 mục đã học</span>
                  </div>
                  <Progress value={24} className="h-2" />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                     <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-xl font-bold">12</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Từ vựng</p>
                     </div>
                     <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-xl font-bold">3</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Hán tự</p>
                     </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h3 className="text-sm font-bold px-1">Công cụ hỗ trợ</h3>
                <Button className="w-full justify-start gap-3 h-12 shadow-soft hover:gap-4 transition-all" variant="outline">
                   <div className="p-1.5 bg-sakura/10 rounded-md">
                     <Brain className="h-5 w-5 text-sakura" />
                   </div>
                   Flashcards (Deep Memory)
                </Button>
                <Button className="w-full justify-start gap-3 h-12 shadow-soft hover:gap-4 transition-all" variant="outline">
                   <div className="p-1.5 bg-indigo-500/10 rounded-md">
                     <Zap className="h-5 w-5 text-indigo-500" />
                   </div>
                   Luyện tập thần tốc
                </Button>
                <Button className="w-full justify-start gap-3 h-12 shadow-soft hover:gap-4 transition-all" variant="outline">
                   <div className="p-1.5 bg-gold/10 rounded-md">
                     <Video className="h-5 w-5 text-gold" />
                   </div>
                   Video bài giảng liên quan
                </Button>
              </div>

              <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-none shadow-indigo">
                <CardContent className="p-6 space-y-4">
                   <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Tiếp theo</div>
                   <h3 className="text-xl font-bold">Unit 2: Đồ vật</h3>
                   <p className="text-indigo-100 text-sm opacity-80">Học cách sử dụng Kore, Sore, Are và sở hữu cách.</p>
                   <Button variant="secondary" className="w-full gap-2 text-indigo-700 font-bold">
                     Chuyển bài
                     <ArrowRight className="h-4 w-4" />
                   </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </main>

      {/* AI Assistant */}
      <UnitAIAssistant 
        unitId={unitId || '1'} 
        level={level || 'n5'} 
        unitTitle={contentTitle}
        contextData={{ vocab: vocabData, kanji: kanjiData, grammar: grammarData }}
      />
    </div>
  );
};
