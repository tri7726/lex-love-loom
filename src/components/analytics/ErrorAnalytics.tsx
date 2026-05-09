import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Target, Calendar, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

/* ──────── Types ──────── */
interface MistakeRow {
  id: string;
  created_at: string;
  mistake_type: string;
  difficulty: string;
  original_part: string;
  corrected_part: string;
}

interface TypeStat {
  name: string;
  value: number;
  color: string;
}

interface DifficultyStat {
  name: string;
  beginner: number;
  intermediate: number;
  advanced: number;
}

interface TrendPoint {
  date: string;
  count: number;
  cumulative: number;
}

interface ErrorAnalyticsProps {
  className?: string;
}

/* ──────── Config ──────── */
const TYPE_COLORS: Record<string, string> = {
  particle_mistake: '#a855f7',
  verb_conjugation: '#3b82f6',
  word_choice: '#f97316',
  politeness: '#ec4899',
  spelling: '#ef4444',
  structure: '#14b8a6',
};

const TYPE_LABELS: Record<string, string> = {
  particle_mistake: 'Trợ từ',
  verb_conjugation: 'Chia động từ',
  word_choice: 'Từ vựng',
  politeness: 'Lịch sự',
  spelling: 'Chính tả',
  structure: 'Cấu trúc',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#22c55e',
  intermediate: '#eab308',
  advanced: '#ef4444',
};

const PIE_COLORS = ['#a855f7', '#3b82f6', '#f97316', '#ec4899', '#ef4444', '#14b8a6'];

/* ──────── Custom Tooltip ──────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl border border-border/50 shadow-lg px-4 py-3 text-xs space-y-1">
      <p className="font-bold text-foreground">{label || payload[0].name}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

/* ──────── Main Component ──────── */
const ErrorAnalytics: React.FC<ErrorAnalyticsProps> = ({ className }) => {
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [mistakes, setMistakes] = useState<MistakeRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMistakes = async () => {
      if (!profile?.id) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await (supabase as any)
          .from('grammar_mistakes')
          .select('id, created_at, mistake_type, difficulty, original_part, corrected_part')
          .order('created_at', { ascending: true });
        if (err) throw err;
        setMistakes((data as MistakeRow[]) || []);
      } catch (e: any) {
        console.error('Error fetching grammar mistakes:', e);
        setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchMistakes();
  }, [profile?.id]);

  /* ── Derived stats ── */
  const typeStats: TypeStat[] = Object.entries(
    mistakes.reduce<Record<string, number>>((acc, m) => {
      acc[m.mistake_type] = (acc[m.mistake_type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({
    name: TYPE_LABELS[name] || name,
    value,
    color: TYPE_COLORS[name] || '#6b7280',
  })).sort((a, b) => b.value - a.value);

  const totalMistakes = mistakes.length;
  const recentWeek = mistakes.filter(
    m => Date.now() - new Date(m.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;
  const mostCommon = typeStats[0]?.name || '—';
  const mostCommonCount = typeStats[0]?.value || 0;

  /* Weekly grouping for area chart */
  const weekMap = mistakes.reduce<Record<string, number>>((acc, m) => {
    const d = new Date(m.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  let cumul = 0;
  const trendData: TrendPoint[] = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => {
      cumul += count;
      return { date: date.slice(5), count, cumulative: cumul };
    });

  /* Difficulty per type for grouped bar */
  const diffByType = [...new Set(mistakes.map(m => m.mistake_type))].map(type => {
    const items = mistakes.filter(m => m.mistake_type === type);
    return {
      name: TYPE_LABELS[type] || type,
      beginner: items.filter(m => m.difficulty === 'beginner').length,
      intermediate: items.filter(m => m.difficulty === 'intermediate').length,
      advanced: items.filter(m => m.difficulty === 'advanced').length,
    };
  });

  /* ── Loading / Empty states ── */
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-16', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center gap-3 py-16 text-center', className)}>
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (totalMistakes === 0) {
    return (
      <div className={cn('flex flex-col items-center gap-3 py-16 text-center', className)}>
        <Target className="h-8 w-8 text-indigo-300" />
        <p className="text-sm font-medium text-foreground/70">Chưa có lỗi nào được ghi lại</p>
        <p className="text-xs text-muted-foreground">Hãy kiểm tra ngữ pháp để bắt đầu theo dõi tiến bộ</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-5', className)}
    >
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: AlertCircle, label: 'Tổng lỗi', value: totalMistakes, color: 'text-rose-500', bg: 'bg-rose-50' },
          { icon: Calendar, label: 'Tuần này', value: recentWeek, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { icon: Target, label: 'Phổ biến', value: mostCommon, color: 'text-purple-500', bg: 'bg-purple-50', sub: mostCommonCount },
          { icon: TrendingUp, label: 'Trung bình', value: totalMistakes > 0 ? `${(totalMistakes / Math.max(trendData.length, 1)).toFixed(1)}/tuần` : '—', color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={cn('p-4 rounded-2xl border border-border/40', stat.bg)}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={cn('h-4 w-4', stat.color)} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{stat.label}</span>
            </div>
            <p className={cn('text-2xl font-black', stat.color)}>{stat.value}</p>
            {stat.sub !== undefined && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.sub} lỗi</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Type distribution pie */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border border-indigo-100/50 rounded-2xl h-full">
            <CardContent className="p-5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">
                Phân bố loại lỗi
              </h4>
              {typeStats.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Chưa có dữ liệu</p>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={typeStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {typeStats.map((entry, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 shrink-0">
                    {typeStats.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-foreground/70">{t.name}</span>
                        <span className="font-bold text-foreground ml-auto">{t.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Difficulty per type */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border border-indigo-100/50 rounded-2xl h-full">
            <CardContent className="p-5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">
                Độ khó theo loại lỗi
              </h4>
              {diffByType.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Chưa có dữ liệu</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={diffByType} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-[10px] capitalize">{value}</span>
                      )}
                    />
                    <Bar dataKey="beginner" name="Cơ bản" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="intermediate" name="Trung cấp" fill="#eab308" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="advanced" name="Nâng cao" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Trend area chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="border border-indigo-100/50 rounded-2xl">
          <CardContent className="p-5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">
              Xu hướng theo tuần
            </h4>
            {trendData.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Chưa có dữ liệu</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value: string) => <span className="text-[10px]">{value === 'count' ? 'Lỗi mới' : 'Tích lũy'}</span>} />
                  <Area type="monotone" dataKey="count" name="count" stroke="#a855f7" fill="url(#countGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="cumulative" name="cumulative" stroke="#3b82f6" fill="url(#cumGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent mistakes list */}
      {mistakes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border border-indigo-100/50 rounded-2xl">
            <CardContent className="p-5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">
                Lỗi gần đây
              </h4>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {[...mistakes].reverse().slice(0, 20).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 border border-border/30 text-xs">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[m.mistake_type] || '#6b7280' }} />
                    <span className="font-jp text-rose-500 line-through shrink-0">{m.original_part}</span>
                    <span className="text-muted-foreground/40">→</span>
                    <span className="font-jp text-emerald-600 font-bold shrink-0">{m.corrected_part}</span>
                    <span className="text-muted-foreground/50 ml-auto text-[9px]">
                      {new Date(m.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ErrorAnalytics;
