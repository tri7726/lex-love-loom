
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, Target, Brain, Headphones, BookOpen, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ExamResult {
  id: string;
  score: number;
  section_scores: any; // Using any here to matches the JSON type from Supabase while allowing easy access
  passed: boolean;
  completed_at: string;
  created_at?: string;
  mock_exams: {
    title: string;
    level: string;
  };
}

interface FormattedData {
  date: string;
  fullDate: string;
  score: number;
  vocab: number;
  reading: number;
  listening: number;
  title: string | undefined;
  level: string | undefined;
  passed: boolean;
}

export const JLPTAnalytics = () => {
  const [data, setData] = useState<FormattedData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: results, error } = await supabase
        .from('mock_exam_results')
        .select(`
          id, score, section_scores, passed, completed_at,
          mock_exams!inner ( title, level )
        `)
        .order('completed_at', { ascending: true });

      if (results) {
        const formatted = (results as any[]).map((r): FormattedData => {
          const timestamp = r.completed_at || r.created_at; 
          const sectionScores = r.section_scores as any;
          return {
            date: timestamp ? format(new Date(timestamp), 'dd/MM', { locale: vi }) : '—',
            fullDate: timestamp ? format(new Date(timestamp), 'PPP', { locale: vi }) : '—',
            score: r.score,
            vocab: sectionScores?.vocabulary_grammar?.score ?? 0,
            reading: sectionScores?.reading?.score ?? 0,
            listening: sectionScores?.listening?.score ?? 0,
            title: r.mock_exams?.title,
            level: r.mock_exams?.level,
            passed: r.passed || false
          };
        });
        setData(formatted);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 text-sakura animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border-sakura/20 bg-sakura-light/5 rounded-[2rem]">
        <CardContent className="p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-sakura/10 rounded-2xl flex items-center justify-center mx-auto text-sakura">
            <TrendingUp className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-black text-slate-800">Chưa có dữ liệu phân tích</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">Hãy hoàn thành ít nhất một đề thi Mock Exam để chúng tôi có thể thống kê tiến độ của bạn.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const latest = data[data.length - 1];
  const avgScore = Math.round(data.reduce((acc, curr) => acc + curr.score, 0) / data.length);
  const bestScore = Math.max(...data.map(d => d.score));

  // Skills for Radar
  const radarData = [
    { subject: 'Từ vựng', A: latest.vocab, fullMark: 60 },
    { subject: 'Đọc hiểu', A: latest.reading, fullMark: 60 },
    { subject: 'Nghe hiểu', A: latest.listening, fullMark: 60 },
  ];

  // AI Prognosis logic
  const passProbability = Math.min(Math.round((avgScore / 100) * 100), 95);
  const weakness = 
    latest.vocab <= latest.reading && latest.vocab <= latest.listening ? 'Từ vựng & Ngữ pháp' :
    latest.reading <= latest.vocab && latest.reading <= latest.listening ? 'Đọc hiểu' : 'Nghe hiểu';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-sakura/10 shadow-soft overflow-hidden group">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 bg-sakura/10 rounded-2xl flex items-center justify-center text-sakura group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">Lần cuối: {latest.score}đ</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Điểm trung bình</p>
              <h4 className="text-4xl font-black text-slate-800">{avgScore}<span className="text-sm text-slate-300 ml-1">/180</span></h4>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-sakura/10 shadow-soft overflow-hidden group">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full">Tốt nhất: {bestScore}đ</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ cải thiện</p>
              <h4 className="text-4xl font-black text-slate-800">
                {data.length > 1 && data[0].score > 0 ? (Math.round(((latest.score - data[0].score) / data[0].score) * 100)) : 0}%
                <span className="text-sm text-slate-300 ml-1">so với lần đầu</span>
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-sakura/10 shadow-soft overflow-hidden group">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Brain className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Số bài thi: {data.length}</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trình độ mục tiêu</p>
              <h4 className="text-4xl font-black text-slate-800">{latest.level}</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[2.5rem] border-sakura/10 shadow-soft overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-800">Xu hướng điểm số</CardTitle>
            <CardDescription className="text-xs uppercase font-bold tracking-widest">Tổng điểm qua các lần thi</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E11D48" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#E11D48" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis domain={[0, 180]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                  labelStyle={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="score" name="Tổng điểm" stroke="#E11D48" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" dot={{ r: 6, fill: '#E11D48', strokeWidth: 3, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-sakura/10 shadow-soft overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-800">Phân tích kỹ năng</CardTitle>
            <CardDescription className="text-xs uppercase font-bold tracking-widest">Hiệu suất theo từng phần (Sankuten)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis domain={[0, 60]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                  labelStyle={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="vocab" name="Từ vựng/Ngữ pháp" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="reading" name="Đọc hiểu" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="listening" name="Nghe hiểu" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[2.5rem] border-sakura/10 shadow-soft overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-800">Cân bằng kỹ năng</CardTitle>
            <CardDescription className="text-xs uppercase font-bold tracking-widest">Phân bổ điểm số lần thi cuối</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pb-6 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 60]} tick={false} axisLine={false} />
                <Radar
                  name="Điểm đạt được"
                  dataKey="A"
                  stroke="#E11D48"
                  strokeWidth={3}
                  fill="#E11D48"
                  fillOpacity={0.4}
                />
                <Tooltip contentStyle={{ borderRadius: '1rem', fontWeight: 900 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-xl overflow-hidden relative group">
           <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
             <Brain className="w-64 h-64 text-white" />
           </div>
           <CardContent className="p-8 space-y-6 relative z-10">
              <div className="space-y-2">
                <Badge className="bg-sakura/20 text-sakura border-none hover:bg-sakura/30 font-black px-3 py-1">Dự đoán AI Sensei</Badge>
                <h4 className="text-2xl font-black text-white">Xác suất đỗ {latest.level}</h4>
              </div>

              <div className="flex items-end gap-4">
                 <div className="text-6xl font-black text-sakura">{passProbability}%</div>
                 <div className="pb-2 text-slate-400 font-bold text-sm uppercase tracking-widest">Sẵn sàng</div>
              </div>

              <div className="space-y-4">
                 <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${passProbability}%` }}
                     className="h-full bg-sakura shadow-[0_0_20px_rgba(225,29,72,0.5)]"
                   />
                 </div>
                 <p className="text-slate-300 text-sm font-medium leading-relaxed">
                   Dựa trên phong độ gần đây, bạn có khả năng cao sẽ chinh phục được {latest.level}. 
                   Điểm yếu cần tập trung cải thiện là <span className="text-sakura font-black">{weakness}</span>.
                 </p>
              </div>

              <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-black rounded-2xl h-12 shadow-lg">
                Xem lộ trình khắc phục
              </Button>
           </CardContent>
        </Card>
      </div>
    </div>
  );
};
