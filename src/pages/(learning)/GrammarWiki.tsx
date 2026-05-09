import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  BookMarked,
  Filter,
  Info,
  Layers,
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX,
  Brain,
  Copy,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { useTTS } from '@/hooks/useTTS';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GrammarCheckInput } from '@/components/chat/GrammarCheckInput';
import { GrammarDojoDashboard } from '@/components/grammar/GrammarDojoDashboard';
import { GrammarPracticeModal } from '@/components/grammar/GrammarPracticeModal';
import { GrammarSensei } from '@/components/grammar/GrammarSensei';
import { GrammarComparisonDialog } from '@/components/grammar/GrammarComparisonDialog';
import { GrammarCard } from '@/components/grammar/GrammarCard';
import { useGrammarMastery } from '@/hooks/useGrammarMastery';
import { SakuraParticles } from '@/components/ui/SakuraParticles';
import { useAI } from '@/contexts/AIContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DeepExplanationSheet } from '@/components/grammar/DeepExplanationSheet';
import { DeepExplainResult } from '@/services/groqServices';
import { GRAMMAR_DB } from '@/data/grammar-db';

export interface GrammarPoint {
  id: string;
  lesson?: number;
  level: string;
  title: string;
  usage: string;
  explanation: string;
  examples: Array<{ japanese: string; vietnamese: string; reading: string }>;
  comparisons?: Array<{ target: string; difference: string }>;
  category: string;
  related_ids?: string[];
  pitfall?: string;
  video_url?: string;
}

export const GrammarWiki = () => {
  const [searchParams] = useSearchParams();
  const grammarId = searchParams.get('id');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showTranslations, setShowTranslations] = useState(false);
  const [selectedPracticePoint, setSelectedPracticePoint] = useState<GrammarPoint | null>(null);
  const [grammarPoints, setGrammarPoints] = useState<GrammarPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const { speak, isSpeaking, stop } = useTTS({ lang: 'ja-JP' });
  const { toast } = useToast();
  const { user } = useAuth();
  const { mastery } = useGrammarMastery({ userId: user?.id });
  const { explainDeep, streamExplainDeep } = useAI();

  const fetchGrammar = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('grammar_points')
        .select('*')
        .order('level', { ascending: false })
        .order('lesson', { ascending: true });

      if (error) throw error;
      
      let finalPoints = (data as any[] || []).map(point => ({
        ...point,
        examples: point.examples || (point.example ? [
          { 
            japanese: point.example, 
            vietnamese: point.translation || '', 
            reading: '' 
          }
        ] : [])
      }));

      // Fallback to local data if DB is empty
      if (finalPoints.length === 0) {
        finalPoints = GRAMMAR_DB.map(p => ({
          ...p,
          examples: [{ japanese: p.example, vietnamese: p.translation, reading: '' }]
        })) as any;
      }

      setGrammarPoints(finalPoints);
    } catch (err) {
      console.error('Error fetching grammar:', err);
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu ngữ pháp. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle auto-filter if ID is provided
  React.useEffect(() => {
    if (grammarId && grammarPoints.length > 0) {
      const point = grammarPoints.find(g => g.id === grammarId);
      if (point) {
        setSearchTerm(point.title);
        setSelectedLevel(point.level);
      }
    }
  }, [grammarId, grammarPoints]);

  React.useEffect(() => {
    fetchGrammar();
  }, [fetchGrammar]);

  const handleLogMistake = async (text: string, corrected: string, explanation: string) => {
    if (!user?.id) return;
    try {
      await supabase.functions.invoke('sensei-rag', {
        body: {
          action: 'index',
          user_id: user.id,
          content: `Ngữ pháp sai: "${text}" → Sửa thành: "${corrected}". ${explanation}`,
          source_type: 'mistake',
          metadata: { grammar: true, page: 'grammar-wiki' }
        }
      });
    } catch (e) {
      console.warn('Failed to log mistake:', e);
    }
  };

  const [deepExplainOpen, setDeepExplainOpen] = useState(false);
  const [deepExplainResult, setDeepExplainResult] = useState<DeepExplainResult | null>(null);
  const [deepExplainStream, setDeepExplainStream] = useState('');
  const [isDeepExplaining, setIsDeepExplaining] = useState(false);
  const [activeExplainTitle, setActiveExplainTitle] = useState('');

  const filteredPoints = grammarPoints.filter(point => {
    const matchesSearch = point.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         point.explanation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = !selectedLevel || point.level === selectedLevel;
    
    // Support lesson filter from URL if provided
    const lessonParam = searchParams.get('lesson');
    const matchesLesson = !lessonParam || point.lesson?.toString() === lessonParam;
    
    return matchesSearch && matchesLevel && matchesLesson;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Đã sao chép vào bộ nhớ tạm", duration: 2000 });
  };

  const handleDeepExplain = async (point: GrammarPoint) => {
    setActiveExplainTitle(point.title);
    setDeepExplainOpen(true);
    setIsDeepExplaining(true);
    setDeepExplainStream('');
    setDeepExplainResult(null);

    const result = await streamExplainDeep(
      point.title,
      point.explanation,
      'grammar',
      (token) => setDeepExplainStream(prev => prev + token),
    );

    if (result) {
      setDeepExplainResult(result);
    } else {
      const fallback = await explainDeep(point.title, point.explanation, 'grammar');
      setDeepExplainResult(fallback);
      if (!fallback) {
        toast({
          title: "Lỗi",
          description: "Không thể nhận giải thích sâu vào lúc này.",
          variant: "destructive"
        });
      }
    }
    setIsDeepExplaining(false);
  };

  const handleSearchSubmit = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 relative">
      <SakuraParticles />
      <main className="container py-6 space-y-6 relative z-10">
        {/* Back link */}
        <Link to="/learning-path">
          <Button variant="ghost" size="sm" className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </Link>

        {/* ─── Hero Banner ─── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sakura/10 via-background to-amber-50/30 border border-sakura/10 shadow-lg">
          {/* Glassmorphism decorative elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-sakura/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-indigo-300/10 rounded-full blur-2xl" />

          <div className="relative p-6 md:p-8 backdrop-blur-[2px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-3">
                  <span className="bg-sakura/10 p-2.5 rounded-2xl">
                    <BookMarked className="h-8 w-8 text-sakura" />
                  </span>
                  <span className="bg-gradient-to-r from-sakura to-primary bg-clip-text text-transparent">
                    Ngữ pháp Nhật ngữ
                  </span>
                </h1>
                <p className="text-muted-foreground max-w-xl">
                  Tra cứu cấu trúc N5–N1, kiểm tra ngữ pháp cùng AI thông minh,
                  và luyện tập với hệ thống ghi nhớ thông minh.
                </p>
              </div>

              <div className="flex gap-2 shrink-0">

                <GrammarComparisonDialog />
              </div>
            </div>

            {/* Omnipresent AI Input */}
            <div className="mt-6 pt-6 border-t border-sakura/10">
              <div className="max-w-2xl mx-auto">
                <GrammarCheckInput
                  initialValue={searchTerm}
                  onMistakeLogged={handleLogMistake}
                  onClear={() => setSearchTerm('')}
                />
                <p className="text-[11px] text-muted-foreground mt-3 text-center opacity-70">
                  💡 Nhập câu tiếng Nhật để AI kiểm tra ngữ pháp, hoặc gõ từ khóa để tìm trong thư viện.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Dashboard Section ─── */}
        <div className="mt-8">
          <GrammarDojoDashboard userId={user?.id} />
        </div>

        {/* ─── Library Section ─── */}
        <div className="mt-12 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-2xl font-bold font-display flex items-center gap-2">
              <BookMarked className="h-6 w-6 text-sakura" />
              Thư viện Ngữ pháp
            </h2>
            
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
              {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => (
                <Button
                  key={level}
                  variant={selectedLevel === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
                  className={`h-10 px-4 font-bold rounded-xl transition-all whitespace-nowrap ${selectedLevel === level ? 'bg-sakura hover:bg-sakura/90 border-none' : ''}`}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 max-w-3xl">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm mẫu câu, ý nghĩa (ví dụ: は, です...)"
                  className="pl-12 h-14 text-lg rounded-2xl shadow-soft border-2 focus-visible:ring-sakura/20 focus-visible:border-sakura"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={showTranslations ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowTranslations(!showTranslations)}
                  className={cn("h-14 px-4 rounded-xl font-bold", showTranslations && "bg-sakura hover:bg-sakura/90 border-none")}
                >
                  {showTranslations ? '🇻🇳 Ẩn dịch' : '🇻🇳 Hiện dịch'}
                </Button>
                <GrammarComparisonDialog />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredPoints.length > 0 ? (
                  filteredPoints.map((point) => (
                    <GrammarCard
                      key={point.id}
                      point={point}
                      mastery={mastery[point.title] || {}}
                      showTranslation={showTranslations}
                      isSpeaking={isSpeaking}
                      onSpeak={(text) => speak(text)}
                      onPractice={(p) => setSelectedPracticePoint(p)}
                      onDeepExplain={handleDeepExplain}
                      onCopy={handleCopy}
                      relatedPoints={grammarPoints.filter(p => point.related_ids?.includes(p.id))}
                    />
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
        </div>

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
            userId={user?.id}
          />
        )}

        <DeepExplanationSheet
          isOpen={deepExplainOpen}
          onClose={() => setDeepExplainOpen(false)}
          result={deepExplainResult}
          isLoading={isDeepExplaining}
          title={activeExplainTitle}
          streamingContent={isDeepExplaining && !deepExplainResult ? deepExplainStream : undefined}
        />

        <GrammarSensei />
      </main>
    </div>
  );
};

export default GrammarWiki;
