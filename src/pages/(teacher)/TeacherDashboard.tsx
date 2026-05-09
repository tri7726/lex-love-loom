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
    <div className="min-h-screen bg-background pb-20">
      <main className="container py-8 max-w-6xl space-y-10">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 gap-1.5">
              <GraduationCap className="h-3 w-3" /> Giáo viên
            </Badge>
            <h1 className="text-4xl font-display font-bold">Lớp của tôi</h1>
            <p className="text-muted-foreground">
              Tạo lớp, giao nhiệm vụ và theo dõi tiến độ học sinh.
            </p>
          </div>
          <Button
            className="gap-2 rounded-xl shadow-sakura"
            onClick={() => navigate('/teacher/create-class')}
          >
            <Plus className="h-4 w-4" /> Tạo lớp mới
          </Button>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: BookOpen, label: 'Lớp đang dạy', val: classes.filter(c => c.is_active).length, color: 'text-primary bg-primary/10' },
            { icon: Users, label: 'Tổng học sinh', val: totalStudents, color: 'text-emerald-600 bg-emerald-50' },
            { icon: ClipboardList, label: 'Nhiệm vụ active', val: totalAssignments, color: 'text-amber-600 bg-amber-50' },
          ].map((s, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.color)}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">{s.label}</p>
                  {loading
                    ? <Loader2 className="h-5 w-5 animate-spin mt-0.5" />
                    : <h3 className="text-2xl font-bold font-display">{s.val}</h3>
                  }
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Classes grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto">
              <GraduationCap className="h-12 w-12 text-primary/30" />
            </div>
            <h2 className="text-xl font-bold">Chưa có lớp nào</h2>
            <p className="text-sm text-muted-foreground">Tạo lớp đầu tiên để bắt đầu dạy học.</p>
            <Button onClick={() => navigate('/teacher/create-class')} className="gap-2 mt-2">
              <Plus className="h-4 w-4" /> Tạo lớp mới
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {classes.map((cls, i) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="rounded-3xl border-2 border-transparent hover:border-primary/20 transition-all group overflow-hidden bg-card/60 backdrop-blur-sm flex flex-col h-full">
                  {/* Color bar by JLPT level */}
                  <div className={cn(
                    "h-1.5 w-full",
                    cls.jlpt_level === 'N1' ? "bg-gradient-to-r from-red-400 to-rose-500" :
                    cls.jlpt_level === 'N2' ? "bg-gradient-to-r from-orange-400 to-amber-500" :
                    cls.jlpt_level === 'N3' ? "bg-gradient-to-r from-yellow-400 to-lime-500" :
                    cls.jlpt_level === 'N4' ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
                    "bg-gradient-to-r from-sky-400 to-blue-500"
                  )} />

                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors leading-tight">
                          {cls.name}
                        </CardTitle>
                        {cls.description && (
                          <CardDescription className="line-clamp-1 text-xs">
                            {cls.description}
                          </CardDescription>
                        )}
                      </div>
                      {cls.jlpt_level && (
                        <Badge className="shrink-0 bg-primary/10 text-primary border-0 text-[10px]">
                          {cls.jlpt_level}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="px-5 pb-5 flex-1 flex flex-col gap-4">
                    {/* Stats row */}
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="font-bold">{cls.member_count}</span>
                        <span className="text-xs">học sinh</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <ClipboardList className="h-4 w-4" />
                        <span className="font-bold">{cls.active_assignments}</span>
                        <span className="text-xs">nhiệm vụ</span>
                      </div>
                    </div>

                    {/* Invite code */}
                    <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 border border-border/40">
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest shrink-0">Mã:</span>
                      <span className="font-mono font-black text-primary tracking-widest text-sm flex-1">
                        {cls.invite_code}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => copyCode(cls.invite_code)}
                      >
                        {copiedCode === cls.invite_code
                          ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                          : <Copy className="h-3.5 w-3.5" />
                        }
                      </Button>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex gap-2">
                      <Link to={`/teacher/classes/${cls.id}`} className="flex-1">
                        <Button className="w-full gap-2 rounded-xl bg-primary shadow-sakura">
                          <TrendingUp className="h-4 w-4" /> Vào lớp
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {/* Add class card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: classes.length * 0.06 }}
            >
              <button
                onClick={() => navigate('/teacher/create-class')}
                className="w-full h-full min-h-[200px] rounded-3xl border-2 border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center transition-all">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-sm font-bold">Tạo lớp mới</span>
              </button>
            </motion.div>
          </div>
        )}

        {/* Quick tips */}
        {!loading && classes.length > 0 && (
          <Card className="rounded-3xl bg-primary/5 border-primary/10">
            <CardContent className="p-6 flex items-start gap-4">
              <Sparkles className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div className="space-y-1">
                <h4 className="font-bold text-base">Mẹo quản lý lớp</h4>
                <p className="text-sm text-muted-foreground">
                  Chia sẻ <strong>mã mời</strong> để học sinh tự join. Giao đề thi làm nhiệm vụ để theo dõi ai đã làm và kết quả của từng học sinh.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
