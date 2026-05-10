import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Shield, Users, BookOpen, BarChart3, Search, Trash2, Activity, TrendingUp, FileText, Video, MessageSquare, Swords, Music2, LineChart, FlaskConical, Upload, GraduationCap, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────
interface UserWithRole {
  user_id: string;
  display_name: string | null;
  total_xp: number;
  current_streak: number;
  jlpt_level: string | null;
  created_at: string;
  roles: string[];
}

interface ContentStats {
  totalUsers: number;
  totalReadings: number;
  totalVideos: number;
  totalFlashcards: number;
  totalKanji: number;
  totalMockExams: number;
  totalSpeakingLessons: number;
  totalConversations: number;
}

// ─── User Roles Management ───────────────────────────────────────────────
function UserRolesPanel() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingRole, setAddingRole] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, total_xp, current_streak, jlpt_level, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: allRoles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap: Record<string, string[]> = {};
      (allRoles || []).forEach((r: { user_id: string; role: string }) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      setUsers(
        (profiles || []).map(p => ({
          ...p,
          roles: roleMap[p.user_id] || [],
        }))
      );
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const addRole = async (userId: string, role: string) => {
    setAddingRole(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: role as never });
      if (error) {
        if (error.code === '23505') {
          toast.info('Người dùng đã có role này');
        } else throw error;
      } else {
        toast.success(`Đã thêm role ${role}`);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi thêm role');
    } finally {
      setAddingRole(null);
    }
  };

  const removeRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as never);
      if (error) throw error;
      toast.success(`Đã xóa role ${role}`);
      fetchUsers();
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi xóa role');
    }
  };

  const filteredUsers = users.filter(u =>
    !searchQuery ||
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.user_id.includes(searchQuery)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Làm mới'}
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>JLPT</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map(user => (
              <TableRow key={user.user_id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{user.display_name || 'Chưa đặt tên'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{user.user_id.slice(0, 8)}...</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.jlpt_level || 'N5'}</Badge>
                </TableCell>
                <TableCell className="font-mono">{user.total_xp || 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.length === 0 && (
                      <Badge variant="secondary" className="text-xs">user</Badge>
                    )}
                    {user.roles.map(r => (
                      <Badge
                        key={r}
                        variant={r === 'admin' ? 'default' : 'secondary'}
                        className="text-xs gap-1"
                      >
                        {r}
                        <button
                          onClick={() => removeRole(user.user_id, r)}
                          className="ml-0.5 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Select onValueChange={val => addRole(user.user_id, val)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="+ Thêm role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stats Overview ──────────────────────────────────────────────────────
function StatsOverview() {
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Array<{ type: string; count: number; label: string }>>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, readings, videos, kanji, exams, lessons, convos] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('reading_passages').select('id', { count: 'exact', head: true }),
          supabase.from('video_sources').select('id', { count: 'exact', head: true }),
          supabase.from('kanji').select('id', { count: 'exact', head: true }),
          supabase.from('mock_exams').select('id', { count: 'exact', head: true }),
          supabase.from('speaking_lessons').select('id', { count: 'exact', head: true }),
          supabase.from('ai_conversations').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          totalUsers: users.count || 0,
          totalReadings: readings.count || 0,
          totalVideos: videos.count || 0,
          totalFlashcards: 0,
          totalKanji: kanji.count || 0,
          totalMockExams: exams.count || 0,
          totalSpeakingLessons: lessons.count || 0,
          totalConversations: convos.count || 0,
        });

        // Recent activity
        const { data: recentXp } = await supabase
          .from('xp_events')
          .select('source, amount')
          .order('created_at', { ascending: false })
          .limit(100);

        if (recentXp) {
          const grouped: Record<string, number> = {};
          recentXp.forEach(e => {
            grouped[e.source] = (grouped[e.source] || 0) + 1;
          });
          setRecentActivity(
            Object.entries(grouped)
              .map(([type, count]) => ({ type, count, label: type }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 6)
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!stats) return null;

  const statCards = [
    { label: 'Người dùng', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Bài đọc', value: stats.totalReadings, icon: FileText, color: 'text-emerald-500' },
    { label: 'Video', value: stats.totalVideos, icon: Video, color: 'text-purple-500' },
    { label: 'Kanji', value: stats.totalKanji, icon: BookOpen, color: 'text-orange-500' },
    { label: 'Mock Exams', value: stats.totalMockExams, icon: Swords, color: 'text-red-500' },
    { label: 'Speaking Lessons', value: stats.totalSpeakingLessons, icon: MessageSquare, color: 'text-teal-500' },
    { label: 'AI Conversations', value: stats.totalConversations, icon: Activity, color: 'text-pink-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Hoạt động gần đây (100 XP events)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recentActivity.map(a => (
                <Badge key={a.type} variant="outline" className="text-xs">
                  {a.label}: {a.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Content Management ──────────────────────────────────────────────────
function ContentPanel() {
  const [tab, setTab] = useState('readings');
  const [readings, setReadings] = useState<Array<{ id: string; title: string; level: string; user_id: string | null; created_at: string }>>([]);
  const [videos, setVideos] = useState<Array<{ id: string; title: string; youtube_id: string; jlpt_level: string | null; processed: boolean | null }>>([]);
  const [loading, setLoading] = useState(false);

  const fetchContent = async (type: string) => {
    setLoading(true);
    try {
      if (type === 'readings') {
        const { data } = await supabase.from('reading_passages').select('id, title, level, user_id, created_at').order('created_at', { ascending: false }).limit(50);
        setReadings(data || []);
      } else if (type === 'videos') {
        const { data } = await supabase.from('video_sources').select('id, title, youtube_id, jlpt_level, processed').order('created_at', { ascending: false }).limit(50);
        setVideos(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContent(tab); }, [tab]);

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="readings">Bài đọc</TabsTrigger>
          <TabsTrigger value="videos">Video</TabsTrigger>
        </TabsList>

        <TabsContent value="readings" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readings.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{r.title}</TableCell>
                      <TableCell><Badge variant="outline">{r.level}</Badge></TableCell>
                      <TableCell>{r.user_id ? 'Cá nhân' : 'Hệ thống'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('vi')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>YouTube ID</TableHead>
                    <TableHead>JLPT</TableHead>
                    <TableHead>Đã xử lý</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{v.title}</TableCell>
                      <TableCell className="font-mono text-xs">{v.youtube_id}</TableCell>
                      <TableCell><Badge variant="outline">{v.jlpt_level || '—'}</Badge></TableCell>
                      <TableCell>{v.processed ? '✅' : '⏳'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Activity Log ────────────────────────────────────────────────────────
function ActivityLog() {
  const [logs, setLogs] = useState<Array<{ id: string; user_id: string; source: string; amount: number; created_at: string | null; display_name?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data: events } = await supabase
          .from('xp_events')
          .select('id, user_id, source, amount, created_at')
          .order('created_at', { ascending: false })
          .limit(50);

        if (events && events.length > 0) {
          const userIds = [...new Set(events.map(e => e.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', userIds);

          const nameMap: Record<string, string> = {};
          (profiles || []).forEach(p => { nameMap[p.user_id] = p.display_name || 'Ẩn danh'; });

          setLogs(events.map(e => ({ ...e, display_name: nameMap[e.user_id] || 'Ẩn danh' })));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Người dùng</TableHead>
            <TableHead>Hoạt động</TableHead>
            <TableHead>XP</TableHead>
            <TableHead>Thời gian</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map(log => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">{log.display_name}</TableCell>
              <TableCell><Badge variant="secondary" className="text-xs">{log.source}</Badge></TableCell>
              <TableCell className="font-mono text-emerald-600">+{log.amount}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {log.created_at ? new Date(log.created_at).toLocaleString('vi') : '—'}
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                Chưa có hoạt động nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Admin Tools Hub ─────────────────────────────────────────────────────
const ADMIN_TOOLS = [
  { to: '/admin/roles', label: 'Roles & Permissions', desc: 'Cấp/thu hồi quyền admin theo email', icon: ShieldCheck, color: 'text-primary' },
  { to: '/admin/exam-manager', label: 'Quản lý đề thi', desc: 'Tạo/sửa mock exams, JLPT', icon: GraduationCap, color: 'text-red-500' },
  { to: '/admin-import', label: 'Import dữ liệu', desc: 'Bulk import bài đọc, video, kanji', icon: Upload, color: 'text-emerald-500' },
  { to: '/admin/experiments', label: 'A/B Experiments', desc: 'Bật/tắt feature flag', icon: FlaskConical, color: 'text-purple-500' },
  { to: '/admin/docs', label: 'Skill Docs', desc: 'AI Analysis Framework & ghi chú', icon: FileText, color: 'text-blue-500' },
  { to: '/admin/pitch-overrides', label: 'Pitch Overrides', desc: 'Sửa NHK pitch accent', icon: Music2, color: 'text-pink-500' },
  { to: '/admin/telemetry', label: 'AI Telemetry', desc: 'Lookup miss & AI fallback log', icon: LineChart, color: 'text-orange-500' },
];

function AdminToolsGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ADMIN_TOOLS.map((t) => (
        <Link key={t.to} to={t.to}>
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <t.icon className={`h-5 w-5 mt-0.5 ${t.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────
export const AdminDashboard = () => {
  const { isAdmin, loading } = useIsAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth?redirect=/admin', { replace: true });
      return;
    }
    if (!isAdmin) navigate('/', { replace: true });
  }, [isAdmin, loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
        <Loader2 className="h-10 w-10 text-sakura animate-spin" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#faf9f6] pb-20">
      <main className="max-w-[1600px] mx-auto px-4 md:px-10 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Main Area: 70% */}
          <div className="flex-1 space-y-10">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-4">
                 <div className="h-14 w-14 bg-sakura rounded-2xl flex items-center justify-center text-white shadow-sakura">
                    <Shield className="h-8 w-8" />
                 </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-sakura-light/20 text-sakura border-0 font-black text-[10px] uppercase tracking-widest px-3">System Control</Badge>
                      <Badge variant="outline" className="text-muted-foreground border-border">v2.0 Premium</Badge>
                    </div>
                    <h1 className="text-4xl font-display font-black text-sumi tracking-tight">Trung tâm Quản trị</h1>
                 </div>
              </div>
              <p className="text-muted-foreground text-lg font-medium max-w-3xl">
                Kiểm soát toàn bộ hệ thống Sakura Nihongo. Quản lý người dùng, nội dung học tập và theo dõi hoạt động thời gian thực.
              </p>
            </motion.div>

            {/* Content Tabs */}
            <Tabs defaultValue="users" className="space-y-8">
              <div className="flex items-center justify-between bg-white/50 p-2 rounded-[2rem] border-2 border-sakura-light/10 backdrop-blur-sm sticky top-24 z-30 shadow-soft">
                <TabsList className="bg-transparent gap-2 h-14">
                  <TabsTrigger value="users" className="rounded-2xl px-8 h-10 data-[state=active]:bg-sakura data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all">
                    <Users className="h-4 w-4 mr-2" /> Người dùng
                  </TabsTrigger>
                  <TabsTrigger value="content" className="rounded-2xl px-8 h-10 data-[state=active]:bg-sakura data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all">
                    <BookOpen className="h-4 w-4 mr-2" /> Nội dung
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="rounded-2xl px-8 h-10 data-[state=active]:bg-sakura data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all">
                    <Activity className="h-4 w-4 mr-2" /> Nhật ký
                  </TabsTrigger>
                  <TabsTrigger value="tools" className="rounded-2xl px-8 h-10 data-[state=active]:bg-sakura data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all lg:hidden">
                    <ShieldCheck className="h-4 w-4 mr-2" /> Công cụ
                  </TabsTrigger>
                </TabsList>
                
                <div className="hidden md:flex items-center gap-2 px-4 border-l border-sakura-light/20">
                   <div className="h-2 w-2 rounded-full bg-matcha animate-pulse" />
                   <span className="text-[10px] font-black text-matcha uppercase tracking-widest">Hệ thống Live</span>
                </div>
              </div>

              <TabsContent value="users" className="mt-0 focus-visible:ring-0">
                <Card className="rounded-[3rem] border-2 border-sakura-light/10 shadow-card bg-white p-8">
                   <UserRolesPanel />
                </Card>
              </TabsContent>

              <TabsContent value="content" className="mt-0 focus-visible:ring-0">
                <Card className="rounded-[3rem] border-2 border-sakura-light/10 shadow-card bg-white p-8">
                   <ContentPanel />
                </Card>
              </TabsContent>

              <TabsContent value="logs" className="mt-0 focus-visible:ring-0">
                <Card className="rounded-[3rem] border-2 border-sakura-light/10 shadow-card bg-white p-8">
                   <ActivityLog />
                </Card>
              </TabsContent>

              <TabsContent value="tools" className="mt-0 focus-visible:ring-0 lg:hidden">
                 <AdminToolsGrid />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar Area: 30% */}
          <aside className="lg:w-[420px] space-y-8">
             {/* High Impact Stats */}
             <section className="space-y-4">
                <h3 className="text-sm font-black text-sumi uppercase tracking-widest flex items-center gap-2 px-2">
                  <BarChart3 className="h-4 w-4 text-sakura" /> Thống kê tổng quan
                </h3>
                <Card className="rounded-[3rem] border-2 border-sakura-light/20 shadow-card bg-white p-8">
                   <StatsOverview />
                </Card>
             </section>

             {/* Quick Admin Tools */}
             <section className="space-y-4 sticky top-24">
                <h3 className="text-sm font-black text-sumi uppercase tracking-widest flex items-center gap-2 px-2">
                  <ShieldCheck className="h-4 w-4 text-sakura" /> Công cụ quản trị
                </h3>
                <AdminToolsGrid />
                
                <Card className="mt-8 rounded-[2.5rem] bg-sakura/5 border-2 border-sakura-light/10 p-6">
                   <div className="flex items-start gap-4">
                      <FlaskConical className="h-6 w-6 text-sakura shrink-0 mt-1" />
                      <div className="space-y-1">
                         <h4 className="font-bold text-sumi">Phát triển AI</h4>
                         <p className="text-xs text-muted-foreground leading-relaxed">
                            Toàn bộ các tính năng AI bao gồm Dịch thuật và Gợi ý thông minh đang hoạt động ở chế độ ổn định. Kiểm tra Telemetry để xem hiệu suất.
                         </p>
                      </div>
                   </div>
                </Card>
             </section>
          </aside>

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
