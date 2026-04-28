import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, ChevronRight, BarChart, CheckCircle2, AlertCircle, FileText, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { JLPTAnalytics } from '@/components/analytics/JLPTAnalytics';
import { FloatingSakura } from '@/components/ui/FloatingSakura';
import { Progress } from '@/components/ui/progress';

interface MockExam {
  id: string;
  title: string;
  level: string;
  duration: number;
  difficulty: string;
  question_count?: number;
}

interface ExamResult {
  exam_id: string;
  score: number;
  max_score: number;
  time_taken: number;
  completed_at: string;
}

const ExamCard = ({ exam, result, index }: { exam: MockExam, result: ExamResult | undefined, index: number }) => {
  const [isHovered, setIsHovered] = useState(false);
  const completed = !!result;
  const isMastered = result?.score === result?.max_score && (result?.max_score || 0) > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className={cn(
        "relative hover:shadow-xl hover:shadow-rose-100 transition-all duration-300 group overflow-hidden rounded-2xl border-rose-100",
        completed ? "bg-white/60" : "bg-white"
      )}>
        <FloatingSakura isHovering={isHovered} />
        
        <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-50 overflow-hidden">
          {completed && <div className="h-full bg-gradient-to-r from-rose-300 to-pink-400" style={{ width: '100%' }} />}
        </div>

        <CardContent className="p-0 flex flex-col sm:flex-row">
          <div className="p-5 flex-1 space-y-3 relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-gradient-to-br from-rose-400 to-pink-500 text-white font-black text-[10px] px-3 rounded-full h-5 border-0">
                {exam.level}
              </Badge>
              <Badge variant="outline" className="border-rose-100 text-rose-400 text-[10px] h-5 px-3 rounded-full bg-rose-50/30">
                {exam.difficulty}
              </Badge>
              {completed && (
                <Badge variant="secondary" className={cn(
                  "gap-1 text-[10px] h-5 px-3 rounded-full border-0",
                  isMastered ? "bg-amber-100 text-amber-600 font-black animate-pulse" : "bg-emerald-50 text-emerald-600"
                )}>
                  {isMastered ? <Trophy className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                  {isMastered ? 'MASTERED' : 'HOÀN THÀNH'}
                </Badge>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-rose-800 transition-colors font-display leading-tight">{exam.title}</h3>
              <p className="text-[11px] text-rose-300 font-medium uppercase tracking-widest mt-0.5">JLPT Standard Examination</p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-rose-400/80">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {exam.duration} phút</span>
              <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {exam.question_count} câu hỏi</span>
            </div>
          </div>

          <div className="bg-rose-50/20 p-5 sm:w-48 border-l border-rose-50 flex flex-col justify-center gap-3 text-center relative z-10">
            {completed ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] text-rose-400 uppercase font-black tracking-widest">Điểm cao nhất</p>
                  <div className="flex items-center justify-center gap-2">
                    <h4 className="text-2xl font-black text-rose-600">{result?.score}</h4>
                    <span className="text-rose-300 font-bold">/ {result?.max_score}</span>
                  </div>
                </div>
                <Link to={`/mock-exam/${exam.id}`} className="w-full block">
                  <Button className="w-full h-10 rounded-xl border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-xs font-black shadow-none" variant="outline">
                    LÀM LẠI ĐỀ
                  </Button>
                </Link>
              </div>
            ) : (
              <Link to={`/mock-exam/${exam.id}`} className="w-full block">
                <Button className="w-full gap-2 h-14 text-base font-black bg-gradient-to-br from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white shadow-xl shadow-rose-200/50 rounded-xl border-none transition-transform hover:scale-[1.03]">
                  BẮT ĐẦU <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const MockTestCenter = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [exams, setExams] = useState<MockExam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Improved fetching: Get exams and results in parallel, 
      // and use a more efficient way to get counts if possible, 
      // but for now let's at least batch the result fetching.
      const [examRes, resultsRes] = await Promise.all([
        (supabase as any).from('mock_exams').select(`
          id, title, level, duration,
          mock_exam_questions ( id )
        `).eq('is_published', true).order('created_at', { ascending: false }),
        user ? (supabase as any).from('mock_exam_results').select('exam_id, score, max_score, time_taken, completed_at').eq('user_id', user.id).order('completed_at', { ascending: false }) : Promise.resolve({ data: [] })
      ]);

      if (examRes.error) {
        console.error("Exam load error:", examRes.error);
        toast.error("Không thể tải danh sách đề thi");
      } else {
        const examList = (examRes.data || []).map((e: any) => ({
          ...e,
          difficulty: 'Medium',
          question_count: e.mock_exam_questions?.length || 0
        }));
        setExams(examList);
      }

      if (resultsRes.data) {
        setResults(resultsRes.data);
      }

      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const latestByExam = results.reduce<Record<string, ExamResult>>((acc, r) => {
    if (!acc[r.exam_id]) acc[r.exam_id] = r;
    return acc;
  }, {});

  const completedCount = Object.keys(latestByExam).length;
  const avgScore = completedCount > 0
    ? Math.round(Object.values(latestByExam).reduce((s, r) => s + r.score, 0) / completedCount)
    : 0;
  const totalSeconds = results.reduce((s, r) => s + (r.time_taken || 0), 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);

  const filteredExams = exams.filter(e => !selectedLevel || e.level === selectedLevel);

  const getLevelStats = (level: string) => {
    const levelExams = exams.filter(e => e.level === level);
    if (levelExams.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completedInLevel = levelExams.filter(e => !!latestByExam[e.id]).length;
    return {
      completed: completedInLevel,
      total: levelExams.length,
      percent: Math.round((completedInLevel / levelExams.length) * 100)
    };
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <main className="container py-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <Link to="/learning-path">
              <Button variant="ghost" size="sm" className="gap-1.5 mb-1 h-8 text-[11px] font-bold">
                <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-gold" />
              Trung tâm Thi thử JLPT
            </h1>
            <p className="text-xs text-muted-foreground">Rèn luyện kỹ năng làm bài thi JLPT.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl border-sakura/20 text-sakura hover:bg-sakura/5 gap-2 px-4 font-black h-9 text-[11px] shadow-sm">
                  <BarChart className="h-4 w-4" /> Phân tích
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none bg-transparent shadow-none">
                <div className="p-1 shadow-2xl rounded-[1.6rem] bg-gradient-to-br from-sakura/20 to-crimson/20">
                  <div className="bg-white rounded-2xl p-6 md:p-8 space-y-6">
                    <DialogHeader className="space-y-3 text-center">
                      <div className="w-12 h-12 bg-sakura/10 rounded-xl flex items-center justify-center mx-auto text-sakura">
                        <Trophy className="h-6 w-6" />
                      </div>
                      <div>
                        <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Thống kê năng lực JLPT</DialogTitle>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1">Dữ liệu {results.length} bài thi gần nhất</p>
                      </div>
                    </DialogHeader>
                    <JLPTAnalytics />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {profile?.role === 'admin' && (
              <Link to="/admin/exam-manager">
                <Button variant="outline" className="h-9 gap-1.5 border-sakura/30 text-crimson hover:bg-sakura/5 rounded-xl font-bold text-[11px]">
                  <Plus className="h-3.5 w-3.5" /> Thêm đề
                </Button>
              </Link>
            )}
            <div className="bg-sakura/5 p-1 rounded-xl flex gap-1 border border-sakura/10 h-9 items-center overflow-x-auto no-scrollbar max-w-full">
              {['All', 'N5', 'N4', 'N3', 'N2', 'N1'].map(l => {
                const stats = l !== 'All' ? getLevelStats(l) : null;
                return (
                  <Button key={l} variant={selectedLevel === (l === 'All' ? null : l) ? 'default' : 'ghost'}
                    size="sm" onClick={() => setSelectedLevel(l === 'All' ? null : l)} 
                    className={cn(
                      "font-bold px-3 rounded-lg transition-all h-7 text-[10px] relative overflow-hidden group/btn",
                      selectedLevel === (l === 'All' ? null : l) ? "bg-crimson text-white shadow-md shadow-crimson/20" : "text-sakura hover:bg-white border-transparent hover:border-sakura/20 border"
                    )}>
                    <div className="relative z-10 flex flex-col items-center">
                      <span>{l}</span>
                      {stats && stats.percent > 0 && selectedLevel !== l && (
                        <div className="absolute -bottom-1.5 w-full h-[2px] bg-sakura/30 rounded-full overflow-hidden">
                          <div className="h-full bg-sakura" style={{ width: `${stats.percent}%` }} />
                        </div>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: CheckCircle2, label: 'Đã hoàn thành', val: loading ? null : `${completedCount} Đề`, color: 'bg-sakura', bg: 'bg-sakura/5 border-sakura/20' },
            { icon: BarChart, label: 'Điểm trung bình', val: loading ? null : (completedCount > 0 ? `${avgScore}/180` : '—'), color: 'bg-crimson', bg: 'bg-crimson/5 border-crimson/10' },
            { icon: Clock, label: 'Thời gian luyện', val: loading ? null : (totalSeconds > 0 ? `${totalHours}h ${totalMins}m` : '—'), color: 'bg-sakura-dark', bg: 'bg-sakura-dark/5 border-sakura-dark/10' },
          ].map((s, i) => (
            <Card key={i} className={cn("rounded-2xl", s.bg)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${s.color} text-white`}><s.icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">{s.label}</p>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mt-0.5" /> : <h3 className="text-lg font-bold font-display">{s.val}</h3>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Exam list */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-xs text-muted-foreground">Chưa có đề thi nào{selectedLevel ? ` cho ${selectedLevel}` : ''}.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredExams.map((exam, index) => (
              <ExamCard key={exam.id} exam={exam} result={latestByExam[exam.id]} index={index} />
            ))}
          </div>
        )}

        <Card className="border-sakura/30 bg-sakura/5 rounded-3xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Trophy className="h-20 w-20 text-sakura" />
          </div>
          <CardContent className="p-8 flex items-start gap-6 relative z-10">
            <AlertCircle className="h-8 w-8 text-sakura shrink-0 mt-1" />
            <div className="space-y-1">
              <h4 className="font-bold text-lg text-slate-800">Lưu ý khi làm đề thi thử</h4>
              <p className="text-muted-foreground">Đề thi sẽ được tính giờ như khi đi thi thật. Không thể tạm dừng một khi đã bắt đầu. Chúc bạn đạt kết quả thật tốt!</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
export default MockTestCenter;
