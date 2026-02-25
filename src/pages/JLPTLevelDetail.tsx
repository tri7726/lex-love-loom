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
import { Navigation } from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// Mock data for units - in a real app, this would come from a DB
const levelData: Record<string, any> = {
  n5: {
    title: 'JLPT N5 - Sơ cấp 1',
    description: 'Hành trình bắt đầu từ những điều cơ bản nhất. Làm quen với bảng chữ cái và các mẫu câu sơ đẳng.',
    color: 'sakura',
    units: [
      {
        id: 1,
        title: 'Unit 1: Lời chào và Giới thiệu',
        description: 'Học cách chào hỏi, giới thiệu bản thân và người khác.',
        items: [
          { title: 'Từ vựng & Kanji', type: 'vocabulary', completed: true, link: '/vocabulary' },
          { title: 'Ngữ pháp: ~ wa ~ desu', type: 'grammar', completed: true, link: '/grammar' },
          { title: 'Luyện nghe: Giới thiệu', type: 'video', completed: false, link: '/video-learning' },
          { title: 'Bài tập Unit 1', type: 'quiz', completed: false, link: '/quiz' },
        ]
      },
      {
        id: 2,
        title: 'Unit 2: Đồ vật và Sở hữu',
        description: 'Học cách hỏi và trả lời về đồ vật, quyền sở hữu (kore, sore, are).',
        items: [
          { title: 'Từ vựng & Kanji', type: 'vocabulary', completed: false, link: '/vocabulary' },
          { title: 'Ngữ pháp: kore/sore/are', type: 'grammar', completed: false, link: '/grammar' },
          { title: 'Học qua video', type: 'video', completed: false, link: '/video-learning' },
          { title: 'Kiểm tra nhanh', type: 'quiz', completed: false, link: '/quiz' },
        ]
      },
      {
        id: 3,
        title: 'Unit 3: Địa điểm và Phương hướng',
        description: 'Hỏi đường, xác định vị trí của địa điểm (koko, soko, asoko).',
        items: [
          { title: 'Từ vựng chuyên đề', type: 'vocabulary', completed: false, link: '/vocabulary' },
          { title: 'Ngữ pháp: koko/soko/asoko', type: 'grammar', completed: false, link: '/grammar' },
          { title: 'Video thực tế', type: 'video', completed: false, link: '/video-learning' },
          { title: 'Quiz tổng hợp', type: 'quiz', completed: false, link: '/quiz' },
        ]
      }
    ]
  },
  n4: {
    title: 'JLPT N4 - Sơ cấp 2',
    description: 'Mở rộng vốn từ và ngữ pháp để giao tiếp tự nhiên hơn trong cuộc sống hàng ngày.',
    color: 'indigo',
    units: [
      {
        id: 1,
        title: 'Unit 1: Dự định và Kế hoạch',
        description: 'Nói về những việc sắp làm trong tương lai.',
        items: [
          { title: 'Từ vựng trình độ N4', type: 'vocabulary', completed: false, link: '/vocabulary' },
          { title: 'Ngữ pháp: ~ tsumori', type: 'grammar', completed: false, link: '/grammar' },
          { title: 'Video bài giảng', type: 'video', completed: false, link: '/video-learning' },
        ]
      }
    ]
  }
};

export const JLPTLevelDetail = () => {
  const { level } = useParams<{ level: string }>();
  const data = levelData[level?.toLowerCase() || 'n5'];
  
  if (!data) return <div>Cấp độ không tồn tại.</div>;

  const totalItems = data.units.reduce((acc: number, unit: any) => acc + unit.items.length, 0);
  const completedItems = data.units.reduce((acc: number, unit: any) => 
    acc + unit.items.filter((item: any) => item.completed).length, 0);
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
      <Navigation />
      
      <main className="container py-8 space-y-8">
        {/* Header & Progress */}
        <div className="space-y-4">
          <Link to="/learning-path">
            <Button variant="ghost" size="sm" className="gap-2 mb-2">
              <ChevronLeft className="h-4 w-4" />
              Quay lại lộ trình
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg bg-${data.color}/10 text-${data.color}`}>
                  {level?.toUpperCase()}
                </span>
                {data.title}
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                {data.description}
              </p>
            </div>
            
            <Card className="w-full md:w-64 border-primary/10">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>Tiến độ tổng thể</span>
                  <span>{Math.floor(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className={`h-2 bg-${data.color}/20`} />
                <p className="text-xs text-muted-foreground text-center">
                  Bạn đã hoàn thành {completedItems}/{totalItems} mục học tập
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Units Roadmap */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-primary" />
              Danh sách bài học
            </h2>
            
            <Accordion type="single" collapsible className="space-y-4 w-full" defaultValue="unit-1">
              {data.units.map((unit: any) => (
                <AccordionItem 
                  key={unit.id} 
                  value={`unit-${unit.id}`}
                  className="border rounded-xl bg-card overflow-hidden shadow-soft px-4 border-primary/5"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-4 text-left">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold bg-${data.color}/10 text-${data.color}`}>
                        {unit.id}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{unit.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{unit.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2">
                    <div className="grid gap-3">
                      {unit.items.map((item: any, idx: number) => (
                        <Link key={idx} to={`/learning-path/${level}/unit/${unit.id}`}>
                          <div className={`
                            group flex items-center justify-between p-3 rounded-lg border-2 transition-all
                            ${item.completed ? 'border-matcha/20 bg-matcha/5' : 'border-border hover:border-primary/30'}
                          `}>
                            <div className="flex items-center gap-3">
                              <div className={`
                                p-2 rounded-md
                                ${item.completed ? 'bg-matcha text-white' : 'bg-muted text-muted-foreground'}
                              `}>
                                {item.completed ? <CheckCircle2 className="h-4 w-4" /> : getIcon(item.type)}
                              </div>
                              <span className={`font-medium ${item.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {item.title}
                              </span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Tài liệu học tập</CardTitle>
                <CardDescription>Các công cụ hỗ trợ cho {level?.toUpperCase()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { title: 'Tài liệu nghe N5', icon: Video, color: 'text-sky-500', link: '/video-learning' },
                  { title: 'Luyện thi thử', icon: Trophy, color: 'text-gold', link: '/quiz' },
                  { title: 'Chat với AI Sensei', icon: Brain, color: 'text-matcha', link: '/ai-tutor' },
                ].map((tool, idx) => (
                  <Link key={idx} to={tool.link}>
                    <Button variant="outline" className="w-full justify-start gap-3 h-12 shadow-none">
                      <tool.icon className={`h-5 w-5 ${tool.color}`} />
                      {tool.title}
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-sakura to-sakura-dark text-white border-none shadow-elevated">
              <CardContent className="p-6 space-y-4">
                <div className="p-3 bg-white/20 rounded-xl w-fit">
                  <Star className="h-6 w-6 text-yellow-300 fill-yellow-300" />
                </div>
                <h3 className="text-xl font-bold">Mẹo học cấp tốc</h3>
                <p className="text-sm text-white/80">
                  Hãy tập trung hoàn thành 50 Kanji cơ bản trước khi chuyển qua Unit 4 để đạt kết quả tốt nhất.
                </p>
                <Button variant="secondary" className="w-full text-sakura font-bold">
                  Xem thêm
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};
