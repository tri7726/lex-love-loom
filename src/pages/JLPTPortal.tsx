import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Map as MapIcon,
  Lock,
  Book,
  Video,
  BookMarked,
  Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LEVEL_VOCAB: Record<string, number> = {
  N5: 800,
  N4: 1500,
  N3: 3000,
  N2: 6000,
  N1: 10000,
};

const LEVEL_META = [
  {
    level: 'N5',
    title: 'Sơ cấp 1',
    description: 'Bắt đầu hành trình với những kiến thức nền tảng nhất.',
    lessons: 25,
    kanji: 100,
    color: 'sakura',
    gradient: 'from-sakura/20 to-sakura/5',
  },
  {
    level: 'N4',
    title: 'Sơ cấp 2',
    description: 'Nâng cao khả năng giao tiếp và đọc hiểu cơ bản.',
    lessons: 25,
    kanji: 300,
    color: 'indigo',
    gradient: 'from-indigo/20 to-indigo/5',
  },
  {
    level: 'N3',
    title: 'Trung cấp',
    description: 'Cầu nối quan trọng để tiến tới tiếng Nhật chuyên sâu.',
    lessons: 20,
    kanji: 600,
    color: 'matcha',
    gradient: 'from-matcha/20 to-matcha/5',
  },
  {
    level: 'N2',
    title: 'Thượng cấp 1',
    description: 'Làm chủ tiếng Nhật trong công việc và đời sống phức tạp.',
    lessons: 15,
    kanji: 1000,
    color: 'gold',
    gradient: 'from-gold/20 to-gold/5',
  },
  {
    level: 'N1',
    title: 'Thượng cấp 2',
    description: 'Trình độ cao nhất, thông thạo tiếng Nhật như người bản xứ.',
    lessons: 10,
    kanji: 2000,
    color: 'crimson',
    gradient: 'from-crimson/20 to-crimson/5',
  },
];

export const JLPTPortal = () => {
  const { user } = useAuth();
  const [flashcardCounts, setFlashcardCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch flashcard counts per jlpt_level for this user
        const { data: flashcards } = await supabase
          .from('flashcards')
          .select('jlpt_level')
          .eq('user_id', user.id);

        const counts: Record<string, number> = {};
        if (flashcards) {
          for (const row of flashcards) {
            const lvl = (row as any).jlpt_level as string;
            if (lvl) counts[lvl] = (counts[lvl] ?? 0) + 1;
          }
        }
        setFlashcardCounts(counts);
      } catch (err) {
        console.error('JLPTPortal fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getProgress = (level: string) => {
    const total = LEVEL_VOCAB[level] ?? 1;
    const learned = flashcardCounts[level] ?? 0;
    return Math.min(Math.round((learned / total) * 100), 100);
  };

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
          {LEVEL_META.map((lvl, index) => {
            const progress = getProgress(lvl.level);
            const learned = flashcardCounts[lvl.level] ?? 0;
            const total = LEVEL_VOCAB[lvl.level];

            return (
              <motion.div
                key={lvl.level}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                <Card className="overflow-hidden h-full border-2 border-primary/10 transition-all hover:shadow-elevated group">
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
                  </div>

                  <CardContent className="p-6 space-y-6">
                    <p className="text-muted-foreground min-h-[3rem]">{lvl.description}</p>

                    <div className="grid grid-cols-3 gap-4 py-2">
                      <div className="text-center">
                        <p className="text-lg font-bold">{total}+</p>
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

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {loading ? 'Đang tải...' : `${learned} / ${total} từ đã học`}
                          </span>
                          <span className="font-bold">{loading ? '—' : `${progress}%`}</span>
                        </div>
                        <Progress
                          value={loading ? 0 : progress}
                          className={`h-2 bg-${lvl.color}/20`}
                        />
                      </div>
                      <Link to={`/learning-path/${lvl.level.toLowerCase()}`}>
                        <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                          Tiếp tục học tập
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
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
