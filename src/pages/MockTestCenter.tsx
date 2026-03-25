import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, ChevronRight, BarChart, CheckCircle2, AlertCircle, FileText, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { JLPTAnalytics } from '@/components/analytics/JLPTAnalytics';

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

      // Fetch exams from DB
      const { data: examData, error: examErr } = await (supabase as any)
        .from('mock_exams')
        .select('id, title, level, duration')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (examErr) {
        console.error("Exam load error:", examErr);
        toast.error("Không thể tải danh sách đề thi");
        setLoading(false);
        return;
      }

      // Count questions per exam
      const examList: MockExam[] = [];
      for (const exam of examData || []) {
        const { count, error: countErr } = await (supabase as any)
          .from('mock_exam_questions')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', exam.id);
        
        if (countErr) console.error(`Error counting questions for ${exam.id}:`, countErr);
        examList.push({ ...exam, difficulty: 'Medium', question_count: count || 0 });
      }
      setExams(examList);

      // Fetch user results
      if (user) {
        const { data: resultData } = await (supabase as any)
          .from('mock_exam_results')
          .select('exam_id, score, max_score, time_taken, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });
        setResults((resultData as any) || []);
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

  return (
    <div className="min-h-screen bg-background pb-10">
      <Navigation />
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
            <div className="bg-sakura/5 p-1 rounded-xl flex gap-1 border border-sakura/10 h-9 items-center">
              {['All', 'N5', 'N4', 'N3', 'N2', 'N1'].map(l => (
                <Button key={l} variant={selectedLevel === (l === 'All' ? null : l) ? 'default' : 'ghost'}
                  size="sm" onClick={() => setSelectedLevel(l === 'All' ? null : l)} 
                  className={cn(
                    "font-bold px-2 rounded-lg transition-all h-7 text-[10px]",
                    selectedLevel === (l === 'All' ? null : l) ? "bg-crimson text-white shadow-md shadow-crimson/20" : "text-sakura hover:bg-sakura/10"
                  )}>
                  {l}
                </Button>
              ))}
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
            {filteredExams.map((exam, index) => {
              const result = latestByExam[exam.id];
              const completed = !!result;
              return (
                <motion.div key={exam.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="hover:shadow-soft transition-all group border-l-4 border-l-sakura overflow-hidden rounded-xl border-t border-r border-b">
                    <CardContent className="p-0 flex flex-col sm:flex-row">
                      <div className="p-4 flex-1 space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className="bg-sakura text-white font-black text-[9px] px-2 rounded-md h-5">{exam.level}</Badge>
                          <Badge variant="outline" className="border-sakura/10 text-sakura text-[9px] h-5">{exam.difficulty}</Badge>
                          {completed && (
                            <Badge variant="secondary" className="bg-sakura/5 text-crimson gap-1 text-[9px] h-5">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Đã làm
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-base font-bold group-hover:text-crimson transition-colors font-display leading-tight">{exam.title}</h3>
                        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {exam.duration}m</span>
                          <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {exam.question_count} câu</span>
                        </div>
                      </div>
                      <div className="bg-muted/10 p-4 sm:w-44 border-l border-muted flex flex-col justify-center gap-2 text-center">
                        {completed ? (
                          <div className="space-y-2">
                            <div>
                              <p className="text-[9px] text-sakura/50 uppercase font-black tracking-widest">Điểm nhất</p>
                              <h4 className="text-xl font-bold text-crimson">{result.score}/{result.max_score}</h4>
                            </div>
                            <Link to={`/mock-exam/${exam.id}`} className="w-full block">
                              <Button className="w-full h-8 rounded-lg border-sakura/10 text-sakura hover:bg-sakura/5 text-[10px] font-bold" variant="outline">Làm lại</Button>
                            </Link>
                          </div>
                        ) : (
                          <Link to={`/mock-exam/${exam.id}`} className="w-full block">
                            <Button className="w-full gap-2 h-10 text-sm font-black bg-sakura hover:bg-sakura/90 text-white shadow-soft rounded-lg border-none">
                              Bắt đầu <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
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
