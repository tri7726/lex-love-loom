import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Clock, CheckCircle2, ChevronRight,
  Trophy, Loader2, LogOut, KeyRound, Users, GraduationCap, AlertCircle,
  Presentation, Play, FileText, RefreshCw, Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/common';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ClassroomInfo {
  id: string;
  name: string;
  description: string | null;
  jlpt_level: string | null;
  teacher_display_name: string | null;
  teacher_avatar: string | null;
  joined_at: string;
  active_assignments: number;
  completed_assignments: number;
}

interface Assignment {
  id: string;
  title: string;
  assignment_type: string;
  exam_id: string | null;
  reading_id: string | null;
  grammar_id: string | null;
  deadline: string | null;
  is_completed: boolean;
  score: number | null;
  max_score: number | null;
  class_name: string;
  class_id: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  class_name: string;
  created_at: string;
  slide_count: number;
}

interface LiveSession {
  id: string;
  title: string;
  start_time: string;
  meeting_link: string;
  class_name: string;
}

export const MyClasses = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [classes, setClasses] = useState<ClassroomInfo[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Lấy danh sách lớp đã tham gia
      const { data: memberships, error: memErr } = await (supabase as any)
        .from('class_members')
        .select(`
          joined_at,
          classrooms (
            id, name, description, jlpt_level,
            teacher_id
          )
        `)
        .eq('user_id', user.id);

      // Lấy hồ sơ giáo viên (manual join — không có FK trực tiếp tới profiles)
      const teacherIds = Array.from(new Set(
        (memberships || []).map((m: any) => m.classrooms?.teacher_id).filter(Boolean)
      ));
      let teacherMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (teacherIds.length > 0) {
        const { data: teacherProfiles } = await (supabase as any)
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', teacherIds);
        (teacherProfiles || []).forEach((p: any) => {
          teacherMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
        });
      }

      // Lấy danh sách bài giảng từ các lớp đã tham gia
      const classIds = (memberships || []).map((m: any) => m.classrooms?.id).filter(Boolean);
      let lessonsData: any[] = [];
      if (classIds.length > 0) {
        const { data: lData } = await (supabase as any)
          .from('lessons')
          .select(`
            id, title, description, created_at, class_id,
            classrooms (name),
            lesson_slides (id)
          `)
          .in('class_id', classIds)
          .eq('is_published', true)
          .order('created_at', { ascending: false });
        lessonsData = lData || [];
      }

      // Lấy danh sách Live Sessions
      let liveData: any[] = [];
      if (classIds.length > 0) {
        const { data: lvData } = await (supabase as any)
          .from('live_sessions')
          .select('*, classrooms(name)')
          .in('class_id', classIds)
          .eq('is_active', true)
          .order('start_time', { ascending: true });
        liveData = lvData || [];
      }

      if (memErr) throw memErr;

      // Lấy tiến độ assignments
      const { data: progressData } = await (supabase as any)
        .from('class_assignment_progress')
        .select(`
          is_completed, score, max_score,
          class_assignments (id, title, assignment_type, exam_id, reading_id, grammar_id, deadline, class_id,
            classrooms (name)
          )
        `)
        .eq('user_id', user.id);

      // Map lớp học
      const classMap: Record<string, { done: number; total: number }> = {};
      (progressData || []).forEach((p: any) => {
        const cid = p.class_assignments?.class_id;
        if (!cid) return;
        if (!classMap[cid]) classMap[cid] = { done: 0, total: 0 };
        classMap[cid].total++;
        if (p.is_completed) classMap[cid].done++;
      });

      const mappedClasses: ClassroomInfo[] = (memberships || [])
        .filter((m: any) => m.classrooms)
        .map((m: any) => ({
          id: m.classrooms.id,
          name: m.classrooms.name,
          description: m.classrooms.description,
          jlpt_level: m.classrooms.jlpt_level,
          teacher_display_name: teacherMap[m.classrooms.teacher_id]?.display_name || 'Giáo viên',
          teacher_avatar: teacherMap[m.classrooms.teacher_id]?.avatar_url || null,
          joined_at: m.joined_at,
          active_assignments: classMap[m.classrooms.id]?.total || 0,
          completed_assignments: classMap[m.classrooms.id]?.done || 0,
        }));
      setClasses(mappedClasses);

      // Map assignments
      const mappedAssignments = ((progressData || [])
        .filter((p: any) => p.class_assignments)
        .map((p: any) => ({
          id: p.class_assignments.id,
          title: p.class_assignments.title,
          assignment_type: p.class_assignments.assignment_type,
          exam_id: p.class_assignments.exam_id,
          deadline: p.class_assignments.deadline,
          is_completed: p.is_completed,
          score: p.score,
          max_score: p.max_score,
          class_name: p.class_assignments.classrooms?.name || '',
          class_id: p.class_assignments.class_id,
          reading_id: p.class_assignments.reading_id,
          grammar_id: p.class_assignments.grammar_id,
        })) as Assignment[])
        .sort((a: Assignment, b: Assignment) => {
          if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
          if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          return 0;
        });
      setAssignments(mappedAssignments);

      // Map lessons
      const mappedLessons: Lesson[] = lessonsData.map((l: any) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        class_name: l.classrooms?.name || '',
        created_at: l.created_at,
        slide_count: (l.lesson_slides || []).length
      }));
      setLessons(mappedLessons);

      // Map live sessions
      const mappedLive: LiveSession[] = liveData.map((lv: any) => ({
        id: lv.id,
        title: lv.title,
        start_time: lv.start_time,
        meeting_link: lv.meeting_link,
        class_name: lv.classrooms?.name || '',
      }));
      setLiveSessions(mappedLive);
    } catch (err: any) {
      toast({ title: 'Lỗi tải dữ liệu', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: tự refresh khi có nhiệm vụ / live session / lesson mới
  useEffect(() => {
    if (!user) return;
    const channel = (supabase as any)
      .channel('my-classes-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_assignments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_assignment_progress', filter: `user_id=eq.${user.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, () => fetchData())
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [user, fetchData]);

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const { data, error } = await (supabase as any).rpc('join_class_by_code', { p_code: inviteCode.trim() });
      if (error) throw error;
      toast({ title: `Đã tham gia lớp "${(data as any).class_name}"! 🎉` });
      setInviteCode('');
      setJoinDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Không thể tham gia', description: err.message, variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async (classId: string, className: string) => {
    if (!confirm(`Bạn có chắc muốn rời khỏi lớp "${className}"?`)) return;
    setLeavingId(classId);
    try {
      const { error } = await (supabase as any)
        .from('class_members')
        .delete()
        .eq('class_id', classId)
        .eq('user_id', user?.id);
      if (error) throw error;
      toast({ title: 'Đã rời khỏi lớp' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setLeavingId(null);
    }
  };

  const isOverdue = (deadline: string | null) =>
    deadline ? new Date(deadline) < new Date() : false;

  const overdueAssignments = assignments.filter(a => !a.is_completed && isOverdue(a.deadline));
  const pendingAssignments = assignments.filter(a => !a.is_completed && !isOverdue(a.deadline));
  const doneAssignments = assignments.filter(a => a.is_completed);

  // Tính điểm trung bình các bài đã hoàn thành (trên thang 100)
  const avgScore = (() => {
    const scored = doneAssignments.filter(a => a.score != null && a.max_score);
    if (!scored.length) return null;
    const total = scored.reduce((s, a) => s + ((a.score! / (a.max_score || 1)) * 100), 0);
    return Math.round(total / scored.length);
  })();

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container py-8 max-w-5xl space-y-10">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
              Khóa học của tôi
            </Badge>
            <h1 className="text-4xl font-display font-bold">Lớp đã tham gia</h1>
            <p className="text-muted-foreground">
              Xem nhiệm vụ từ giáo viên và theo dõi tiến độ học tập của bạn.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              disabled={loading}
              title="Làm mới"
              className="rounded-xl"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button
              className="gap-2 rounded-xl shadow-sakura"
              onClick={() => setJoinDialogOpen(true)}
            >
              <Plus className="h-4 w-4" /> Nhập mã tham gia
            </Button>
          </div>
        </section>

        {/* Quick stats */}
        {!loading && classes.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="rounded-2xl border-2 border-primary/10 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Lớp</p>
                <p className="text-2xl font-black text-primary">{classes.length}</p>
              </CardContent>
            </Card>
            <Card className={cn(
              'rounded-2xl border-2',
              overdueAssignments.length > 0 ? 'border-rose-200 bg-rose-50/40' : 'border-amber-100 bg-amber-50/30'
            )}>
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Cần làm</p>
                <p className={cn('text-2xl font-black', overdueAssignments.length > 0 ? 'text-rose-500' : 'text-amber-600')}>
                  {pendingAssignments.length + overdueAssignments.length}
                  {overdueAssignments.length > 0 && (
                    <span className="text-xs ml-1 text-rose-500">({overdueAssignments.length} quá hạn)</span>
                  )}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/30">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Đã xong</p>
                <p className="text-2xl font-black text-emerald-600">{doneAssignments.length}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/30">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Điểm TB</p>
                <p className="text-2xl font-black text-indigo-600">
                  {avgScore != null ? `${avgScore}%` : '—'}
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : classes.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-0">
              <EmptyState
                emoji="🎓"
                title="Chưa tham gia lớp nào"
                description="Nhập mã mời 8 ký tự từ giáo viên để tham gia khóa học và nhận nhiệm vụ."
                actionLabel="Nhập mã tham gia"
                onAction={() => setJoinDialogOpen(true)}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Classes list */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Lớp học ({classes.length})
              </h2>
              <AnimatePresence>
                {classes.map((cls, i) => {
                  const pct = cls.active_assignments > 0
                    ? Math.round((cls.completed_assignments / cls.active_assignments) * 100)
                    : 0;
                  return (
                    <motion.div
                      key={cls.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="rounded-2xl border-2 border-transparent hover:border-primary/20 transition-all group bg-card/60 backdrop-blur-sm">
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors truncate">
                                {cls.name}
                              </h3>
                              <p className="text-[11px] text-muted-foreground">
                                GV: {cls.teacher_display_name}
                              </p>
                            </div>
                            {cls.jlpt_level && (
                              <Badge className="shrink-0 bg-primary/10 text-primary border-0 text-[10px]">
                                {cls.jlpt_level}
                              </Badge>
                            )}
                          </div>

                          {/* Progress bar */}
                          {cls.active_assignments > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                <span>Nhiệm vụ</span>
                                <span>{cls.completed_assignments}/{cls.active_assignments}</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  className="h-full bg-primary rounded-full"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <p className="text-[10px] text-muted-foreground/60 flex-1">
                              Tham gia {formatDistanceToNow(new Date(cls.joined_at), { addSuffix: true, locale: vi })}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-rose-400 hover:text-rose-500 hover:bg-rose-50 px-2"
                              onClick={() => handleLeave(cls.id, cls.name)}
                              disabled={leavingId === cls.id}
                            >
                              {leavingId === cls.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <><LogOut className="h-3 w-3 mr-1" />Rời lớp</>
                              }
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Assignments */}
            <div className="lg:col-span-2 space-y-6">
              {/* Live Sessions */}
              {liveSessions.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Play className="h-5 w-5 text-sakura" />
                    Lớp học trực tuyến ({liveSessions.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {liveSessions.map((s, i) => (
                      <Card key={s.id} className="rounded-2xl overflow-hidden border-2 border-sakura/20 bg-sakura/5">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-sm">{s.title}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">{s.class_name}</p>
                            </div>
                            <Badge variant="outline" className="bg-sakura/10 text-sakura border-sakura/20 text-[10px]">LIVE</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {new Date(s.start_time).toLocaleString('vi-VN')}
                          </div>
                          <a href={s.meeting_link} target="_blank" rel="noreferrer">
                            <Button className="w-full gap-2 rounded-xl bg-sakura shadow-sakura">Tham gia ngay</Button>
                          </a>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Renderer cho card nhiệm vụ (dùng chung cho Quá hạn & Cần làm) */}
              {(() => {
                const renderAssignment = (a: Assignment, i: number, overdue = false) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className={cn(
                      'rounded-2xl border-2 transition-all',
                      overdue
                        ? 'border-rose-300 bg-rose-50/40 shadow-sm'
                        : 'border-border hover:border-primary/20'
                    )}>
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                          a.assignment_type === 'exam' ? 'bg-crimson/10 text-crimson' :
                          a.assignment_type === 'reading' ? 'bg-indigo-100 text-indigo-600' :
                          'bg-primary/10 text-primary'
                        )}>
                          {a.assignment_type === 'exam' ? <Trophy className="h-5 w-5" /> :
                           a.assignment_type === 'reading' ? <BookOpen className="h-5 w-5" /> :
                           <Presentation className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="font-bold text-sm leading-tight">{a.title}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase bg-muted px-2 py-0.5 rounded">
                              {a.class_name}
                            </span>
                            {a.deadline && (
                              <span className={cn(
                                'text-[10px] font-bold flex items-center gap-1',
                                overdue ? 'text-rose-500' : 'text-muted-foreground'
                              )}>
                                <Clock className="h-3 w-3" />
                                {overdue ? 'Đã quá hạn · ' : ''}
                                {formatDistanceToNow(new Date(a.deadline), { addSuffix: true, locale: vi })}
                              </span>
                            )}
                          </div>
                        </div>
                        {a.assignment_type === 'exam' && a.exam_id && (
                          <Link to={`/mock-tests/${a.exam_id}`}>
                            <Button size="sm" className="gap-1 rounded-xl bg-crimson hover:bg-crimson/90 text-white shrink-0">
                              Làm bài <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                        {a.assignment_type === 'reading' && a.reading_id && (
                          <Link to={`/reading?id=${a.reading_id}`}>
                            <Button size="sm" className="gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                              Đọc bài <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                        {a.assignment_type === 'grammar' && a.grammar_id && (
                          <Link to={`/grammar?id=${a.grammar_id}`}>
                            <Button size="sm" className="gap-1 rounded-xl bg-primary hover:bg-primary/90 text-white shrink-0">
                              Xem <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );

                return (
                  <>
                    {/* Overdue */}
                    {overdueAssignments.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-bold flex items-center gap-2 text-rose-600">
                            <Flame className="h-5 w-5" />
                            Quá hạn ({overdueAssignments.length})
                          </h2>
                          <Badge className="bg-rose-100 text-rose-600 border-0 text-[10px]">
                            Ưu tiên cao
                          </Badge>
                        </div>
                        {overdueAssignments.map((a, i) => renderAssignment(a, i, true))}
                      </div>
                    )}

                    {/* Pending */}
                    {pendingAssignments.length > 0 && (
                      <div className="space-y-3">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                          <Clock className="h-5 w-5 text-amber-500" />
                          Cần hoàn thành ({pendingAssignments.length})
                        </h2>
                        {pendingAssignments.map((a, i) => renderAssignment(a, i))}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Completed */}
              {doneAssignments.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    Đã hoàn thành ({doneAssignments.length})
                  </h2>
                  {doneAssignments.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Card className="rounded-2xl border border-emerald-100 bg-emerald-50/20">
                        <CardContent className="p-4 flex items-center gap-4">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-foreground/80">{a.title}</p>
                            <p className="text-[10px] text-muted-foreground">{a.class_name}</p>
                          </div>
                          {a.score != null && (
                            <div className="text-right shrink-0">
                              <p className="font-black text-lg text-emerald-600">{a.score}</p>
                              <p className="text-[10px] text-muted-foreground">/{a.max_score}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {classes.length > 0 && assignments.length === 0 && (
                <Card className="rounded-2xl border-dashed border-2 border-border/40">
                  <CardContent className="py-16 text-center space-y-2">
                    <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/20" />
                    <p className="text-muted-foreground text-sm">Chưa có nhiệm vụ nào được giao.</p>
                  </CardContent>
                </Card>
              )}

              {/* Lessons List */}
              {lessons.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Presentation className="h-5 w-5 text-indigo-500" />
                    Bài giảng hiện có ({lessons.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lessons.map((l, i) => (
                      <motion.div
                        key={l.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Card className="rounded-2xl border-2 hover:border-indigo-400/20 transition-all overflow-hidden group">
                          <CardContent className="p-0">
                            <div className="p-5 space-y-3">
                              <div className="space-y-1">
                                <h3 className="font-bold text-sm leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                                  {l.title}
                                </h3>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded w-fit">
                                  {l.class_name}
                                </p>
                              </div>
                              {l.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2">{l.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> {l.slide_count} slides
                                </span>
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: vi })}</span>
                              </div>
                            </div>
                            <div className="px-5 pb-5">
                              <Link to={`/lessons/${l.id}/view`}>
                                <Button className="w-full gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo">
                                  <Play className="h-3.5 w-3.5 fill-current" /> Học ngay
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Join Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Nhập mã tham gia lớp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="VD: AB12CD34"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              className="text-center text-lg font-bold tracking-widest h-14 rounded-xl"
              maxLength={8}
              onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
            />
            <p className="text-xs text-muted-foreground text-center">
              Nhập mã 8 ký tự mà giáo viên cung cấp cho bạn.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)} disabled={joining}>Hủy</Button>
            <Button onClick={handleJoin} disabled={joining || inviteCode.length < 8} className="gap-2">
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tham gia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyClasses;
