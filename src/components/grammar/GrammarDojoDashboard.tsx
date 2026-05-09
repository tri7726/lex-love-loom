import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Flame,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useGrammarMastery, MasteryData } from '@/hooks/useGrammarMastery';
import { GRAMMAR_DB, GrammarPoint } from '@/data/grammar-db';
import { cn } from '@/lib/utils';

/* ────────── Mastery Ring Chart ────────── */
interface RingChartProps {
  stats: Record<string, { mastered: number; learning: number; new: number }>;
}

const LEVEL_COLORS: Record<string, string> = {
  N5: '#FF6B8A',
  N4: '#A78BFA',
  N3: '#60A5FA',
};

const MasteryRingChart: React.FC<RingChartProps> = ({ stats }) => {
  const levels = ['N5', 'N4', 'N3'];
  const data = levels
    .filter(l => stats[l])
    .map(l => {
      const s = stats[l];
      const total = s.mastered + s.learning + s.new;
      const pct = total > 0 ? Math.round((s.mastered / total) * 100) : 0;
      return { level: l, pct, fill: LEVEL_COLORS[l] || '#ccc' };
    });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {data.map(d => (
        <div key={d.level} className="text-center space-y-2">
          <ResponsiveContainer width="100%" height={90}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" barSize={12} data={[d]} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background dataKey="pct" cornerRadius={12} fill={d.fill} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div>
            <p className="text-xs font-bold text-muted-foreground">{d.level}</p>
            <p className="text-lg font-black" style={{ color: d.fill }}>{d.pct}%</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ────────── Review Queue ────────── */
interface ReviewQueueProps {
  dueItems: GrammarPoint[];
}

const ReviewQueue: React.FC<ReviewQueueProps> = ({ dueItems }) => {
  if (dueItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
        <BookOpen className="h-10 w-10 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">Hôm nay không có mục cần ôn tập!</p>
        <p className="text-[11px] text-muted-foreground/60">Hãy học thêm điểm ngữ pháp mới nhé.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {dueItems.slice(0, 5).map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-muted hover:bg-muted/50 transition-colors"
        >
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
            item.level === 'N5' ? 'bg-sakura/10 text-sakura' :
            item.level === 'N4' ? 'bg-indigo-100 text-indigo-600' :
            'bg-blue-100 text-blue-600'
          )}>
            {item.level}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{item.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">{item.category}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </motion.div>
      ))}
      {dueItems.length > 5 && (
        <p className="text-center text-[11px] text-muted-foreground pt-1">
          +{dueItems.length - 5} mục nữa cần ôn
        </p>
      )}
    </div>
  );
};

/* ────────── Weak Points Panel ────────── */
interface WeakPointsPanelProps {
  userId: string | null;
}

interface WeakPoint {
  content: string;
  created_at: string;
}

const WeakPointsPanel: React.FC<WeakPointsPanelProps> = ({ userId }) => {
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    (supabase as any)
      .from('sensei_knowledge')
      .select('content, created_at')
      .eq('user_id', userId)
      .eq('source_type', 'mistake')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }: { data: any }) => {
        if (data) setWeakPoints(data as WeakPoint[]);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (weakPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
        <TrendingUp className="h-10 w-10 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">Chưa có lỗi sai nào được ghi nhận!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {weakPoints.map((wp, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-200/50">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-700 mb-1">Lỗi #{i + 1}</p>
            <p className="text-xs text-foreground/80 leading-relaxed">{wp.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ────────── Study Calendar (30-day heatmap) ────────── */
const StudyCalendar: React.FC<{ userId?: string | null }> = ({ userId }) => {
  const [practiceDates, setPracticeDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPracticeData = async () => {
      setLoading(true);
      const dates = new Set<string>();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoff = thirtyDaysAgo.toISOString();

      // Source 1: user_video_progress
      if (userId) {
        const { data, error } = await supabase
          .from('user_video_progress')
          .select('last_practiced_at')
          .eq('user_id', userId)
          .gte('last_practiced_at', cutoff);

        if (!error && data) {
          for (const row of data) {
            if (row.last_practiced_at) {
              dates.add(new Date(row.last_practiced_at).toISOString().split('T')[0]);
            }
          }
        }
      }

      // Source 2: grammar mastery localStorage
      try {
        const raw = localStorage.getItem('grammar_mastery_v2');
        if (raw) {
          const mastery = JSON.parse(raw) as Record<string, { lastPracticed: string }>;
          for (const m of Object.values(mastery)) {
            if (m.lastPracticed && m.lastPracticed >= cutoff) {
              dates.add(new Date(m.lastPracticed).toISOString().split('T')[0]);
            }
          }
        }
      } catch { /* ignore */ }

      setPracticeDates(dates);
      setLoading(false);
    };

    fetchPracticeData();
  }, [userId]);

  const today = new Date();
  const days: { dateStr: string; day: number; practiced: boolean }[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      dateStr,
      day: d.getDate(),
      practiced: practiceDates.has(dateStr),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1.5">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
          <div key={d} className="text-[9px] text-muted-foreground font-bold text-center">{d}</div>
        ))}
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "h-6 w-full rounded-md transition-colors text-[8px] flex items-center justify-center font-bold",
              d.practiced
                ? "bg-sakura/30 text-sakura-dark"
                : "bg-muted/30 text-muted-foreground/30"
            )}
            title={d.dateStr}
          >
            {d.day}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
        <span>Ít</span>
        <div className="h-3 w-3 rounded bg-muted/30" />
        <div className="h-3 w-3 rounded bg-sakura/30" />
        <span>Nhiều</span>
      </div>
    </div>
  );
};

/* ────────── Main Dashboard ────────── */
interface GrammarDojoDashboardProps {
  userId?: string | null;
}

export const GrammarDojoDashboard: React.FC<GrammarDojoDashboardProps> = ({ userId }) => {
  const { getMasteryStats, getDueItems } = useGrammarMastery({ userId });

  const stats = getMasteryStats(GRAMMAR_DB);
  const dueItems = getDueItems(GRAMMAR_DB);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
              <Flame className="h-4 w-4 text-sakura" />
              Cần ôn hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-black">{dueItems.length}</p>
            <p className="text-[11px] text-muted-foreground">mục ngữ pháp</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              Đã học
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-black">
              {Object.values(stats).reduce((sum, s) => sum + s.mastered + s.learning, 0)}
            </p>
            <p className="text-[11px] text-muted-foreground">tổng số điểm ngữ pháp</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-400" />
              Thành thạo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-black text-green-500">
              {Object.values(stats).reduce((sum, s) => sum + s.mastered, 0)}
            </p>
            <p className="text-[11px] text-muted-foreground">đã mastered</p>
          </CardContent>
        </Card>
      </div>

      {/* Mastery Rings */}
      <Card className="border-none shadow-card rounded-2xl">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-sm font-bold">Tiến độ theo cấp độ</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <MasteryRingChart stats={stats} />
        </CardContent>
      </Card>

      {/* Review Queue + Weak Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-card rounded-2xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-sakura" />
              Cần ôn hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ReviewQueue dueItems={dueItems} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-card rounded-2xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Điểm yếu nổi bật
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <WeakPointsPanel userId={userId || null} />
          </CardContent>
        </Card>
      </div>

      {/* Study Calendar */}
      <Card className="border-none shadow-card rounded-2xl">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Flame className="h-4 w-4 text-sakura" />
            Lịch học 30 ngày
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <StudyCalendar userId={userId} />
        </CardContent>
      </Card>
    </div>
  );
};
