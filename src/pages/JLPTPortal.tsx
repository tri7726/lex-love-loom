import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Map as MapIcon, BookOpen, Video,
  BookMarked, Layers, Target, Zap, Trophy,
  Star, Lock, Flame, CheckCircle2, ArrowRight,
  GraduationCap, Brain, Users, Sparkles, Timer,
  TrendingUp, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

/* ── Data ─────────────────────────────────────────────── */
const LEVEL_VOCAB: Record<string, number> = {
  N5: 800, N4: 1500, N3: 3000, N2: 6000, N1: 10000,
};

const LEVELS = [
  {
    level: 'N5',
    title: 'Sơ cấp',
    subtitle: 'Elementary',
    description: 'Giao tiếp hàng ngày cơ bản — mua sắm, hỏi đường, tự giới thiệu.',
    lessons: 25, kanji: 100,
    gradient: 'linear-gradient(135deg, #ffeef3, #ffd6e4)',
    accentColor: '#e87c9a',
    badgeColor: 'bg-pink-100 text-pink-700 border-pink-200',
    progressColor: '#e87c9a',
    ringColor: 'ring-pink-200',
    emoji: '🌸',
    skills: ['Hiragana & Katakana', 'Số đếm, màu sắc', 'Gia đình & Nghề nghiệp', 'Hành động cơ bản'],
    locked: false,
  },
  {
    level: 'N4',
    title: 'Sơ cấp nâng cao',
    subtitle: 'Pre-Intermediate',
    description: 'Đọc hiểu đoạn văn ngắn, giao tiếp trong tình huống quen thuộc.',
    lessons: 25, kanji: 300,
    gradient: 'linear-gradient(135deg, #eff0ff, #dde0ff)',
    accentColor: '#5b63e3',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    progressColor: '#5b63e3',
    ringColor: 'ring-indigo-200',
    emoji: '💫',
    skills: ['Thể lịch sự & thông thường', 'Trợ từ nâng cao', 'Biểu lộ cảm xúc', 'Thời gian & Lịch'],
    locked: false,
  },
  {
    level: 'N3',
    title: 'Trung cấp',
    subtitle: 'Intermediate',
    description: 'Hiểu văn bản về chủ đề quen thuộc, nghe được hội thoại bình thường.',
    lessons: 20, kanji: 600,
    gradient: 'linear-gradient(135deg, #eefaf2, #d4f7e2)',
    accentColor: '#2fa65c',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    progressColor: '#2fa65c',
    ringColor: 'ring-emerald-200',
    emoji: '🍵',
    skills: ['Bị động & Sai khiến', 'Điều kiện & Giả định', 'Keigo cơ bản', 'Đọc báo đơn giản'],
    locked: false,
  },
  {
    level: 'N2',
    title: 'Thượng cấp',
    subtitle: 'Upper-Intermediate',
    description: 'Nắm bắt thông tin từ báo chí, TV và làm việc trong môi trường Nhật Bản.',
    lessons: 15, kanji: 1000,
    gradient: 'linear-gradient(135deg, #fffbec, #fff3cd)',
    accentColor: '#d4960a',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    progressColor: '#d4960a',
    ringColor: 'ring-amber-200',
    emoji: '🏆',
    skills: ['Keigo đầy đủ', 'Văn phong trang trọng', 'Thuật ngữ kinh doanh', 'Văn học hiện đại'],
    locked: false,
  },
  {
    level: 'N1',
    title: 'Cao cấp',
    subtitle: 'Advanced',
    description: 'Thông thạo hoàn toàn — đọc, viết và suy nghĩ như người bản xứ.',
    lessons: 10, kanji: 2000,
    gradient: 'linear-gradient(135deg, #fdf2f2, #fce0e0)',
    accentColor: '#c0392b',
    badgeColor: 'bg-red-100 text-red-700 border-red-200',
    progressColor: '#c0392b',
    ringColor: 'ring-red-200',
    emoji: '🎯',
    skills: ['Văn học cổ điển', 'Chuyên ngành học thuật', 'Biểu đạt sắc thái', 'Dịch thuật chuyên sâu'],
    locked: false,
  },
];

const SKILLS = [
  { title: 'Ngữ pháp', icon: BookMarked, color: 'from-pink-400 to-rose-500', bg: 'bg-pink-50', text: 'text-pink-600', link: '/grammar', desc: 'Cấu trúc câu & mẫu câu' },
  { title: 'Từ vựng', icon: Layers, color: 'from-violet-400 to-indigo-500', bg: 'bg-violet-50', text: 'text-violet-600', link: '/vocabulary', desc: 'Flashcard & SRS' },
  { title: 'Nghe nói', icon: Video, color: 'from-sky-400 to-cyan-500', bg: 'bg-sky-50', text: 'text-sky-600', link: '/video-learning', desc: 'Video & phát âm' },
  { title: 'Đọc hiểu', icon: BookOpen, color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600', link: '/reading', desc: 'Văn bản & tin tức' },
  { title: 'Luyện thi', icon: Trophy, color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600', link: '/mock-tests', desc: 'Mock test JLPT' },
  { title: 'AI Sensei', icon: Brain, color: 'from-fuchsia-400 to-pink-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', link: '/sensei', desc: 'Hỏi đáp thông minh' },
];

const STATS_GLOBAL = [
  { label: 'Người học', value: '12,500+', icon: Users, color: 'text-sakura' },
  { label: 'Bài học', value: '95+', icon: BookOpen, color: 'text-indigo-500' },
  { label: 'Từ vựng', value: '20,000+', icon: Layers, color: 'text-emerald-500' },
  { label: 'Bài kiểm tra', value: '50+', icon: Trophy, color: 'text-amber-500' },
];

/* ── Component ─────────────────────────────────────────── */
export const JLPTPortal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flashcardCounts, setFlashcardCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [hoveredLevel, setHoveredLevel] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        const { data } = await supabase.from('flashcards').select('jlpt_level').eq('user_id', user.id);
        const counts: Record<string, number> = {};
        for (const row of (data ?? [])) {
          const lvl = (row as any).jlpt_level as string;
          if (lvl) counts[lvl] = (counts[lvl] ?? 0) + 1;
        }
        setFlashcardCounts(counts);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const getProgress = (level: string) => {
    const total = LEVEL_VOCAB[level] ?? 1;
    const learned = flashcardCounts[level] ?? 0;
    return Math.min(Math.round((learned / total) * 100), 100);
  };

  const totalLearned = Object.values(flashcardCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#FAFAF9] pb-24">
      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden"
           style={{ background: 'linear-gradient(160deg, #fff5f8 0%, #fdf9ff 50%, #f0f4ff 100%)' }}>
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.07]"
             style={{ background: 'radial-gradient(circle, #e87c9a, transparent)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-[0.06]"
             style={{ background: 'radial-gradient(circle, #5b63e3, transparent)', filter: 'blur(60px)' }} />

        <div className="container max-w-6xl py-16 md:py-20 relative z-10">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border"
              style={{ background: 'white', borderColor: '#e87c9a30', color: '#e87c9a' }}
            >
              <MapIcon className="h-3.5 w-3.5" />
              Lộ trình học tập JLPT
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-black tracking-tight text-slate-800"
            >
              Chinh phục <span style={{ background: 'linear-gradient(135deg, #e87c9a, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>N1</span> từng bước một
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-slate-500 text-lg font-medium leading-relaxed"
            >
              Lộ trình cá nhân hóa từ N5 đến N1 — học theo nhịp độ của riêng bạn với AI Sensei đồng hành.
            </motion.p>

            {/* User progress pill */}
            {user && !loading && totalLearned > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100"
              >
                <Flame className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-bold text-slate-700">
                  Bạn đã học <span className="text-emerald-600">{totalLearned.toLocaleString()}</span> từ vựng
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </motion.div>
            )}
          </div>

          {/* Global stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-3xl mx-auto"
          >
            {STATS_GLOBAL.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
                <s.icon className={cn('h-5 w-5 mx-auto mb-2', s.color)} />
                <p className="text-xl font-black text-slate-800">{s.value}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="container max-w-6xl py-12 space-y-16">
        {/* ── JLPT Path ──────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-pink-400 to-violet-500" />
            <h2 className="text-2xl font-black text-slate-800">Lộ trình từ N5 → N1</h2>
          </div>

          {/* Timeline layout */}
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-200 via-indigo-200 to-red-200 hidden md:block" style={{ transform: 'translateX(-50%)' }} />

            <div className="space-y-6">
              {LEVELS.map((lvl, index) => {
                const progress = getProgress(lvl.level);
                const learned = flashcardCounts[lvl.level] ?? 0;
                const total = LEVEL_VOCAB[lvl.level];
                const isEven = index % 2 === 0;
                const isHovered = hoveredLevel === lvl.level;

                return (
                  <motion.div
                    key={lvl.level}
                    initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 + 0.1, type: 'spring', damping: 20 }}
                    className={cn('relative md:flex md:items-center md:gap-8', isEven ? 'md:flex-row' : 'md:flex-row-reverse')}
                    onMouseEnter={() => setHoveredLevel(lvl.level)}
                    onMouseLeave={() => setHoveredLevel(null)}
                  >
                    {/* Timeline dot */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 z-10">
                      <motion.div
                        animate={{ scale: isHovered ? 1.3 : 1 }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg"
                        style={{ background: lvl.accentColor }}
                      >
                        {progress === 100 ? '✓' : lvl.emoji}
                      </motion.div>
                    </div>

                    {/* Card */}
                    <div className="md:w-[calc(50%-2.5rem)]">
                      <motion.div
                        animate={{ y: isHovered ? -4 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-3xl overflow-hidden border border-slate-100 bg-white shadow-sm hover:shadow-xl transition-shadow cursor-pointer"
                        onClick={() => navigate(`/learning-path/${lvl.level.toLowerCase()}`)}
                      >
                        {/* Card header */}
                        <div className="p-6 pb-4" style={{ background: lvl.gradient }}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                <span className="text-2xl font-black" style={{ color: lvl.accentColor }}>{lvl.level}</span>
                              </div>
                              <div>
                                <p className="font-black text-slate-800 text-lg leading-none">{lvl.title}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: lvl.accentColor }}>{lvl.subtitle}</p>
                              </div>
                            </div>
                            {progress === 100 && (
                              <span className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded-full">
                                <CheckCircle2 className="h-2.5 w-2.5" /> XONG
                              </span>
                            )}
                            {progress > 0 && progress < 100 && (
                              <span className="bg-white/80 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-white">
                                {progress}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-6 pt-4 space-y-4">
                          <p className="text-sm text-slate-500 leading-relaxed">{lvl.description}</p>

                          {/* Skills chips */}
                          <div className="flex flex-wrap gap-1.5">
                            {lvl.skills.map((skill, i) => (
                              <span key={i} className={cn('text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border', lvl.badgeColor)}>
                                {skill}
                              </span>
                            ))}
                          </div>

                          {/* Stats row */}
                          <div className="grid grid-cols-3 gap-2 py-1">
                            {[
                              { label: 'Từ vựng', val: `${total.toLocaleString()}+` },
                              { label: 'Kanji', val: `${lvl.kanji}+` },
                              { label: 'Bài học', val: `${lvl.lessons}` },
                            ].map((s, i) => (
                              <div key={i} className="text-center bg-slate-50 rounded-xl py-2 px-1">
                                <p className="text-sm font-black text-slate-700">{s.val}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{s.label}</p>
                              </div>
                            ))}
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-slate-400">
                                {loading ? 'Đang tải...' : `${learned.toLocaleString()} / ${total.toLocaleString()} từ`}
                              </span>
                              <span style={{ color: lvl.accentColor }}>{loading ? '—' : `${progress}%`}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${loading ? 0 : progress}%` }}
                                transition={{ duration: 1, delay: index * 0.08 + 0.4, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ background: lvl.accentColor }}
                              />
                            </div>
                          </div>

                          {/* CTA */}
                          <Link to={`/learning-path/${lvl.level.toLowerCase()}`} onClick={e => e.stopPropagation()}>
                            <button
                              className="w-full py-3 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 hover:opacity-90"
                              style={{ background: lvl.accentColor, boxShadow: `0 4px 20px ${lvl.accentColor}40` }}
                            >
                              {progress === 0 ? 'Bắt đầu học' : progress === 100 ? 'Ôn tập' : 'Tiếp tục'}
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </Link>
                        </div>
                      </motion.div>
                    </div>

                    {/* Spacer for opposite side */}
                    <div className="hidden md:block md:w-[calc(50%-2.5rem)]" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Skill Tracks ───────────────────────────────────── */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-violet-400 to-sky-500" />
            <div>
              <h2 className="text-2xl font-black text-slate-800">Luyện tập theo kỹ năng</h2>
              <p className="text-sm text-slate-400 font-medium">Tập trung vào điểm yếu của bạn</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SKILLS.map((skill, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 + 0.1 }}
              >
                <Link to={skill.link}>
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all group cursor-pointer">
                    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform', skill.bg)}>
                      <div className={cn('h-6 w-6', skill.text)}>
                        <skill.icon className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="font-black text-slate-800 text-sm mb-0.5">{skill.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{skill.desc}</p>
                    <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className={cn('text-[9px] font-black', skill.text)}>Bắt đầu</span>
                      <ChevronRight className={cn('h-3 w-3', skill.text)} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Quick 5 CTA Banner ─────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link to="/quick">
            <div className="relative rounded-3xl p-8 overflow-hidden cursor-pointer group"
                 style={{ background: 'linear-gradient(135deg, #e87c9a, #a855f7)' }}>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 -translate-y-1/2 translate-x-1/2"
                   style={{ background: 'white', filter: 'blur(40px)' }} />
              <div className="absolute bottom-0 left-32 w-40 h-40 rounded-full opacity-10"
                   style={{ background: 'white', filter: 'blur(30px)' }} />

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-300" />
                    <span className="text-white/80 text-[10px] font-black uppercase tracking-widest">Bài tập nhanh</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white">Quick 5 — Học 5 phút mỗi ngày</h3>
                  <p className="text-white/70 text-sm">5 câu hỏi xen kẽ từ nhiều cấp độ · Nhận XP ngay · Theo dõi streak</p>
                </div>
                <button className="flex-shrink-0 flex items-center gap-2 bg-white text-pink-600 font-black px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl group-hover:scale-105 transition-all text-sm">
                  Bắt đầu ngay
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Link>
        </motion.section>

        {/* ── Study Tips ─────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-amber-400 to-rose-400" />
            <h2 className="text-2xl font-black text-slate-800">Bí quyết học hiệu quả</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: <Timer className="h-5 w-5" />,
                color: 'text-blue-500',
                bg: 'bg-blue-50',
                title: 'Học đều mỗi ngày',
                desc: 'Nghiên cứu chứng minh học 20 phút/ngày hiệu quả gấp 3 lần học dồn 2 tiếng/tuần.',
                badge: 'Spaced Repetition',
              },
              {
                icon: <Brain className="h-5 w-5" />,
                color: 'text-violet-500',
                bg: 'bg-violet-50',
                title: 'Active Recall',
                desc: 'Thay vì đọc đi đọc lại, hãy tự kiểm tra bản thân. Flashcard giúp bộ não ghi nhớ lâu hơn.',
                badge: 'Đã áp dụng',
              },
              {
                icon: <TrendingUp className="h-5 w-5" />,
                color: 'text-emerald-500',
                bg: 'bg-emerald-50',
                title: 'Xen kẽ chủ đề',
                desc: 'Đừng học một chủ đề quá lâu. Xen kẽ từ vựng, Kanji và ngữ pháp cho kết quả tốt hơn.',
                badge: 'Interleaving',
              },
            ].map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 + 0.2 }}
                className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', tip.bg, tip.color)}>
                    {tip.icon}
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tip.badge}</span>
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm mb-1">{tip.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{tip.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
