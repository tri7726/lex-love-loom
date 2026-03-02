import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Target,
  Flame,
  TrendingUp,
  BookOpen,
  Sparkles,
  GraduationCap,
  Layers,
  BarChart3,
  ChevronDown,
  Play,
  Search,
  ArrowUp,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Import our new modular components
import { KanjiCell, KanjiStatus } from './KanjiCell';
import { KanjiDetailCard } from './KanjiDetailCard';
import { KanjiStudyOverlay } from './KanjiStudyOverlay';
import { supabase } from '@/integrations/supabase/client';
import { CUSTOM_COLLECTIONS } from '@/data/custom-collections';

export interface KanjiPoint {
  id: string; // The literal kanji character as id for now or actual DB id
  lesson: number;
  level: string; // e.g. 'N5', 'N4'
  character: string;
  meaning_vi: string;
  hanviet: string;
  on_reading: string;
  kun_reading: string;
}

interface KanjiReviewProps {
  onBack: () => void;
}

export const KanjiReview: React.FC<KanjiReviewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'path' | 'stats'>('path');
  const [expandedLevels, setExpandedLevels] = useState<string[]>(['SPECIAL']);
  const [selectedKanji, setSelectedKanji] = useState<KanjiPoint | null>(null);
  const [isStudyOverlayOpen, setIsStudyOverlayOpen] = useState(false);
  const [studyUnit, setStudyUnit] = useState<KanjiPoint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [masteredIds, setMasteredIds] = useState<string[]>([]);
  const [learningIds, setLearningIds] = useState<string[]>([]);

  const [allKanji, setAllKanji] = useState<KanjiPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Kanji from local JSON or Supabase
  React.useEffect(() => {
    const fetchKanji = async () => {
      try {
        setLoading(true);
        let finalData: KanjiPoint[] = [];

        // 1. Try fetching from LOCAL JSON first (Fast, Offline-first)
        try {
          const response = await fetch('/data/kanji-data.json');
          if (response.ok) {
            const localData = await response.json();
            console.log(`Loaded ${localData.length} kanji from local storage.`);
            finalData = localData.map((k: { c: string; j?: number; g?: number; m?: string; h?: string; o?: string | string[]; k?: string | string[] }, index: number) => {
              // Map JLPT level
              let level = 'N5';
              if (k.j) level = `N${k.j}`;
              else if (k.g === 1 || k.g === 2) level = 'N5';
              else if (k.g === 3 || k.g === 4) level = 'N4';
              else if (k.g === 5 || k.g === 6) level = 'N3';
              else if (k.g === 8) level = 'N2';
              else if (k.g >= 9 || k.g === 0) level = 'N1';

              return {
                id: k.c,
                lesson: Math.floor(index / 10) + 1, // Changed from 20 to 10
                level,
                character: k.c,
                meaning_vi: k.m || '',
                hanviet: k.h || '', // Use the 'h' field from JSON
                on_reading: Array.isArray(k.o) ? k.o.join(', ') : (k.o || ''),
                kun_reading: Array.isArray(k.k) ? k.k.join(', ') : (k.k || ''),
              };
            });
          }
        } catch (localErr) {
          console.log('Local kanji data not found, falling back to Supabase...');
        }

        // 2. Fallback to Supabase if local data is empty
        if (finalData.length === 0) {
          const { data, error } = await supabase
            .from('kanji_details')
            .select('character, meaning, on_reading, kun_reading, grade, jlpt')
            .order('grade', { ascending: true })
            .limit(1000);

          if (!error && data && data.length > 0) {
            finalData = data.map((k: { character: string; meaning: string; on_reading: string; kun_reading: string; grade: number; jlpt: number }, index: number) => {
              let level = 'N5';
              if (k.jlpt) level = `N${k.jlpt}`;
              else if (k.grade === 1 || k.grade === 2) level = 'N5';
              else if (k.grade === 3 || k.grade === 4) level = 'N4';
              else if (k.grade === 5 || k.grade === 6) level = 'N3';
              else if (k.grade === 8) level = 'N2';
              else if (k.grade >= 9 || k.grade === 0) level = 'N1';
              
              return {
                id: k.character,
                lesson: Math.floor(index / 10) + 1, // Consistently 10 per lesson
                level,
                character: k.character,
                meaning_vi: k.meaning || '',
                hanviet: '',
                on_reading: k.on_reading || '',
                kun_reading: k.kun_reading || '',
              };
            });
          }
        }

        if (finalData.length > 0) {
          setAllKanji(finalData);
        } else {
          console.warn('No kanji data found in local or database');
          setAllKanji([]);
        }

        // 3. Merge in the custom collections
        setAllKanji(prev => {
          const newKanjiList = [...prev];
          CUSTOM_COLLECTIONS.forEach((collection, collIdx) => {
            collection.kanjis.forEach(customChar => {
              const existing = prev.find(k => k.character === customChar.character);
              newKanjiList.push({
                id: `custom-${collection.id}-${customChar.character}`,
                lesson: collIdx + 1,
                level: 'SPECIAL',
                character: customChar.character,
                meaning_vi: customChar.meaning_vi || existing?.meaning_vi || 'Đang cập nhật...',
                hanviet: customChar.hanviet || existing?.hanviet || '',
                on_reading: customChar.on_reading || existing?.on_reading || '',
                kun_reading: customChar.kun_reading || existing?.kun_reading || '',
              });
            });
          });
          return newKanjiList;
        });
      } catch (err) {
        console.error('Error fetching Kanji for review:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKanji();
  }, []);

  // Group Kanji by Level and Unit (10 lessons/unit = 100 Kanji)
  const groupedData = useMemo(() => {
    const grouped: Record<string, Record<number, KanjiPoint[]>> = {};
    
    // Filter by search query if exists
    const filteredKanji = searchQuery.trim() 
      ? allKanji.filter(k => 
          (k.character || '').includes(searchQuery) || 
          (k.meaning_vi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (k.hanviet || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allKanji;

    filteredKanji.forEach(k => {
      const levelKey = k.level || 'N5';
      if (!grouped[levelKey]) grouped[levelKey] = {};
      
      // Determine Unit ID
      // Special check: ensure lesson is a valid number
      const lessonNum = Number(k.lesson) || 1;
      const unitId = levelKey === 'SPECIAL' ? lessonNum : Math.ceil(lessonNum / 10);
      
      if (!grouped[levelKey][unitId]) grouped[levelKey][unitId] = [];
      grouped[levelKey][unitId].push(k);
    });
    return grouped;
  }, [allKanji, searchQuery]);

  const toggleLevel = (level: string) => {
    setExpandedLevels(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const getKanjiStatus = (id: string): KanjiStatus => {
    if (masteredIds.includes(id)) return 'mastered';
    if (learningIds.includes(id)) return 'learning';
    return 'locked'; // Default for demo, or based on progression logic
  };

  const startUnitStudy = (kanjiInUnit: KanjiPoint[]) => {
    setStudyUnit(kanjiInUnit);
    setIsStudyOverlayOpen(true);
    setSelectedKanji(null);
  };

  const handleMarkMastered = (id: string) => {
    setMasteredIds(prev => [...new Set([...prev, id])]);
    setLearningIds(prev => prev.filter(lid => lid !== id));
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-cream border border-sakura/10 p-10 shadow-soft">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-30 -right-20 w-80 h-80 bg-gradient-to-br from-sakura/20 to-transparent rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-gradient-to-tr from-matcha/10 to-transparent rounded-full blur-3xl opacity-50" />
          <div className="absolute top-1/2 right-20 -translate-y-1/2 text-[180px] font-jp text-sakura/[0.05] select-none leading-none">
            漢
          </div>
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white rounded-2xl shadow-sm">
              <GraduationCap className="h-6 w-6 text-sakura" />
            </div>
            <span className="text-sakura text-sm font-bold tracking-widest uppercase">Kanji Master 🌸</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-sumi">Lộ trình học Kanji</h1>
          <p className="text-muted-foreground text-lg max-w-lg">
            Học Kanji theo phong cách Nhật Bản – Trực quan, dễ nhớ và cá nhân hóa tiến độ của riêng bạn.
          </p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-white/60 backdrop-blur-md rounded-2xl p-1.5 gap-1.5 shadow-sm border border-sakura/5">
          {[
            { key: 'path' as const, icon: Layers, label: 'Lộ trình' },
            { key: 'stats' as const, icon: BarChart3, label: 'Thống kê' },
          ].map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'ghost'}
              size="lg"
              onClick={() => setActiveTab(key)}
              className={cn(
                'rounded-xl px-8 gap-2 transition-all duration-300 font-bold',
                activeTab === key 
                  ? 'bg-sakura text-white shadow-lg shadow-sakura/20' 
                  : 'text-muted-foreground hover:bg-sakura/5'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'path' ? (
          <motion.div
            key="path"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-10"
          >
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {[
                 { icon: Target, label: 'Đã thuộc', value: masteredIds.length, unit: 'chữ', color: 'text-matcha', bg: 'bg-matcha/5', border: 'border-matcha/10' },
                 { icon: BookOpen, label: 'Đang học', value: learningIds.length, unit: 'chữ', color: 'text-sakura', bg: 'bg-sakura/5', border: 'border-sakura/10' },
                 { icon: Flame, label: 'Streak', value: 7, unit: 'ngày', color: 'text-gold', bg: 'bg-gold/5', border: 'border-gold/10' },
                 { icon: TrendingUp, label: 'Tiến độ', value: Math.round((masteredIds.length / Math.max(1, allKanji.length)) * 100) || 0, unit: '%', color: 'text-crimson', bg: 'bg-crimson/5', border: 'border-crimson/10' },
               ].map(({ icon: Icon, label, value, unit, color, bg, border }, idx) => (
                 <Card key={label} className={cn('border-2 shadow-none rounded-[32px] overflow-hidden', bg, border)}>
                   <CardContent className="p-6">
                     <div className="flex items-center gap-3 mb-3">
                       <div className="p-2 bg-white rounded-xl shadow-sm">
                         <Icon className={cn('h-4 w-4', color)} />
                       </div>
                       <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                     </div>
                     <div className="flex items-baseline gap-1">
                       <span className={cn('text-3xl font-black', color)}>{value}</span>
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">{unit}</span>
                     </div>
                   </CardContent>
                 </Card>
               ))}
            </div>

            {/* Vertical Roadmap */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-sakura gap-4">
                <Sparkles className="h-10 w-10 animate-spin" />
                <p className="font-medium animate-pulse text-sm">Đang nạp kho Kanji...</p>
              </div>
            ) : allKanji.length === 0 ? (
              <div className="text-center py-20 bg-white/40 rounded-[40px] border border-dashed border-sakura/20">
                <p className="text-muted-foreground">Chưa có chữ Kanji nào trong kho dữ liệu của bạn.</p>
                <p className="text-xs mt-2 italic text-sakura/60">Hãy bắt đầu thêm Kanji hoặc chạy script Import nhé!</p>
              </div>
            ) : (
                <div className="space-y-6">
                  <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md py-4 px-1 -mx-1 border-b mb-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm chữ Kanji hoặc ý nghĩa..."
                        className="pl-10 pr-10 rounded-full border-sakura/20 focus-visible:ring-sakura bg-white/50 h-11"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-sumi"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <Button 
                      variant="outline"
                      className="rounded-full border-sakura/30 text-sakura bg-sakura/5 hover:bg-sakura/10 font-bold gap-2 h-11 px-6 whitespace-nowrap w-full md:w-auto"
                      onClick={() => {
                        const allStudiable = allKanji.filter(k => masteredIds.includes(k.id) || learningIds.includes(k.id));
                        if (allStudiable.length > 0) startUnitStudy(allStudiable);
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Ôn tập tổng hợp
                    </Button>
                  </div>

                {['SPECIAL', 'N5', 'N4', 'N3', 'N2', 'N1'].filter(lvl => groupedData[lvl]).map((level) => (
                    <div key={level} className="space-y-4">
                  {/* Level Header */}
                  <button 
                    onClick={() => toggleLevel(level)}
                    className={cn(
                      'w-full flex items-center justify-between p-6 rounded-[28px] border-2 transition-all duration-300',
                      expandedLevels.includes(level) 
                        ? 'bg-sakura border-sakura text-white shadow-xl shadow-sakura/20' 
                        : 'bg-white border-sakura/10 text-sumi hover:border-sakura/30'
                    )}
                  >
                    <div className="flex items-center gap-4">
                       <div className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner',
                        expandedLevels.includes(level) ? 'bg-white/20' : 'bg-sakura/10 text-sakura'
                       )}>
                         {level}
                       </div>
                        <div className="text-left">
                          <h3 className="text-xl font-black">
                            {level === 'SPECIAL' ? 'Bộ sưu tập của bạn' : 
                             (level === 'N5' || level === 'N4' ? 'Sơ cấp' : level === 'N3' ? 'Trung cấp' : 'Thượng cấp')} {level === 'SPECIAL' ? '✨' : level}
                          </h3>
                          <p className={cn('text-xs font-medium', expandedLevels.includes(level) ? 'text-white/80' : 'text-muted-foreground')}>
                            {Object.keys(groupedData[level]).length} Unit • {allKanji.filter(k => k.level === level).length} Chữ
                          </p>
                        </div>
                    </div>
                    <ChevronDown className={cn('h-6 w-6 transition-transform duration-300', expandedLevels.includes(level) && 'rotate-180')} />
                  </button>

                  {/* Level Content (Units) */}
                  <AnimatePresence>
                    {expandedLevels.includes(level) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-6 pl-4 md:pl-8 border-l-4 border-sakura/10 ml-6 md:ml-10"
                      >
                        {Object.entries(groupedData[level]).map(([unitId, kanjis]) => {
                          const masteredInUnit = kanjis.filter(k => masteredIds.includes(k.id)).length;
                          const unitProgress = (masteredInUnit / kanjis.length) * 100;
                          
                          // Label calculation
                          const unitNum = Number(unitId);
                          const lessonRange = level === 'SPECIAL' 
                            ? (CUSTOM_COLLECTIONS[unitNum - 1]?.name || `Bộ ${unitNum}`)
                            : `Bài ${(unitNum - 1) * 10 + 1} - ${unitNum * 10}`;

                          return (
                            <div key={unitId} className="relative bg-white/40 backdrop-blur-sm rounded-[32px] border border-sakura/5 p-6 hover:bg-white/60 transition-colors shadow-sm">
                               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="rounded-full border-sakura/30 text-sakura bg-sakura/5 px-3 font-bold">
                                        Unit {unitId}
                                      </Badge>
                                      <span className="text-xs font-bold text-sakura/60 uppercase tracking-wider">{lessonRange}</span>
                                      {unitProgress === 100 && <Badge className="bg-matcha text-white border-0">Hoàn thành ✨</Badge>}
                                    </div>
                                    <h4 className="text-xl font-bold text-sumi">
                                      {level === 'SPECIAL' 
                                        ? (CUSTOM_COLLECTIONS[unitNum - 1]?.name?.replace(/[🌟🌸]/gu, '') || 'Bộ sưu tập chọn lọc') 
                                        : `Chinh phục Kanji Hàng đầu - Unit ${unitId}`}
                                    </h4>
                                  </div>

                                  <div className="flex items-center gap-4">
                                     <div className="text-right hidden md:block">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase text-right">TIẾN ĐỘ UNIT</p>
                                        <p className="text-sm font-black text-matcha whitespace-nowrap">{masteredInUnit}/{kanjis.length} Chữ</p>
                                     </div>
                                     <Button 
                                       className="rounded-2xl bg-sakura hover:bg-sakura-dark text-white font-bold gap-2 px-8 h-12 shadow-lg shadow-sakura/20 transition-all hover:scale-105 active:scale-95"
                                       onClick={() => startUnitStudy(kanjis)}
                                     >
                                       <Play className="h-4 w-4 fill-current" />
                                       Học Unit
                                     </Button>
                                  </div>
                               </div>

                               {/* Grid of Kanji Cells */}
                               <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                                  {kanjis.map((k, idx) => (
                                    <KanjiCell 
                                      key={k.id}
                                      character={k.character}
                                      meaning={k.meaning_vi}
                                      hanviet={k.hanviet}
                                      status={getKanjiStatus(k.id)}
                                      delay={idx * 0.05}
                                      onClick={() => setSelectedKanji(k)}
                                    />
                                  ))}
                               </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Heatmap Card */}
            <Card className="border-2 border-sakura/5 shadow-soft rounded-[40px] overflow-hidden bg-white/80 backdrop-blur-sm p-8">
               <div className="flex items-center gap-3 mb-8">
                 <div className="p-3 bg-sakura/10 rounded-2xl">
                   <BarChart3 className="h-6 w-6 text-sakura" />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-sumi">Hoạt động trong năm</h3>
                   <p className="text-sm text-muted-foreground">Bạn đã học được {masteredIds.length} chữ mới!</p>
                 </div>
               </div>
               
               {/* Simplified Heatmap Placeholder */}
               <div className="flex flex-wrap gap-2 justify-center py-4">
                 {Array.from({ length: 52 }).map((_, i) => (
                   <div key={i} className="flex flex-col gap-1">
                     {Array.from({ length: 7 }).map((_, j) => (
                       <div 
                         key={j} 
                         className={cn(
                           'w-3 h-3 rounded-[2px]',
                           Math.random() > 0.8 ? 'bg-sakura' : 'bg-sakura/10'
                         )} 
                       />
                     ))}
                   </div>
                 ))}
               </div>
               
               <div className="mt-8 pt-8 border-t border-sakura/5 flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Ít hoạt động</span>
                  <div className="flex gap-1.5">
                    {[10, 30, 60, 100].map(v => <div key={v} className={cn('w-3 h-3 rounded-[2px]', `bg-sakura/${v}`)} />)}
                  </div>
                  <span>Rất tích cực</span>
               </div>
            </Card>

            {/* Achievement / Goal Card */}
            <Card className="border-2 border-gold/10 shadow-soft rounded-[40px] overflow-hidden bg-gradient-to-br from-white to-gold/5 p-8">
              <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className="w-32 h-32 rounded-full bg-gold/10 flex items-center justify-center border-4 border-gold/20 shadow-inner">
                  <span className="text-6xl text-gold">🏆</span>
                </div>
                <div className="flex-1 space-y-4">
                  <h3 className="text-2xl font-black text-sumi">Mục tiêu tiếp theo</h3>
                  <p className="text-muted-foreground text-lg italic">
                    "Tích tiểu thành đại – Mỗi chữ Kanji là một bước tiến gần hơn tới ước mơ Nhật Bản của bạn."
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase text-gold">
                      <span>Chinh phục N5</span>
                      <span>{Math.round((masteredIds.length / Math.max(1, allKanji.filter(k => k.level === 'N5').length)) * 100)}%</span>
                    </div>
                    <Progress value={(masteredIds.length / Math.max(1, allKanji.filter(k => k.level === 'N5').length)) * 100} className="h-3 bg-gold/10" />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-components: Overlay & Cards */}
      <KanjiDetailCard 
        isOpen={!!selectedKanji}
        kanji={selectedKanji}
        onClose={() => setSelectedKanji(null)}
        onStartStudy={() => selectedKanji && startUnitStudy([selectedKanji])}
      />

      <KanjiStudyOverlay 
        isOpen={isStudyOverlayOpen}
        unitKanji={studyUnit}
        onClose={() => setIsStudyOverlayOpen(false)}
        onCompleteUnit={() => {
          studyUnit.forEach(k => handleMarkMastered(k.id));
          setIsStudyOverlayOpen(false);
        }}
      />
    </div>
  );
};
