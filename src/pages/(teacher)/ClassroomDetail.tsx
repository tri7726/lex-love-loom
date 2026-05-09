import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, ClipboardList, BarChart2, Loader2,
  Copy, Check, Trophy, BookOpen, Plus, Trash2, Clock,
  CheckCircle2, XCircle, GraduationCap, LogOut, Presentation,
  FileUp, Edit, Play
} from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface StudentProgress {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  current_streak: number;
  weekly_xp: number;
  exams_done: number;
  avg_score: number | null;
}

interface AssignmentRow {
  id: string;
  title: string;
  assignment_type: string;
  exam_id: string | null;
  deadline: string | null;
  is_active: boolean;
  created_at: string;
  // Aggregate from progress
  done_count: number;
  total_count: number;
}

interface ClassroomFull {
  id: string;
  name: string;
  description: string | null;
  jlpt_level: string | null;
  invite_code: string;
  is_active: boolean;
  member_count: number;
}

interface MockExamOption {
  id: string;
  title: string;
  level: string;
}

interface LessonRow {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
  slide_count: number;
}

interface SkillAnalytics {
  user_id: string;
  display_name: string;
  skills: {
    [key: string]: {
      correct: number;
      total: number;
      percent: number;
    };
  };
}

export const ClassroomDetail = () => {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [classroom, setClassroom] = useState<ClassroomFull | null>(null);
  const [members, setMembers] = useState<{ user_id: string; joined_at: string; profiles?: { display_name: string | null; avatar_url: string | null } }[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [exams, setExams] = useState<MockExamOption[]>([]);
  const [readingPassages, setReadingPassages] = useState<any[]>([]);
  const [grammarPoints, setGrammarPoints] = useState<any[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [skillAnalytics, setSkillAnalytics] = useState<SkillAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignType, setAssignType] = useState<'exam' | 'reading' | 'grammar'>('exam');
  const [assignTargetId, setAssignTargetId] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Live session dialog
  const [liveDialogOpen, setLiveDialogOpen] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveLink, setLiveLink] = useState('');
  const [liveStartTime, setLiveStartTime] = useState('');
  const [creatingLive, setCreatingLive] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!classId || !user) return;
    setLoading(true);
    try {
      // Classroom info
      const { data: cls, error: clsErr } = await (supabase as any)
        .from('classrooms')
        .select('id, name, description, jlpt_level, invite_code, is_active')
        .eq('id', classId)
        .eq('teacher_id', user.id)
        .single();
      if (clsErr) { navigate('/teacher'); return; }

      // Members (manual two-step join — no FK to profiles)
      const { data: rawMembers } = await (supabase as any)
        .from('class_members')
        .select('user_id, joined_at')
        .eq('class_id', classId)
        .order('joined_at', { ascending: true });
      let membersData: any[] = [];
      if (rawMembers && rawMembers.length) {
        const ids = rawMembers.map((m: any) => m.user_id);
        const { data: profs } = await (supabase as any)
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', ids);
        const pmap = new Map((profs || []).map((p: any) => [p.user_id, p]));
        membersData = rawMembers.map((m: any) => ({
          ...m,
          profiles: pmap.get(m.user_id) || null,
        }));
      }

      // Fetch Lessons
      const { data: lessonData } = await (supabase as any).from('lessons').select('*, slide_count:lesson_slides(count)').eq('class_id', classId);
      if (lessonData) setLessons(lessonData as any);

      // Fetch Skill Analytics
      const { data: skillData, error: skillErr } = await (supabase as any).rpc('get_class_skill_analytics', { p_class_id: classId });
      if (!skillErr && skillData) setSkillAnalytics(skillData as any);

      // Progress (via RPC)
      const { data: progressData } = await (supabase as any).rpc('get_class_student_progress', { p_class_id: classId });

      // Assignments
      const { data: assignData } = await (supabase as any)
        .from('class_assignments')
        .select(`
          id, title, assignment_type, exam_id, deadline, is_active, created_at,
          class_assignment_progress (is_completed)
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      // Available exams
      const { data: examsData } = await (supabase as any).from('mock_exams').select('id, title, level').or(`created_by.eq.${user.id},is_published.eq.true`).limit(50);
      
      // Available reading
      const { data: readData } = await (supabase as any).from('reading_passages').select('id, title, level').or(`user_id.eq.${user.id},user_id.is.null`).limit(50);

      // Available grammar
      const { data: gramData } = await (supabase as any).from('grammar_points').select('id, title, level').limit(100);

      // Live sessions
      const { data: liveData } = await (supabase as any).from('live_sessions').select('*').eq('class_id', classId).order('start_time', { ascending: true });

      setReadingPassages(readData || []);
      setGrammarPoints(gramData || []);
      setLiveSessions(liveData || []);
      setExams(examsData || []);

      setClassroom({ ...cls, member_count: (membersData || []).length });
      setMembers(membersData || []);
      setProgress((progressData as any) || []);
      setAssignments(
        (assignData || []).map((a: any) => ({
          ...a,
          done_count: (a.class_assignment_progress || []).filter((p: any) => p.is_completed).length,
          total_count: (a.class_assignment_progress || []).length,
        }))
      );
      setExams(examsData || []);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [classId, user, navigate, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const copyCode = async () => {
    if (!classroom) return;
    await navigator.clipboard.writeText(classroom.invite_code);
    setCopiedCode(true);
    toast({ title: `Đã copy mã "${classroom.invite_code}"` });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const kickMember = async (userId: string, name: string) => {
    if (!confirm(`Kick "${name}" khỏi lớp?`)) return;
    await (supabase as any).from('class_members').delete().eq('class_id', classId).eq('user_id', userId);
    toast({ title: 'Đã kick thành viên' });
    fetchAll();
  };

  const handleAssign = async () => {
    if (!assignTitle.trim() || !assignTargetId) return;
    setAssigning(true);
    try {
      const { error } = await (supabase as any).from('class_assignments').insert({
        class_id: classId,
        teacher_id: user?.id,
        title: assignTitle.trim(),
        assignment_type: assignType,
        exam_id: assignType === 'exam' ? assignTargetId : null,
        reading_id: assignType === 'reading' ? assignTargetId : null,
        grammar_id: assignType === 'grammar' ? assignTargetId : null,
        deadline: assignDeadline || null,
      });
      if (error) throw error;
      toast({ title: 'Đã giao nhiệm vụ! 📝' });
      setAssignDialogOpen(false);
      setAssignTitle(''); setAssignTargetId(''); setAssignDeadline('');
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateLive = async () => {
    if (!liveTitle.trim() || !liveLink.trim() || !liveStartTime) return;
    setCreatingLive(true);
    try {
      const { error } = await (supabase as any).from('live_sessions').insert({
        class_id: classId,
        teacher_id: user?.id,
        title: liveTitle.trim(),
        meeting_link: liveLink.trim(),
        start_time: liveStartTime,
      });
      if (error) throw error;
      toast({ title: 'Đã lên lịch buổi học trực tuyến! 🎥' });
      setLiveDialogOpen(false);
      setLiveTitle(''); setLiveLink(''); setLiveStartTime('');
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingLive(false);
    }
  };

  const deleteAssignment = async (id: string) => {
    if (!confirm('Xóa nhiệm vụ này?')) return;
    await (supabase as any).from('class_assignments').delete().eq('id', id);
    toast({ title: 'Đã xóa nhiệm vụ' });
    fetchAll();
  };

  const deleteLesson = async (id: string) => {
    if (!confirm('Xóa bài giảng này?')) return;
    await (supabase as any).from('lessons').delete().eq('id', id);
    toast({ title: 'Đã xóa bài giảng' });
    fetchAll();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!classroom) return null;

  const isOverdue = (deadline: string | null) =>
    deadline ? new Date(deadline) < new Date() : false;

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container py-8 max-w-6xl space-y-8">
        {/* Back */}
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/teacher')}>
          <ArrowLeft className="h-4 w-4" /> Tất cả lớp
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-display font-bold">{classroom.name}</h1>
              {classroom.jlpt_level && (
                <Badge className="bg-primary/10 text-primary border-0">{classroom.jlpt_level}</Badge>
              )}
            </div>
            {classroom.description && (
              <p className="text-muted-foreground text-sm">{classroom.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Invite code chip */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2 border border-border/40">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Mã:</span>
              <span className="font-mono font-black text-primary tracking-widest">{classroom.invite_code}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyCode}>
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="progress">
          <TabsList className="rounded-xl">
            <TabsTrigger value="progress" className="gap-2">
              <BarChart2 className="h-4 w-4" /> Tiến độ ({progress.length})
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Nhiệm vụ ({assignments.length})
            </TabsTrigger>
            <TabsTrigger value="lessons" className="gap-2">
              <Presentation className="h-4 w-4" /> Bài giảng ({lessons.length})
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-2">
              <Play className="h-4 w-4" /> Live ({liveSessions.length})
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" /> Thành viên ({classroom.member_count})
            </TabsTrigger>
            <TabsTrigger value="skills" className="gap-2">
              <GraduationCap className="h-4 w-4" /> Bản đồ kỹ năng
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Progress ─────────────────────────────────────── */}
          <TabsContent value="progress" className="mt-6">
            {progress.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground space-y-2">
                <Users className="h-12 w-12 mx-auto opacity-20" />
                <p>Chưa có học sinh nào trong lớp.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {['Học sinh', 'XP', 'XP tuần', 'Streak', 'Bài thi', 'Điểm TB'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {progress.map((s, i) => (
                      <motion.tr
                        key={s.user_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-muted/20"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={s.avatar_url || undefined} />
                              <AvatarFallback>{s.display_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">{s.display_name || 'Người học'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-primary">{s.total_xp?.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={cn("font-bold", s.weekly_xp > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                            +{s.weekly_xp}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {s.current_streak > 0 ? (
                            <span className="font-bold text-orange-500">🔥 {s.current_streak}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold">{s.exams_done}</td>
                        <td className="px-4 py-3">
                          {s.avg_score != null
                            ? <span className="font-bold">{s.avg_score}</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Assignments ───────────────────────────────────── */}
          <TabsContent value="assignments" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button className="gap-2 rounded-xl" onClick={() => setAssignDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Giao nhiệm vụ
              </Button>
            </div>

            {assignments.length === 0 ? (
              <div className="text-center py-16 space-y-2 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto opacity-20" />
                <p>Chưa có nhiệm vụ nào. Giao bài thi cho học sinh!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className="rounded-2xl border-2 border-border hover:border-primary/20 transition-all">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-crimson/10 text-crimson flex items-center justify-center shrink-0">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-bold text-sm">{a.title}</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Progress bar */}
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-400 rounded-full"
                                  style={{ width: a.total_count > 0 ? `${(a.done_count / a.total_count) * 100}%` : '0%' }}
                                />
                              </div>
                              <span className="font-bold text-muted-foreground">
                                {a.done_count}/{a.total_count}
                              </span>
                            </div>
                            {a.deadline && (
                              <span className={cn(
                                "text-[10px] font-bold flex items-center gap-1",
                                isOverdue(a.deadline) ? "text-rose-500" : "text-muted-foreground"
                              )}>
                                <Clock className="h-3 w-3" />
                                {isOverdue(a.deadline) ? 'Quá hạn' : formatDistanceToNow(new Date(a.deadline), { addSuffix: true, locale: vi })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {a.exam_id && (
                            <Link to={`/mock-tests/${a.exam_id}`}>
                              <Button variant="outline" size="sm" className="gap-1 rounded-lg text-xs">
                                <BookOpen className="h-3.5 w-3.5" /> Xem đề
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-400 hover:bg-rose-50"
                            onClick={() => deleteAssignment(a.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Live ─────────────────────────────────────────── */}
          <TabsContent value="live" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button className="gap-2 rounded-xl" onClick={() => setLiveDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Lên lịch Live
              </Button>
            </div>
            {liveSessions.length === 0 ? (
              <div className="text-center py-16 space-y-2 text-muted-foreground">
                <Play className="h-12 w-12 mx-auto opacity-20" />
                <p>Chưa có lịch học trực tuyến.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {liveSessions.map((s, i) => (
                  <Card key={s.id} className="rounded-2xl overflow-hidden border-2 hover:border-sakura/30 transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-sakura/10 text-sakura flex items-center justify-center">
                          <Play className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-bold">{s.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {new Date(s.start_time).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <a href={s.meeting_link} target="_blank" rel="noreferrer">
                        <Button className="rounded-xl bg-sakura shadow-sakura">Tham gia ngay</Button>
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Members ──────────────────────────────────────── */}
          <TabsContent value="members" className="mt-6 space-y-3">
            {members.length === 0 ? (
              <div className="text-center py-20 space-y-2 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto opacity-20" />
                <p>Chưa có học sinh nào. Chia sẻ mã mời để học sinh tham gia.</p>
              </div>
            ) : (
              members.map((m, i) => (
                <motion.div
                  key={m.user_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="rounded-2xl border">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={m.profiles?.avatar_url || undefined} />
                        <AvatarFallback>{m.profiles?.display_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{m.profiles?.display_name || 'Người học'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Tham gia {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true, locale: vi })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-400 hover:text-rose-500 hover:bg-rose-50 gap-1 text-xs"
                        onClick={() => kickMember(m.user_id, m.profiles?.display_name || 'học sinh này')}
                      >
                        <LogOut className="h-3.5 w-3.5" /> Kick
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* ── Tab: Lessons ────────────────────────────────────────── */}
          <TabsContent value="lessons" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Link to={`/teacher/lessons/new?classId=${classId}`}>
                <Button className="gap-2 rounded-xl">
                  <Plus className="h-4 w-4" /> Tạo bài giảng mới
                </Button>
              </Link>
            </div>

            {lessons.length === 0 ? (
              <div className="text-center py-16 space-y-2 text-muted-foreground">
                <Presentation className="h-12 w-12 mx-auto opacity-20" />
                <p>Chưa có bài giảng nào. Tạo bài giảng từ PDF hoặc thủ công!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lessons.map((l, i) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="rounded-2xl border-2 hover:border-primary/20 transition-all overflow-hidden group">
                      <CardContent className="p-0">
                        <div className="p-5 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-lg leading-tight line-clamp-2">{l.title}</h3>
                            <Badge variant={l.is_published ? "default" : "secondary"} className="shrink-0 text-[10px]">
                              {l.is_published ? 'Đã đăng' : 'Bản nháp'}
                            </Badge>
                          </div>
                          {l.description && <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>}
                          
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-medium">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" /> {l.slide_count} slides
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: vi })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-muted/30 p-3 flex items-center justify-between border-t border-border/50 group-hover:bg-primary/5 transition-colors">
                          <div className="flex items-center gap-2">
                            <Link to={`/lessons/${l.id}/view`}>
                              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs rounded-lg">
                                <Play className="h-3.5 w-3.5 fill-current" /> Xem thử
                              </Button>
                            </Link>
                            <Link to={`/teacher/lessons/${l.id}/edit`}>
                              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs rounded-lg">
                                <Edit className="h-3.5 w-3.5" /> Sửa
                              </Button>
                            </Link>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-400 hover:text-rose-500 hover:bg-rose-50"
                            onClick={() => deleteLesson(l.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Giao nhiệm vụ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Loại nhiệm vụ *</Label>
              <Select value={assignType} onValueChange={(v: any) => { setAssignType(v); setAssignTargetId(''); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exam">Đề thi (Mock Test)</SelectItem>
                  <SelectItem value="reading">Bài đọc (Reading)</SelectItem>
                  <SelectItem value="grammar">Ngữ pháp (Grammar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tiêu đề nhiệm vụ *</Label>
              <Input
                placeholder="VD: Thi thử tuần 1"
                value={assignTitle}
                onChange={e => setAssignTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Chọn nội dung *</Label>
              <Select value={assignTargetId} onValueChange={setAssignTargetId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={`Chọn ${assignType === 'exam' ? 'đề thi' : assignType === 'reading' ? 'bài đọc' : 'ngữ pháp'}...`} />
                </SelectTrigger>
                <SelectContent>
                  {assignType === 'exam' && exams.map(e => <SelectItem key={e.id} value={e.id}>[{e.level}] {e.title}</SelectItem>)}
                  {assignType === 'reading' && readingPassages.map(r => <SelectItem key={r.id} value={r.id}>[{r.level}] {r.title}</SelectItem>)}
                  {assignType === 'grammar' && grammarPoints.map(g => <SelectItem key={g.id} value={g.id}>[{g.level}] {g.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Deadline (tuỳ chọn)</Label>
              <Input
                type="datetime-local"
                value={assignDeadline}
                onChange={e => setAssignDeadline(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assigning}>Hủy</Button>
            <Button onClick={handleAssign} disabled={assigning || !assignTitle.trim() || !assignTargetId} className="gap-2">
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Giao bài
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Dialog */}
      <Dialog open={liveDialogOpen} onOpenChange={setLiveDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-sakura" /> Lên lịch Live
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tiêu đề buổi học *</Label>
              <Input placeholder="VD: Giải đề N3 tuần này" value={liveTitle} onChange={e => setLiveTitle(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Link phòng (Meet/Zoom) *</Label>
              <Input placeholder="https://meet.google.com/..." value={liveLink} onChange={e => setLiveLink(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Thời gian bắt đầu *</Label>
              <Input type="datetime-local" value={liveStartTime} onChange={e => setLiveStartTime(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLiveDialogOpen(false)} disabled={creatingLive}>Hủy</Button>
            <Button onClick={handleCreateLive} disabled={creatingLive || !liveTitle.trim() || !liveLink.trim() || !liveStartTime} className="gap-2 bg-sakura shadow-sakura">
              {creatingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Lên lịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassroomDetail;
