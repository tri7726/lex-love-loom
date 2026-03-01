import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  ChevronRight, 
  Map as MapIcon, 
  Lock, 
  Trophy,
  Star,
  Zap,
  Book,
  Video,
  BookMarked,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const levels = [
  {
    level: 'N5',
    title: 'Sơ cấp 1',
    description: 'Bắt đầu hành trình với những kiến thức nền tảng nhất.',
    lessons: 25,
    vocabulary: 800,
    kanji: 100,
    progress: 45,
    unlocked: true,
    color: 'sakura',
    gradient: 'from-sakura/20 to-sakura/5',
  },
  {
    level: 'N4',
    title: 'Sơ cấp 2',
    description: 'Nâng cao khả năng giao tiếp và đọc hiểu cơ bản.',
    lessons: 25,
    vocabulary: 1500,
    kanji: 300,
    progress: 12,
    unlocked: true,
    color: 'indigo',
    gradient: 'from-indigo/20 to-indigo/5',
  },
  {
    level: 'N3',
    title: 'Trung cấp',
    description: 'Cầu nối quan trọng để tiến tới tiếng Nhật chuyên sâu.',
    lessons: 20,
    vocabulary: 3000,
    kanji: 600,
    progress: 0,
    unlocked: true,
    color: 'matcha',
    gradient: 'from-matcha/20 to-matcha/5',
  },
  {
    level: 'N2',
    title: 'Thượng cấp 1',
    description: 'Làm chủ tiếng Nhật trong công việc và đời sống phức tạp.',
    lessons: 15,
    vocabulary: 6000,
    kanji: 1000,
    progress: 0,
    unlocked: true,
    color: 'gold',
    gradient: 'from-gold/20 to-gold/5',
  },
  {
    level: 'N1',
    title: 'Thượng cấp 2',
    description: 'Trình độ cao nhất, thông thạo tiếng Nhật như người bản xứ.',
    lessons: 10,
    vocabulary: 10000,
    kanji: 2000,
    progress: 0,
    unlocked: true,
    color: 'crimson',
    gradient: 'from-crimson/20 to-crimson/5',
  }
];

export const JLPTPortal = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <main className="container py-10 space-y-10">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
          >
            <MapIcon className="h-4 w-4" />
            Lộ trình học tập cá nhân hóa
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold tracking-tight"
          >
            Chinh phục <span className="text-primary">JLPT</span> theo cách của bạn
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Chọn cấp độ mục tiêu và bắt đầu lộ trình học tập bài bản từ từ vựng, ngữ pháp đến luyện đọc và video.
          </motion.p>
        </section>

        {/* Levels Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {levels.map((lvl, index) => (
            <motion.div
              key={lvl.level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
            >
              <Card className={`overflow-hidden h-full border-2 transition-all hover:shadow-elevated group ${lvl.unlocked ? 'border-primary/10' : 'opacity-80 grayscale-[0.5]'}`}>
                <div className={`h-24 bg-gradient-to-br ${lvl.gradient} flex items-center justify-between px-6`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-background flex items-center justify-center text-2xl font-bold shadow-soft text-${lvl.color}`}>
                      {lvl.level}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{lvl.title}</h3>
                      <Badge variant="secondary" className="bg-background/50 backdrop-blur-sm">
                        {lvl.lessons} Bài học
                      </Badge>
                    </div>
                  </div>
                  {!lvl.unlocked && <Lock className="h-6 w-6 text-muted-foreground" />}
                </div>
                
                <CardContent className="p-6 space-y-6">
                  <p className="text-muted-foreground min-h-[3rem]">
                    {lvl.description}
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 py-2">
                    <div className="text-center">
                      <p className="text-lg font-bold">{lvl.vocabulary}+</p>
                      <p className="text-xs text-muted-foreground uppercase">Từ vựng</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{lvl.kanji}+</p>
                      <p className="text-xs text-muted-foreground uppercase">Kanji</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">10+</p>
                      <p className="text-xs text-muted-foreground uppercase">Mock Test</p>
                    </div>
                  </div>

                  {lvl.unlocked ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tiến độ hoàn thành</span>
                          <span className="font-bold">{lvl.progress}%</span>
                        </div>
                        <Progress value={lvl.progress} className={`h-2 bg-${lvl.color}/20`} />
                      </div>
                      <Link to={`/learning-path/${lvl.level.toLowerCase()}`}>
                        <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                          Tiếp tục học tập
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" disabled>
                      <Lock className="h-4 w-4" />
                      Chưa mở khóa
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Categories Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Luyện tập theo kỹ năng</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: 'Ngữ pháp', icon: BookMarked, color: 'bg-sakura/10 text-sakura', link: '/grammar' },
              { title: 'Hán tự', icon: Layers, color: 'bg-indigo/10 text-indigo', link: '/vocabulary' },
              { title: 'Luyện nghe', icon: Video, color: 'bg-sky-500/10 text-sky-500', link: '/video-learning' },
              { title: 'Đọc hiểu', icon: Book, color: 'bg-gold/10 text-gold', link: '/reading' },
            ].map((skill, idx) => (
              <Link key={idx} to={skill.link}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                    <div className={`p-3 rounded-full ${skill.color} group-hover:scale-110 transition-transform`}>
                      <skill.icon className="h-6 w-6" />
                    </div>
                    <span className="font-bold">{skill.title}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
