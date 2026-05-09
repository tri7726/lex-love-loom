import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, Plus, Users, ClipboardList, ChevronRight,
  Loader2, BookOpen, TrendingUp, Sparkles, Copy, Check
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ClassroomSummary {
  id: string;
  name: string;
  description: string | null;
  jlpt_level: string | null;
  invite_code: string;
  is_active: boolean;
  created_at: string;
  member_count: number;
  active_assignments: number;
}

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassroomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('classrooms')
        .select(`
          id, name, description, jlpt_level, invite_code, is_active, created_at,
          class_members ( user_id ),
          class_assignments ( id, is_active )
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: ClassroomSummary[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        jlpt_level: c.jlpt_level,
        invite_code: c.invite_code,
        is_active: c.is_active,
        created_at: c.created_at,
        member_count: c.class_members?.length || 0,
        active_assignments: (c.class_assignments || []).filter((a: any) => a.is_active).length,
      }));
      setClasses(mapped);
    } catch (err: any) {
      toast({ title: 'Lỗi tải dữ liệu', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: `Đã copy mã "${code}"` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const totalStudents = classes.reduce((s, c) => s + c.member_count, 0);
  const totalAssignments = classes.reduce((s, c) => s + c.active_assignments, 0);

  return (
    <div className="min-h-screen bg-[#faf9f6] pb-20">
      <main className="max-w-[1600px] mx-auto px-4 md:px-10 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Main Content: 75% */}
          <div className="flex-1 space-y-10">
            {/* Header Section */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                   <div className="h-12 w-12 bg-sakura rounded-2xl flex items-center justify-center text-white shadow-sakura">
                      <GraduationCap className="h-6 w-6" />
                   </div>
                   <div>
                      <Badge variant="outline" className="text-sakura border-sakura/20 bg-sakura/5 mb-1 px-3">Học viện Sakura</Badge>
                      <h1 className="text-4xl font-display font-black text-sumi">Quản lý lớp học</h1>
                   </div>
                </div>
                <p className="text-muted-foreground text-lg max-w-2xl font-medium">
                  Chào mừng trở lại! Tại đây bạn có thể quản lý các lớp học, theo dõi học sinh và tạo các nhiệm vụ mới.
                </p>
              </div>
              <Button
                className="h-14 px-8 gap-3 rounded-2xl bg-sakura hover:bg-sakura-dark text-white shadow-elevated font-black text-lg transition-all active:scale-95"
                onClick={() => navigate('/teacher/create-class')}
              >
                <Plus className="h-6 w-6" /> Tạo lớp học mới
              </Button>
            </section>

            {/* Content Area */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-sakura" /> Danh sách lớp ({classes.length})
                </h2>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-64 bg-white/50 animate-pulse rounded-[2.5rem] border-2 border-sakura-light/10" />
                  ))}
                </div>
              ) : classes.length === 0 ? (
                <Card className="rounded-[3rem] border-2 border-dashed border-sakura-light/30 bg-white/40 p-20 text-center">
                  <div className="w-24 h-24 bg-sakura-light/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <GraduationCap className="h-12 w-12 text-sakura/30" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Chưa có lớp học nào</h3>
                  <p className="text-muted-foreground mb-8 max-w-sm mx-auto">Bắt đầu hành trình giảng dạy của bạn bằng cách tạo lớp học đầu tiên.</p>
                  <Button onClick={() => navigate('/teacher/create-class')} className="h-14 px-10 rounded-2xl bg-sakura text-white font-bold">
                    <Plus className="h-5 w-5 mr-2" /> Tạo ngay
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {classes.map((cls, i) => (
                    <motion.div
                      key={cls.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card className="rounded-[2.5rem] border-2 border-sakura-light/20 shadow-card hover:shadow-elevated transition-all overflow-hidden bg-white group flex flex-col h-full">
                        <div className={cn(
                          "h-3 w-full",
                          cls.jlpt_level === 'N1' ? "bg-gradient-to-r from-red-400 to-rose-500" :
                          cls.jlpt_level === 'N2' ? "bg-gradient-to-r from-orange-400 to-amber-500" :
                          cls.jlpt_level === 'N3' ? "bg-gradient-to-r from-yellow-400 to-lime-500" :
                          cls.jlpt_level === 'N4' ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
                          "bg-gradient-to-r from-sakura-light to-sakura"
                        )} />

                        <CardHeader className="p-8 pb-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-sakura-light/10 text-sakura border-0 font-black text-[10px] uppercase tracking-widest">
                                  {cls.jlpt_level || 'General'}
                                </Badge>
                                {!cls.is_active && <Badge variant="secondary">Lưu trữ</Badge>}
                              </div>
                              <CardTitle className="text-2xl font-black text-sumi leading-tight">
                                {cls.name}
                              </CardTitle>
                            </div>
                            <div className="flex items-center gap-2 bg-sakura-light/5 px-3 py-1.5 rounded-xl border border-sakura-light/10">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Code:</span>
                              <span className="font-mono font-black text-sakura">{cls.invite_code}</span>
                              <button onClick={() => copyCode(cls.invite_code)} className="text-sakura hover:text-sakura-dark transition-colors">
                                {copiedCode === cls.invite_code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          </div>
                          {cls.description && <p className="text-muted-foreground text-sm font-medium mt-2 line-clamp-2">{cls.description}</p>}
                        </CardHeader>

                        <CardContent className="p-8 pt-4 flex-1 flex flex-col">
                          <div className="flex items-center gap-6 mb-8 bg-muted/20 p-4 rounded-3xl border border-border/50">
                            <div className="flex-1 text-center border-r border-border/50 last:border-0">
                               <p className="text-xl font-black text-sumi">{cls.member_count}</p>
                               <p className="text-[10px] uppercase font-bold text-muted-foreground">Học sinh</p>
                            </div>
                            <div className="flex-1 text-center border-r border-border/50 last:border-0">
                               <p className="text-xl font-black text-sumi">{cls.active_assignments}</p>
                               <p className="text-[10px] uppercase font-bold text-muted-foreground">Nhiệm vụ</p>
                            </div>
                            <div className="flex-1 text-center">
                               <p className="text-xl font-black text-sumi">{new Date(cls.created_at).getFullYear()}</p>
                               <p className="text-[10px] uppercase font-bold text-muted-foreground">Năm tạo</p>
                            </div>
                          </div>

                          <div className="mt-auto flex gap-3">
                            <Button 
                              onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                              className="flex-1 h-14 rounded-2xl bg-white border-2 border-sakura-light/30 text-sakura hover:bg-sakura-light/5 font-black gap-2 text-lg shadow-soft"
                            >
                              Chi tiết <ChevronRight className="h-5 w-5" />
                            </Button>
                            <Button 
                              onClick={() => navigate(`/teacher/classes/${cls.id}/assignments`)}
                              variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-sakura/5 text-sakura"
                            >
                              <ClipboardList className="h-6 w-6" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: 25% */}
          <aside className="lg:w-[380px] space-y-6">
             {/* Stats Card */}
             <Card className="rounded-[3rem] border-2 border-sakura-light/20 shadow-card bg-white p-8 space-y-8 sticky top-24">
                <h3 className="text-xl font-black text-sumi flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-sakura" /> Thống kê nhanh
                </h3>
                
                <div className="space-y-6">
                   <div className="flex items-center gap-4 group">
                      <div className="h-14 w-14 rounded-2xl bg-sakura-light/10 flex items-center justify-center text-sakura shadow-soft group-hover:scale-110 transition-transform">
                         <Users className="h-6 w-6" />
                      </div>
                      <div>
                         <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Tổng học sinh</p>
                         <h4 className="text-3xl font-black text-sumi">{totalStudents}</h4>
                      </div>
                   </div>

                   <div className="flex items-center gap-4 group">
                      <div className="h-14 w-14 rounded-2xl bg-matcha/10 flex items-center justify-center text-matcha shadow-soft group-hover:scale-110 transition-transform">
                         <ClipboardList className="h-6 w-6" />
                      </div>
                      <div>
                         <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Nhiệm vụ đang chạy</p>
                         <h4 className="text-3xl font-black text-sumi">{totalAssignments}</h4>
                      </div>
                   </div>

                   <div className="flex items-center gap-4 group">
                      <div className="h-14 w-14 rounded-2xl bg-gold/10 flex items-center justify-center text-gold shadow-soft group-hover:scale-110 transition-transform">
                         <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                         <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Lớp hoạt động</p>
                         <h4 className="text-3xl font-black text-sumi">{classes.filter(c => c.is_active).length}</h4>
                      </div>
                   </div>
                </div>

                <Separator className="bg-sakura-light/10" />

                <div className="space-y-4">
                   <h4 className="text-sm font-black text-sumi flex items-center gap-2">
                     <Sparkles className="h-4 w-4 text-sakura" /> Mẹo cho giáo viên
                   </h4>
                   <div className="bg-sakura-light/5 p-5 rounded-3xl border border-sakura-light/10 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground leading-relaxed italic">
                        "Gửi mã mời trực tiếp cho học sinh để tiết kiệm thời gian. Bạn có thể xem bảng điểm chi tiết ngay trong trang chi tiết lớp học."
                      </p>
                   </div>
                   <Button variant="ghost" className="w-full justify-center text-sakura font-bold hover:bg-sakura-light/10 rounded-xl">
                      Xem hướng dẫn sử dụng
                   </Button>
                </div>
             </Card>
          </aside>

        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
