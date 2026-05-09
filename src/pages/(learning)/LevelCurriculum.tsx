
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronDown, 
  BookOpen, 
  Brain, 
  Headphones, 
  Zap, 
  CheckCircle2, 
  Star, 
  ArrowRight,
  Loader2,
  Trophy,
  MessageSquare,
  Sparkles,
  Play
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CurriculumItem {
  id: string;
  type: 'vocabulary' | 'grammar' | 'listening' | 'assignment' | 'video';
  title: string;
  content_link: string;
  is_required: boolean;
  is_completed?: boolean;
}

interface CurriculumUnit {
  id: string;
  title: string;
  description: string;
  order_index: number;
  items: CurriculumItem[];
}

interface LevelInfo {
  title: string;
  description: string;
  code: string;
}

export const LevelCurriculum = () => {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [units, setUnits] = useState<CurriculumUnit[]>([]);
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set());
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Level Info
        const { data: lvlData, error: lvlError } = await (supabase as any)
          .from('curriculum_levels')
          .select('*')
          .eq('code', level?.toUpperCase())
          .single();
        
        if (lvlError) throw lvlError;
        setLevelInfo(lvlData);

        // 2. Fetch Units and Items
        const { data: unitsData, error: unitsError } = await (supabase as any)
          .from('curriculum_units')
          .select(`
            *,
            curriculum_items (*)
          `)
          .eq('level_id', lvlData.id)
          .order('order_index');

        if (unitsError) throw unitsError;

        const mapped: CurriculumUnit[] = (unitsData || [])
          .filter((u: any) => u.status === 'published')
          .map((u: any) => ({
            id: u.id,
            title: u.title,
            description: u.description,
            order_index: u.order_index,
            status: u.status,
            items: (u.curriculum_items || [])
              .filter((i: any) => i.status === 'published')
              .sort((a: any, b: any) => a.order_index - b.order_index)
          }));

        // 3. Fetch User Progress
        if (user) {
          const { data: progData } = await (supabase as any)
            .from('curriculum_progress')
            .select('item_id')
            .eq('user_id', user.id);
          
          if (progData) {
            setCompletedItemIds(new Set(progData.map((p: any) => p.item_id)));
          }
        }

        setUnits(mapped);
      } catch (err) {
        console.error('Error fetching curriculum:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [level, user]);

  useEffect(() => {
    if (units.length > 0) {
      const totalItems = units.reduce((acc, u) => acc + u.items.length, 0);
      if (totalItems === 0) {
        setOverallProgress(0);
      } else {
        const completedCount = Array.from(completedItemIds).filter(id => 
          units.some(u => u.items.some(i => i.id === id))
        ).length;
        setOverallProgress(Math.round((completedCount / totalItems) * 100));
      }
    }
  }, [units, completedItemIds]);

  const handleItemClick = async (item: CurriculumItem) => {
    // Only auto-complete simple content (vocabulary, grammar, listening) on click
    // Assignments and videos should be completed through their respective components
    const isSimpleContent = ['vocabulary', 'grammar', 'listening'].includes(item.type);
    
    if (user && isSimpleContent && !completedItemIds.has(item.id)) {
      try {
        await (supabase as any)
          .from('curriculum_progress')
          .insert({ user_id: user.id, item_id: item.id });
        
        setCompletedItemIds(prev => new Set([...Array.from(prev), item.id]));
      } catch (err) {
        console.error('Error saving progress:', err);
      }
    }
    navigate(item.content_link);
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] pb-20">
      <main className="max-w-[1400px] mx-auto px-4 md:px-10 py-8">
        
        {/* Top Navigation */}
        <div className="mb-10">
          <Link 
            to="/learning-path" 
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-sakura transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Quay lại lộ trình
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between gap-10 mb-12">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-full bg-sakura-light/10 flex items-center justify-center text-sakura font-black text-2xl border-2 border-sakura-light/20">
                  {levelInfo?.code || level?.toUpperCase()}
               </div>
               <h1 className="text-4xl md:text-5xl font-black font-display text-sumi">
                 {levelInfo?.title}
               </h1>
            </div>
            <p className="text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
              {levelInfo?.description}
            </p>
          </div>

          <div className="lg:w-80">
            <Card className="rounded-[2.5rem] border-2 border-sakura-light/10 shadow-soft p-6 bg-white/60 backdrop-blur-sm">
              <div className="flex justify-between items-end mb-3">
                <span className="text-sm font-black text-sumi">Tiến độ tổng thể</span>
                <span className="text-lg font-black text-sakura">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3 rounded-full bg-slate-100" />
              <p className="text-[10px] uppercase font-black text-muted-foreground mt-3 tracking-widest text-center">
                Bạn đã hoàn thành {completedItemIds.size} mục học tập
              </p>
            </Card>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-12">
          
          {/* Main Curriculum Content */}
          <div className="flex-1 space-y-8">
            <div className="flex items-center gap-3 mb-6">
               <BookOpen className="h-6 w-6 text-sakura" />
               <h2 className="text-2xl font-black text-sumi">Danh sách bài học</h2>
            </div>

            <Accordion type="single" collapsible className="space-y-6" defaultValue={units[0]?.id}>
              {units.map((unit, uIdx) => (
                <AccordionItem 
                  key={unit.id} 
                  value={unit.id}
                  className="border-none bg-white rounded-[2.5rem] shadow-card overflow-hidden px-8 py-4 transition-all data-[state=open]:shadow-elevated"
                >
                  <AccordionTrigger className="hover:no-underline py-4 group">
                    <div className="flex items-start gap-6 text-left">
                       <div className="h-12 w-12 rounded-full bg-sakura-light/10 flex items-center justify-center text-sakura font-black shrink-0 group-hover:scale-110 transition-transform">
                          {unit.order_index}
                       </div>
                       <div className="space-y-1">
                          <h3 className="text-xl font-black text-sumi group-hover:text-sakura transition-colors">{unit.title}</h3>
                          <p className="text-sm text-muted-foreground font-medium">{unit.description}</p>
                       </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-6 pb-4 space-y-3">
                    {unit.items.map((item, iIdx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: iIdx * 0.05 }}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group/item",
                          completedItemIds.has(item.id)
                            ? "bg-matcha/5 border-matcha/10 hover:border-matcha/30" 
                            : "bg-slate-50 border-slate-100 hover:border-sakura-light/30"
                        )}
                      >
                         <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm",
                              completedItemIds.has(item.id) ? "bg-matcha text-white" : "bg-white text-muted-foreground group-hover/item:text-sakura"
                            )}>
                               {completedItemIds.has(item.id) ? <CheckCircle2 className="h-5 w-5" /> : (
                                 item.type === 'vocabulary' ? <BookOpen className="h-5 w-5" /> :
                                 item.type === 'grammar' ? <Brain className="h-5 w-5" /> :
                                 item.type === 'listening' ? <Headphones className="h-5 w-5" /> :
                                 item.type === 'assignment' ? <Zap className="h-5 w-5" /> :
                                 <Play className="h-5 w-5" />
                               )}
                            </div>
                            <span className={cn(
                              "font-black text-lg",
                              completedItemIds.has(item.id) ? "text-matcha-dark" : "text-sumi group-hover/item:text-sakura"
                            )}>
                               {item.title}
                            </span>
                         </div>
                         <div className="flex items-center gap-2">
                            {completedItemIds.has(item.id) && <Badge className="bg-matcha/20 text-matcha border-0 font-bold uppercase text-[9px] tracking-widest">Đã học</Badge>}
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground group-hover/item:text-sakura group-hover/item:translate-x-1 transition-all">
                               <ArrowRight className="h-4 w-4" />
                            </div>
                         </div>
                      </motion.div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Sidebar */}
          <aside className="xl:w-96 space-y-8">
             {/* Tài liệu học tập Card */}
             <Card className="rounded-[3rem] border-2 border-sakura-light/10 shadow-card bg-white p-8">
                <h3 className="text-xl font-black text-sumi mb-6">Tài liệu học tập</h3>
                <p className="text-sm text-muted-foreground font-medium mb-8">Các công cụ hỗ trợ cho {levelInfo?.code}</p>
                
                <div className="space-y-4">
                   <Button variant="ghost" className="w-full h-16 justify-start gap-4 rounded-3xl border-2 border-slate-100 hover:border-sakura-light/30 hover:bg-sakura/5 px-6 group">
                      <div className="h-10 w-10 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                         <Headphones className="h-5 w-5" />
                      </div>
                      <span className="font-black text-sumi">Tài liệu nghe {levelInfo?.code}</span>
                   </Button>
                   
                   <Button variant="ghost" className="w-full h-16 justify-start gap-4 rounded-3xl border-2 border-slate-100 hover:border-sakura-light/30 hover:bg-sakura/5 px-6 group">
                      <div className="h-10 w-10 rounded-2xl bg-gold-light/20 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                         <Trophy className="h-5 w-5" />
                      </div>
                      <span className="font-black text-sumi">Luyện thi thử</span>
                   </Button>

                   <Button variant="ghost" className="w-full h-16 justify-start gap-4 rounded-3xl border-2 border-slate-100 hover:border-sakura-light/30 hover:bg-sakura/5 px-6 group">
                      <div className="h-10 w-10 rounded-2xl bg-matcha-light/20 flex items-center justify-center text-matcha group-hover:scale-110 transition-transform">
                         <MessageSquare className="h-5 w-5" />
                      </div>
                      <span className="font-black text-sumi">Chat với AI Sensei</span>
                   </Button>
                </div>
             </Card>

             {/* Mẹo học Card */}
             <Card className="rounded-[3rem] border-none shadow-elevated bg-sakura overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Sparkles className="h-40 w-40 text-white" />
                </div>
                <CardContent className="p-10 relative z-10 text-white space-y-6">
                   <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <Star className="h-6 w-6 text-white fill-white" />
                   </div>
                   <div className="space-y-3">
                      <h3 className="text-3xl font-black font-display">Mẹo học cấp tốc</h3>
                      <p className="text-white/80 font-medium leading-relaxed">
                        Hãy tập trung hoàn thành 50 Kanji cơ bản trước khi chuyển qua Unit 4 để đạt kết quả tốt nhất.
                      </p>
                   </div>
                   <Button className="w-full h-14 rounded-2xl bg-white text-sakura hover:bg-white/90 font-black text-lg">
                      Xem thêm
                   </Button>
                </CardContent>
             </Card>
          </aside>

        </div>
      </main>
    </div>
  );
};

export default LevelCurriculum;
