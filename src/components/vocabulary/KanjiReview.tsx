import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Target,
  Flame,
  TrendingUp,
  BookOpen,
  Sparkles,
  GraduationCap,
  Eye,
  Layers,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ==================== KANJI DATA (N5 real data) ====================
const kanjiN5Data: Array<{ kanji: string; reading: string; meaning: string }> = [
  { kanji: '一', reading: 'いち', meaning: 'một' }, { kanji: '二', reading: 'に', meaning: 'hai' },
  { kanji: '三', reading: 'さん', meaning: 'ba' }, { kanji: '四', reading: 'し', meaning: 'bốn' },
  { kanji: '五', reading: 'ご', meaning: 'năm' }, { kanji: '六', reading: 'ろく', meaning: 'sáu' },
  { kanji: '七', reading: 'しち', meaning: 'bảy' }, { kanji: '八', reading: 'はち', meaning: 'tám' },
  { kanji: '九', reading: 'きゅう', meaning: 'chín' }, { kanji: '十', reading: 'じゅう', meaning: 'mười' },
  { kanji: '百', reading: 'ひゃく', meaning: 'trăm' }, { kanji: '千', reading: 'せん', meaning: 'nghìn' },
  { kanji: '万', reading: 'まん', meaning: 'vạn' }, { kanji: '円', reading: 'えん', meaning: 'yên' },
  { kanji: '年', reading: 'ねん', meaning: 'năm' }, { kanji: '月', reading: 'つき', meaning: 'tháng / trăng' },
  { kanji: '日', reading: 'にち', meaning: 'ngày / mặt trời' }, { kanji: '時', reading: 'じ', meaning: 'giờ' },
  { kanji: '分', reading: 'ふん', meaning: 'phút / phần' }, { kanji: '半', reading: 'はん', meaning: 'nửa' },
  { kanji: '上', reading: 'うえ', meaning: 'trên' }, { kanji: '下', reading: 'した', meaning: 'dưới' },
  { kanji: '中', reading: 'なか', meaning: 'trong / giữa' }, { kanji: '外', reading: 'そと', meaning: 'ngoài' },
  { kanji: '右', reading: 'みぎ', meaning: 'phải' }, { kanji: '左', reading: 'ひだり', meaning: 'trái' },
  { kanji: '前', reading: 'まえ', meaning: 'trước' }, { kanji: '後', reading: 'あと', meaning: 'sau' },
  { kanji: '北', reading: 'きた', meaning: 'bắc' }, { kanji: '南', reading: 'みなみ', meaning: 'nam' },
  { kanji: '東', reading: 'ひがし', meaning: 'đông' }, { kanji: '西', reading: 'にし', meaning: 'tây' },
  { kanji: '口', reading: 'くち', meaning: 'miệng' }, { kanji: '目', reading: 'め', meaning: 'mắt' },
  { kanji: '耳', reading: 'みみ', meaning: 'tai' }, { kanji: '手', reading: 'て', meaning: 'tay' },
  { kanji: '足', reading: 'あし', meaning: 'chân' }, { kanji: '力', reading: 'ちから', meaning: 'sức mạnh' },
  { kanji: '人', reading: 'ひと', meaning: 'người' }, { kanji: '男', reading: 'おとこ', meaning: 'nam' },
  { kanji: '女', reading: 'おんな', meaning: 'nữ' }, { kanji: '子', reading: 'こ', meaning: 'con' },
  { kanji: '父', reading: 'ちち', meaning: 'ba / cha' }, { kanji: '母', reading: 'はは', meaning: 'mẹ' },
  { kanji: '友', reading: 'とも', meaning: 'bạn' }, { kanji: '先', reading: 'さき', meaning: 'trước' },
  { kanji: '生', reading: 'せい', meaning: 'sinh / sống' }, { kanji: '学', reading: 'がく', meaning: 'học' },
  { kanji: '校', reading: 'こう', meaning: 'trường' }, { kanji: '本', reading: 'ほん', meaning: 'quyển / gốc' },
  { kanji: '名', reading: 'な', meaning: 'tên' }, { kanji: '何', reading: 'なに', meaning: 'gì / cái gì' },
  { kanji: '大', reading: 'おお', meaning: 'lớn' }, { kanji: '小', reading: 'ちい', meaning: 'nhỏ' },
  { kanji: '長', reading: 'なが', meaning: 'dài' }, { kanji: '高', reading: 'たか', meaning: 'cao' },
  { kanji: '白', reading: 'しろ', meaning: 'trắng' }, { kanji: '新', reading: 'あたら', meaning: 'mới' },
  { kanji: '古', reading: 'ふる', meaning: 'cũ' }, { kanji: '多', reading: 'おお', meaning: 'nhiều' },
  { kanji: '少', reading: 'すく', meaning: 'ít' }, { kanji: '早', reading: 'はや', meaning: 'sớm / nhanh' },
  { kanji: '安', reading: 'やす', meaning: 'rẻ / yên' }, { kanji: '近', reading: 'ちか', meaning: 'gần' },
  { kanji: '遠', reading: 'とお', meaning: 'xa' }, { kanji: '広', reading: 'ひろ', meaning: 'rộng' },
  { kanji: '明', reading: 'あか', meaning: 'sáng' }, { kanji: '間', reading: 'あいだ', meaning: 'khoảng / giữa' },
  { kanji: '国', reading: 'くに', meaning: 'quốc / nước' }, { kanji: '語', reading: 'ご', meaning: 'ngôn ngữ' },
  { kanji: '英', reading: 'えい', meaning: 'Anh' }, { kanji: '話', reading: 'はなし', meaning: 'nói / câu chuyện' },
  { kanji: '読', reading: 'よ', meaning: 'đọc' }, { kanji: '書', reading: 'か', meaning: 'viết' },
  { kanji: '聞', reading: 'き', meaning: 'nghe' }, { kanji: '見', reading: 'み', meaning: 'xem / nhìn' },
  { kanji: '食', reading: 'た', meaning: 'ăn' }, { kanji: '飲', reading: 'の', meaning: 'uống' },
  { kanji: '買', reading: 'か', meaning: 'mua' }, { kanji: '来', reading: 'く', meaning: 'đến' },
  { kanji: '行', reading: 'い', meaning: 'đi' }, { kanji: '帰', reading: 'かえ', meaning: 'về' },
  { kanji: '出', reading: 'で', meaning: 'ra' }, { kanji: '入', reading: 'はい', meaning: 'vào' },
  { kanji: '立', reading: 'た', meaning: 'đứng' }, { kanji: '休', reading: 'やす', meaning: 'nghỉ' },
  { kanji: '会', reading: 'あ', meaning: 'gặp' }, { kanji: '社', reading: 'しゃ', meaning: 'xã' },
  { kanji: '店', reading: 'みせ', meaning: 'cửa hàng' }, { kanji: '駅', reading: 'えき', meaning: 'ga' },
  { kanji: '電', reading: 'でん', meaning: 'điện' }, { kanji: '車', reading: 'くるま', meaning: 'xe' },
  { kanji: '道', reading: 'みち', meaning: 'đường' }, { kanji: '天', reading: 'てん', meaning: 'trời' },
  { kanji: '気', reading: 'き', meaning: 'khí' }, { kanji: '雨', reading: 'あめ', meaning: 'mưa' },
  { kanji: '雪', reading: 'ゆき', meaning: 'tuyết' }, { kanji: '花', reading: 'はな', meaning: 'hoa' },
  { kanji: '山', reading: 'やま', meaning: 'núi' }, { kanji: '川', reading: 'かわ', meaning: 'sông' },
  { kanji: '海', reading: 'うみ', meaning: 'biển' }, { kanji: '火', reading: 'ひ', meaning: 'lửa' },
  { kanji: '水', reading: 'みず', meaning: 'nước' }, { kanji: '金', reading: 'かね', meaning: 'vàng / tiền' },
  { kanji: '土', reading: 'つち', meaning: 'đất' }, { kanji: '木', reading: 'き', meaning: 'cây / gỗ' },
  { kanji: '毎', reading: 'まい', meaning: 'mỗi' }, { kanji: '週', reading: 'しゅう', meaning: 'tuần' },
  { kanji: '今', reading: 'いま', meaning: 'bây giờ' }, { kanji: '午', reading: 'ご', meaning: 'trưa' },
  { kanji: '朝', reading: 'あさ', meaning: 'sáng' }, { kanji: '昼', reading: 'ひる', meaning: 'trưa' },
  { kanji: '夜', reading: 'よる', meaning: 'đêm' }, { kanji: '正', reading: 'しょう', meaning: 'chính' },
  { kanji: '門', reading: 'もん', meaning: 'cổng' }, { kanji: '体', reading: 'からだ', meaning: 'cơ thể' },
  { kanji: '病', reading: 'びょう', meaning: 'bệnh' }, { kanji: '院', reading: 'いん', meaning: 'viện' },
];

const kanjiByLevel: Record<string, Array<{ kanji: string; reading: string; meaning: string }>> = {
  N5: kanjiN5Data,
  N4: Array.from({ length: 209 }, (_, i) => ({ kanji: `漢${i}`, reading: `かん${i}`, meaning: `Nghĩa ${i + 1}` })),
  N3: Array.from({ length: 375 }, (_, i) => ({ kanji: `字${i}`, reading: `じ${i}`, meaning: `Nghĩa ${i + 1}` })),
  N2: Array.from({ length: 505 }, (_, i) => ({ kanji: `語${i}`, reading: `ご${i}`, meaning: `Nghĩa ${i + 1}` })),
  N1: Array.from({ length: 1310 }, (_, i) => ({ kanji: `文${i}`, reading: `ぶん${i}`, meaning: `Nghĩa ${i + 1}` })),
};

const KANJI_PER_DAY = 10;

const levelGradients: Record<string, string> = {
  N5: 'from-rose-400 via-pink-400 to-rose-500',
  N4: 'from-rose-500 via-pink-500 to-rose-600',
  N3: 'from-pink-400 via-rose-400 to-pink-500',
  N2: 'from-rose-500 via-red-400 to-pink-500',
  N1: 'from-pink-500 via-rose-500 to-red-500',
};

interface KanjiReviewProps {
  onBack: () => void;
}

export const KanjiReview: React.FC<KanjiReviewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'path' | 'stats'>('path');
  const [selectedLevel, setSelectedLevel] = useState('N5');
  const [currentDay, setCurrentDay] = useState(1);
  const [hoveredKanji, setHoveredKanji] = useState<number | null>(null);

  const levelInfo = useMemo(() => {
    return Object.entries(kanjiByLevel).map(([level, kanjis]) => ({
      level,
      total: kanjis.length,
      days: Math.ceil(kanjis.length / KANJI_PER_DAY),
    }));
  }, []);

  const currentLevelKanji = kanjiByLevel[selectedLevel] || [];
  const totalDays = Math.ceil(currentLevelKanji.length / KANJI_PER_DAY);
  const allTotalDays = levelInfo.reduce((s, l) => s + l.days, 0);
  const dayKanji = currentLevelKanji.slice((currentDay - 1) * KANJI_PER_DAY, currentDay * KANJI_PER_DAY);
  const grad = levelGradients[selectedLevel] || levelGradients.N5;

  const heatmapData = useMemo(() => {
    return Array.from({ length: 365 }, () => 0);
  }, []);
  const months = ['T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'T1', 'T2'];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 via-pink-50 to-white border border-rose-100 p-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-30 -right-20 w-60 h-60 bg-gradient-to-br from-rose-300/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-40 h-40 bg-gradient-to-tr from-pink-300/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-10 -translate-y-1/2 text-[120px] font-jp text-rose-300/[0.08] select-none leading-none">
            漢
          </div>
        </div>
        <div className="relative z-10 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <GraduationCap className="h-6 w-6 text-rose-400" />
            <span className="text-rose-400 text-sm font-semibold">Kanji Master 🌸</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-rose-800">Lộ trình học Kanji</h1>
          <p className="text-rose-400">{KANJI_PER_DAY} chữ mỗi ngày – Tổng cộng {allTotalDays} ngày</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-muted/60 rounded-xl p-1 gap-1 backdrop-blur-sm shadow-sm">
          {[
            { key: 'path' as const, icon: Layers, label: 'Lộ trình' },
            { key: 'stats' as const, icon: BarChart3, label: 'Thống kê' },
          ].map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(key)}
              className={cn('rounded-lg gap-2 transition-all', activeTab === key && 'shadow-md')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'path' ? (
          <motion.div
            key="path"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Calendar, label: 'Đã học', value: '0', sub: `/ ${allTotalDays} ngày`, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30' },
                { icon: Target, label: 'Kanji', value: '0', sub: 'chữ đã học', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/30' },
                { icon: Flame, label: 'Streak', value: '0', sub: 'ngày liên tiếp', color: 'text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
                { icon: TrendingUp, label: 'Tiến độ', value: '0%', sub: 'hoàn thành', color: 'text-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/30' },
              ].map(({ icon: Icon, label, value, sub, color, bg }, idx) => (
                <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
                  <Card className={cn('border-0 shadow-md', bg)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-white/80 dark:bg-white/10 shadow-sm', color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                      </div>
                      <p className={cn('text-2xl font-black', color)}>{value}</p>
                      <p className="text-[11px] text-muted-foreground">{sub}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* JLPT Level Selector */}
            <div className="flex gap-2 justify-center flex-wrap">
              {levelInfo.map(({ level, total, days }) => {
                const g = levelGradients[level];
                return (
                  <motion.button
                    key={level}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setSelectedLevel(level); setCurrentDay(1); }}
                    className={cn(
                      'relative min-w-[100px] rounded-xl px-4 py-3 text-center transition-all border-2',
                      selectedLevel === level
                        ? 'border-transparent shadow-lg text-white'
                        : 'border-border bg-card hover:shadow-md'
                    )}
                  >
                    {selectedLevel === level && (
                      <div className={cn('absolute inset-0 rounded-xl bg-gradient-to-br', g)} />
                    )}
                    <div className="relative z-10">
                      <span className="font-black text-lg">{level}</span>
                      <p className={cn('text-[10px]', selectedLevel === level ? 'text-white/80' : 'text-muted-foreground')}>
                        {total} chữ · {days} ngày
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Day Navigator */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className={cn('h-1 bg-gradient-to-r', grad)} />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" className="rounded-xl" disabled={currentDay <= 1} onClick={() => setCurrentDay((d) => Math.max(1, d - 1))}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold text-xl">Ngày {currentDay}</span>
                    <span className={cn('text-xs px-3 py-1 rounded-full bg-gradient-to-r text-white font-medium', grad)}>
                      {selectedLevel} – Cơ bản
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl" disabled={currentDay >= totalDays} onClick={() => setCurrentDay((d) => Math.min(totalDays, d + 1))}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Custom slider */}
                <div className="space-y-2">
                  <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', grad)}
                      animate={{ width: `${(currentDay / totalDays) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <input
                    type="range" min={1} max={totalDays} value={currentDay}
                    onChange={(e) => setCurrentDay(Number(e.target.value))}
                    className="w-full opacity-0 absolute cursor-pointer"
                    style={{ marginTop: -16, height: 16 }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Ngày 1</span>
                    <span>Ngày {totalDays}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Kanji Grid */}
            <Card className="border-0 shadow-lg overflow-visible">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md', grad)}>
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Kanji ngày {currentDay}</h3>
                      <p className="text-sm text-muted-foreground">{dayKanji.length} chữ cần học</p>
                    </div>
                  </div>
                  <Button className={cn('gap-2 bg-gradient-to-r text-white shadow-lg hover:shadow-xl transition-shadow', grad)}>
                    <BookOpen className="h-4 w-4" />
                    Học ngay
                  </Button>
                </div>

                <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                  {dayKanji.map((item, idx) => (
                    <motion.div
                      key={`${currentDay}-${idx}`}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.06, type: 'spring', stiffness: 300 }}
                      className="relative group"
                      onMouseEnter={() => setHoveredKanji(idx)}
                      onMouseLeave={() => setHoveredKanji(null)}
                    >
                      <div className={cn(
                        'w-full aspect-square rounded-2xl flex items-center justify-center text-3xl md:text-4xl font-jp cursor-pointer transition-all duration-300',
                        'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30',
                        'border-2 border-rose-200 dark:border-rose-800',
                        'hover:shadow-lg hover:shadow-rose-200/50 hover:border-rose-400 hover:scale-110',
                        'text-rose-700 dark:text-rose-400'
                      )}>
                        {item.kanji}
                      </div>

                      {/* Tooltip */}
                      <AnimatePresence>
                        {hoveredKanji === idx && (
                          <motion.div
                            initial={{ opacity: 0, y: 5, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.9 }}
                            className="absolute -bottom-20 left-1/2 -translate-x-1/2 z-50 bg-rose-800 text-white rounded-xl p-3 shadow-xl min-w-[120px] text-center"
                          >
                            <p className="text-xs font-jp text-rose-200">{item.reading}</p>
                            <p className="text-sm font-semibold mt-0.5">{item.meaning}</p>
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-rose-800 rotate-45" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            {/* Card Overview */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-rose-400" />
                  <h3 className="font-bold text-lg">Tổng quan (thẻ)</h3>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { value: 0, label: 'Cần ôn', color: 'text-rose-500', ring: 'ring-rose-200' },
                    { value: 0, label: 'Mới thêm', color: 'text-pink-500', ring: 'ring-pink-200' },
                    { value: 0, label: 'Đang học', color: 'text-rose-400', ring: 'ring-rose-200' },
                    { value: 0, label: 'Mới thuộc', color: 'text-pink-400', ring: 'ring-pink-200' },
                    { value: 0, label: 'Đã thuộc', color: 'text-rose-500', ring: 'ring-rose-200' },
                    { value: 0, label: 'Tổng', color: 'text-rose-600', ring: 'ring-rose-200' },
                  ].map(({ value, label, color, ring }, idx) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn('text-center p-3 rounded-xl ring-1', ring, 'bg-white dark:bg-slate-800/50')}
                    >
                      <p className={cn('text-2xl font-black', color)}>{value}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Today + Next */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-rose-400 via-rose-400 to-pink-500 text-white">
                  <CardContent className="p-6 relative">
                    <div className="absolute -right-6 -bottom-6 text-[100px] text-white/10 leading-none">📅</div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-5 w-5" />
                        <span className="font-semibold">Hôm nay</span>
                      </div>
                      <p className="text-5xl font-black">0</p>
                      <p className="text-sm opacity-80 mt-1">thẻ cần ôn tập</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-pink-400 via-pink-500 to-rose-500 text-white">
                  <CardContent className="p-6 relative">
                    <div className="absolute -right-6 -bottom-6 text-[100px] text-white/10 leading-none">🎯</div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="h-5 w-5" />
                        <span className="font-semibold">Lượt tiếp theo</span>
                      </div>
                      <p className="text-2xl font-black">Không có</p>
                      <p className="text-sm opacity-80 mt-1">lịch ôn tập trong tương lai</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Heatmap */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-rose-400" />
                  <h3 className="font-bold">0 lượt ôn tập trong 365 ngày qua</h3>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[650px]">
                    <div className="flex gap-0 mb-1.5 pl-8">
                      {months.map((m) => (
                        <span key={m} className="text-[10px] text-muted-foreground flex-1 font-medium">{m}</span>
                      ))}
                    </div>
                    <div className="flex gap-[3px]">
                      <div className="flex flex-col gap-[3px] pr-1.5">
                        {['T2', 'T4', 'T6'].map((d) => (
                          <span key={d} className="text-[9px] text-muted-foreground h-[14px] flex items-center">{d}</span>
                        ))}
                      </div>
                      <div className="flex gap-[3px] flex-1">
                        {Array.from({ length: 52 }, (_, week) => (
                          <div key={week} className="flex flex-col gap-[3px]">
                            {Array.from({ length: 7 }, (_, day) => {
                              const idx = week * 7 + day;
                              const val = heatmapData[idx] || 0;
                              const colors = [
                                'bg-rose-100/50 dark:bg-rose-900/20',
                                'bg-rose-200 dark:bg-rose-800/50',
                                'bg-rose-300 dark:bg-rose-700/70',
                                'bg-rose-400 dark:bg-rose-600',
                                'bg-rose-500 dark:bg-rose-500',
                              ];
                              return (
                                <motion.div
                                  key={day}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: (week * 7 + day) * 0.001 }}
                                  className={cn('w-[14px] h-[14px] rounded-[3px] transition-colors', colors[val])}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-3">
                      <span className="text-[10px] text-muted-foreground">Ít</span>
                      {['bg-rose-100/50 dark:bg-rose-900/20', 'bg-rose-200', 'bg-rose-300', 'bg-rose-400', 'bg-rose-500'].map((c, i) => (
                        <div key={i} className={cn('w-[12px] h-[12px] rounded-[3px]', c)} />
                      ))}
                      <span className="text-[10px] text-muted-foreground">Nhiều</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardContent className="p-10 text-center space-y-5">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-200/50"
                >
                  <Target className="h-10 w-10 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold">Bắt đầu học tập</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Thêm kanji vào deck để bắt đầu học với hệ thống SRS – ghi nhớ lâu dài, không bao giờ quên.
                </p>
                <Button
                  className="bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg px-8 py-5 text-base"
                  onClick={onBack}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Khám phá Kanji
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
