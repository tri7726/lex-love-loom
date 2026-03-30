import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  BookOpen, 
  Book, 
  Video, 
  CheckCircle2, 
  PlayCircle,
  Brain,
  Zap,
  Lock,
  ArrowRight,
  Map as MapIcon,
  BookMarked,
  Trophy,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import { MINNA_N5_VOCAB } from '@/data/minna-n5';
import { MINNA_N4_VOCAB } from '@/data/minna-n4';

interface LevelItem {
  title: string;
  type: 'vocabulary' | 'grammar' | 'video' | 'quiz' | 'practice';
  completed: boolean;
  link: string;
}

interface LevelUnit {
  id: number;
  title: string;
  description: string;
  items: LevelItem[];
}

interface LevelData {
  title: string;
  subtitle: string;
  category: string;
  description: string;
  accentColor: string;
  bgFill: string;
  units: LevelUnit[];
  skills: string[];
}

const generateUnits = (level: string, count: number): LevelUnit[] => {
  const units: LevelUnit[] = [];
  const vocabData = level === 'n5' ? MINNA_N5_VOCAB : level === 'n4' ? MINNA_N4_VOCAB : null;

  for (let i = 1; i <= count; i++) {
    // For N5/N4, use indices 0-24, but if we have more units than data, we cycle or use placeholders
    const dataIndex = i - 1;
    const hasData = vocabData && vocabData[dataIndex];
    
    // Determine title based on data or generic if missing
    let unitTitle = `Bài ${i}`;
    let unitDesc = `Nội dung kiến thức bài ${i}`;
    
    if (level === 'n5' || level === 'n4') {
      const lessonNum = level === 'n5' ? i : i + 25;
      unitTitle = `Bài ${lessonNum}: ${getMinnaLessonTitle(lessonNum)}`;
      unitDesc = `Các mẫu câu và từ vựng cốt lõi của bài ${lessonNum}.`;
    } else {
      unitTitle = `Chương ${i}: ${getAdvancedTheme(level, i)}`;
      unitDesc = `Chuyên đề nâng cao về ${getAdvancedTheme(level, i).toLowerCase()}.`;
    }

    units.push({
      id: i,
      title: unitTitle,
      description: unitDesc,
      items: [
        { title: `Từ vựng & Kanji ${unitTitle}`, type: 'vocabulary', completed: i <= 2, link: '/vocabulary' },
        { title: `Ngữ pháp bài ${i}`, type: 'grammar', completed: i <= 1, link: '/grammar' },
        { title: `Học qua video`, type: 'video', completed: false, link: '/video-learning' },
        { title: `Kiểm tra nhanh`, type: 'quiz', completed: false, link: '/quiz' },
      ]
    });
  }
  return units;
};

const getMinnaLessonTitle = (num: number): string => {
  const titles: Record<number, string> = {
    1: 'Chào hỏi', 2: 'Đồ vật', 3: 'Địa điểm', 4: 'Thời gian', 5: 'Di chuyển',
    6: 'Hành động', 7: 'Công cụ', 8: 'Tính từ', 9: 'Sở thích', 10: 'Vị trí',
    11: 'Số lượng', 12: 'So sánh', 13: 'Mong muốn', 14: 'Yêu cầu', 15: 'Xin phép',
    16: 'Liên kết', 17: 'Phủ định', 18: 'Khả năng', 19: 'Kinh nghiệm', 20: 'Thông thường',
    21: 'Dự đoán', 22: 'Định ngữ', 23: 'Thời hạn', 24: 'Cho nhận', 25: 'Giả định',
    26: 'Giải thích', 27: 'Khả năng 2', 28: 'Đồng thời', 29: 'Trạng thái', 30: 'Chuẩn bị',
    31: 'Ý định', 32: 'Lời khuyên', 33: 'Mệnh lệnh', 34: 'Hướng dẫn', 35: 'Điều kiện 2',
    36: 'Mục tiêu', 37: 'Bị động', 38: 'Danh từ hóa', 39: 'Nguyên nhân', 40: 'Nghi vấn',
    41: 'Kính trọng', 42: 'Mục đích', 43: 'Trông có vẻ', 44: 'Quá mức', 45: 'Trường hợp',
    46: 'Vừa mới', 47: 'Nghe nói', 48: 'Sai khiến', 49: 'Tôn kính', 50: 'Khiêm nhường'
  };
  return titles[num] || `Chuyên đề ${num}`;
};

const getAdvancedTheme = (level: string, num: number): string => {
  const themes: Record<string, string[]> = {
    n3: ['Xã hội', 'Kinh tế', 'Giao thông', 'Môi trường', 'Y tế', 'Khoa học', 'Công nghệ', 'Văn hóa', 'Giáo dục', 'Lao động'],
    n2: ['Thời sự', 'Chính trị', 'Tâm lý', 'Triết học', 'Lịch sử', 'Kinh doanh', 'Luật pháp', 'Y học chuyên sâu', 'Nghệ thuật'],
    n1: ['Học thuật', 'Phê bình', 'Văn chương', 'Vấn đề toàn cầu', 'Logic học', 'Chiêm nghiệm', 'Sắc thái tinh tế']
  };
  const list = themes[level] || ['Chương nâng cao'];
  return list[(num - 1) % list.length] + ` ${Math.ceil(num / list.length)}`;
};

const levelData: Record<string, LevelData> = {
  n5: {
    title: 'Sơ cấp (Elementary)',
    subtitle: 'N5',
    category: 'N5',
    description: 'Hành trình bắt đầu từ những điều cơ bản nhất. Giao tiếp hàng ngày - mua sắm, hỏi đường, tự giới thiệu.',
    accentColor: '#e87c9a',
    bgFill: 'bg-pink-100/10',
    skills: ['Hiragana & Katakana', 'Số đếm, màu sắc', 'Gia đình & Nghề nghiệp', 'Hành động cơ bản'],
    units: generateUnits('n5', 25)
  },
  n4: {
    title: 'Sơ cấp nâng cao (Pre-Intermediate)',
    subtitle: 'N4',
    category: 'N4',
    description: 'Đọc hiểu đoạn văn ngắn, giao tiếp trong tình huống quen thuộc.',
    accentColor: '#5b63e3',
    bgFill: 'bg-indigo-100/10',
    skills: ['Thể lịch sự & thông thường', 'Trợ từ nâng cao', 'Biểu lộ cảm xúc', 'Thời gian & Lịch'],
    units: generateUnits('n4', 25)
  },
  n3: {
    title: 'Trung cấp (Intermediate)',
    subtitle: 'N3',
    category: 'N3',
    description: 'Hiểu văn bản về chủ đề quen thuộc, nghe được hội thoại bình thường.',
    accentColor: '#2fa65c',
    bgFill: 'bg-emerald-100/10',
    skills: ['Bị động & Sai khiến', 'Điều kiện & Giả định', 'Keigo cơ bản', 'Đọc báo đơn giản'],
    units: generateUnits('n3', 20)
  },
  n2: {
    title: 'Thượng cấp (Upper-Intermediate)',
    subtitle: 'N2',
    category: 'N2',
    description: 'Nắm bắt thông tin từ báo chí, TV và làm việc trong môi trường Nhật Bản.',
    accentColor: '#d4960a',
    bgFill: 'bg-amber-100/10',
    skills: ['Keigo đầy đủ', 'Văn phong trang trọng', 'Thuật ngữ kinh doanh', 'Văn học hiện đại'],
    units: generateUnits('n2', 15)
  },
  n1: {
    title: 'Cao cấp (Advanced)',
    subtitle: 'N1',
    category: 'N1',
    description: 'Thông thạo hoàn toàn — đọc, viết và suy nghĩ như người bản xứ.',
    accentColor: '#c0392b',
    bgFill: 'bg-red-100/10',
    skills: ['Văn học cổ điển', 'Chuyên ngành học thuật', 'Biểu đạt sắc thái', 'Dịch thuật chuyên sâu'],
    units: generateUnits('n1', 10)
  }
};
export const JLPTLevelDetail = () => {
  const { level } = useParams<{ level: string }>();
  const data = levelData[level?.toLowerCase() || 'n5'];
  
  if (!data) return <div className="p-20 text-center font-bold">Cấp độ không tồn tại.</div>;

  const totalItems = data.units.reduce((acc: number, unit: LevelUnit) => acc + unit.items.length, 0);
  const completedItems = data.units.reduce((acc: number, unit: LevelUnit) => 
    acc + unit.items.filter((item: LevelItem) => item.completed).length, 0);
  const overallProgress = (completedItems / totalItems) * 100;

  const getIcon = (type: string) => {
    switch (type) {
      case 'vocabulary': return <BookOpen className="h-4 w-4" />;
      case 'grammar': return <Book className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'quiz': return <Zap className="h-4 w-4" />;
      default: return <PlayCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container py-8 space-y-8">
        {/* Header & Progress */}
        <div className="space-y-4">
          <Link to="/learning-path">
            <Button variant="ghost" size="sm" className="gap-2 mb-2 hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
              Quay lại lộ trình
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span 
                  className="px-3 py-1 rounded-lg text-sm font-bold shadow-sm"
                  style={{ backgroundColor: `${data.accentColor}15`, color: data.accentColor }}
                >
                  {data.subtitle}
                </span>
                <h1 className="text-3xl font-display font-bold text-foreground">
                  {data.title}
                </h1>
              </div>
              <p className="text-muted-foreground max-w-2xl leading-relaxed">
                {data.description}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {data.skills.map((skill, i) => (
                  <Badge key={i} variant="secondary" className="bg-muted/50 text-muted-foreground font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            
            <Card className="w-full md:w-72 border-primary/5 shadow-soft bg-card/50 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tiến độ</span>
                    <div className="text-2xl font-display font-bold" style={{ color: data.accentColor }}>
                      {Math.floor(overallProgress)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      {completedItems}/{totalItems} Mục
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${overallProgress}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: data.accentColor }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center italic">
                  "Hành trình vạn dặm bắt đầu từ bước chân đầu tiên"
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Units Roadmap */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-primary" />
                Lộ trình chi tiết
              </h2>
              <Badge variant="outline" className="font-medium">
                {data.units.length} Bài học
              </Badge>
            </div>
            
            <Accordion type="single" collapsible className="space-y-4 w-full" defaultValue="unit-1">
              {data.units.map((unit: LevelUnit) => (
                <AccordionItem 
                  key={unit.id} 
                  value={`unit-${unit.id}`}
                  className="border rounded-2xl bg-card overflow-hidden shadow-soft px-4 border-primary/5 hover:border-primary/20 transition-all duration-300"
                >
                  <AccordionTrigger className="hover:no-underline py-5 group">
                    <div className="flex items-center gap-5 text-left">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: `${data.accentColor}10`, color: data.accentColor }}
                      >
                        {unit.id}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{unit.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{unit.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 pt-2">
                    <div className="grid gap-3 pl-2 border-l-2 ml-6 border-dashed border-muted">
                      {unit.items.map((item: LevelItem, idx: number) => (
                        <Link key={idx} to={item.link}>
                          <div className={`
                            group flex items-center justify-between p-4 rounded-xl border transition-all duration-200
                            ${item.completed 
                              ? 'bg-matcha/5 border-matcha/20 hover:bg-matcha/10' 
                              : 'bg-muted/30 border-transparent hover:border-primary/20 hover:bg-card hover:shadow-sm'}
                          `}>
                            <div className="flex items-center gap-4">
                              <div className={`
                                w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                ${item.completed 
                                  ? 'bg-matcha text-white shadow-md shadow-matcha/20' 
                                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}
                              `}>
                                {item.completed ? <CheckCircle2 className="h-5 w-5" /> : getIcon(item.type)}
                              </div>
                              <div className="space-y-0.5">
                                <span className={`text-sm font-semibold block ${item.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {item.title}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-bold">
                                  {item.type}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.completed && (
                                <Badge className="bg-matcha/20 text-matcha hover:bg-matcha/20 border-none text-[10px]">
                                  +15 XP
                                </Badge>
                              )}
                              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Sidebar Tools */}
          <div className="space-y-6">
            <Card className="shadow-card border-primary/5 overflow-hidden">
              <div className="h-2 w-full" style={{ backgroundColor: data.accentColor }} />
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookMarked className="h-5 w-5" style={{ color: data.accentColor }} />
                  Tài liệu học tập
                </CardTitle>
                <CardDescription>Bổ trợ kiến thức {level?.toUpperCase()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { title: `Video bài giảng ${level?.toUpperCase()}`, icon: Video, color: 'text-sky-500', link: '/video-learning' },
                  { title: 'Ngân hàng đề thi', icon: Trophy, color: 'text-amber-500', link: '/quiz' },
                  { title: 'Shadowing với Sensei', icon: Brain, color: 'text-matcha', link: '/ai-tutor' },
                ].map((tool, idx) => (
                  <Link key={idx} to={tool.link}>
                    <Button variant="outline" className="w-full justify-start gap-4 h-14 shadow-none hover:bg-muted/50 border-muted group transition-all">
                      <div className="p-2 bg-muted rounded-lg group-hover:bg-white transition-colors">
                        <tool.icon className={`h-5 w-5 ${tool.color}`} />
                      </div>
                      <span className="font-semibold text-sm">{tool.title}</span>
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-none shadow-elevated group">
              <div 
                className="absolute inset-0 opacity-90 transition-transform group-hover:scale-110 duration-700"
                style={{ background: `linear-gradient(135deg, ${data.accentColor}, #2d3436)` }}
              />
              <CardContent className="relative p-7 space-y-5 text-white">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl w-fit">
                  <Star className="h-6 w-6 text-yellow-300 fill-yellow-300 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold font-display">Chiến thuật Master {level?.toUpperCase()}</h3>
                  <p className="text-sm text-white/80 leading-relaxed font-medium">
                    "Tập trung {data.skills[0].toLowerCase()} và hoàn thành {data.units.length} bài học này để đạt 90% tỉ lệ đỗ."
                  </p>
                </div>
                <Button variant="secondary" className="w-full bg-white text-foreground hover:bg-white/90 font-bold h-12 rounded-xl">
                  Nhận lộ trình cá nhân
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};
