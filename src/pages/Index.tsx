import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  Trophy,
  Sparkles,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  Loader2,
  Book,
  Search,
  Settings,
  Target,
  Users,
  MessageSquare,
  Globe,
  CheckCircle2,
  Clock,
  Sword,
  Award,
  Zap,
  User,
  Video,
  FileText,
  Flame,
  Calendar,
  Gift,
  Timer
} from 'lucide-react';
import { DailyQuests } from '@/components/dashboard/DailyQuests';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { StreakReminderBanner } from '@/components/StreakReminderBanner';
import { DailyPractice } from '@/components/DailyPractice';
import { SkillHeatmap } from '@/components/analytics/SkillHeatmap';
import { JapaneseText } from '@/components/JapaneseText';
import { StreakBadge, AchievementBadge, achievements } from '@/components/StreakBadge';
import { Leaderboard } from '@/components/Leaderboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useNavigate } from 'react-router-dom';
import { SenseiInsights } from '@/components/dashboard/SenseiInsights';
import { useProfile } from '@/hooks/useProfile';
import { useWordHistory } from '@/hooks/useWordHistory';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useWritingLab } from '@/contexts/WritingLabContext';

import { MINNA_N5_VOCAB } from '@/data/minna-n5';

// Daily Tasks will now be calculated dynamically in the component

// Get Word of the Day dynamic based on date
const getWordOfTheDay = () => {
  const allWords = MINNA_N5_VOCAB.flat();
  if (allWords.length === 0) {
    return {
      word: '頑張る',
      furigana: 'がんばる',
      meaning: 'to do one\'s best, to persevere',
      example: '毎日頑張っています。',
      exampleMeaning: 'I\'m doing my best every day.',
    };
  }
  
  // Use current date as a seed for consistent daily selection
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const wordIndex = dayOfYear % allWords.length;
  const word = allWords[wordIndex];
  
  return {
    word: word.word,
    furigana: word.reading || '',
    meaning: word.meaning,
    example: word.example_sentence || null,
    exampleMeaning: word.example_translation || null,
  };
};

const wordOfTheDay = getWordOfTheDay();

export const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openWritingLab } = useWritingLab();
  const { profile, loading: profileLoading, updateStreak } = useProfile();
  const { history, isLoading: historyLoading } = useWordHistory();
  const [leaderboard, setLeaderboard] = React.useState<{ rank: number; userId: string; username: string; xp: number; streak: number; avatar?: string; isCurrentUser: boolean }[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = React.useState(true);
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [loadingDue, setLoadingDue] = useState(false);
  const [writingRecs, setWritingRecs] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const fetchDueCards = useCallback(async () => {
    if (!user) return;
    setLoadingDue(true);
    const { data } = await (supabase as any)
      .from('flashcards')
      .select('id, word, reading, meaning')
      .eq('user_id', user.id)
      .lte('next_review_date', new Date().toISOString())
      .limit(5);
    setDueCards(data || []);
    setLoadingDue(false);
  }, [user]);

  const fetchWritingRecommendations = useCallback(async () => {
    if (!user) return;
    setLoadingRecs(true);
    // Find Kanji/Words with low ease factor (struggling)
    const { data } = await (supabase as any)
      .from('flashcards')
      .select('id, word, reading, meaning, ease_factor')
      .eq('user_id', user.id)
      .lt('ease_factor', 2.0)
      .limit(3);
    setWritingRecs(data || []);
    setLoadingRecs(false);
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, total_xp, current_streak, avatar_url')
        .order('total_xp', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      const formatted = (data || []).map((p, i) => ({
        rank: i + 1,
        userId: p.user_id,
        username: p.display_name || 'Anonymous',
        xp: p.total_xp || 0,
        streak: p.current_streak || 0,
        avatar: p.avatar_url || undefined,
        isCurrentUser: p.user_id === user?.id
      }));

      setLeaderboard(formatted);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      updateStreak();
      fetchLeaderboard();
      fetchDueCards();
      fetchWritingRecommendations();
    }
  }, [user?.id]); // Only run on login or user change

  const userStats = useMemo(() => {
    if (!profile) return {
      streak: 0,
      totalXp: 0,
      wordsLearned: 0,
      quizzesCompleted: 0,
      level: 'N5',
      levelProgress: 0,
      jlptProgress: {
        N5: 45, // Demo values
        N4: 12,
        N3: 0,
      }
    };

    return {
      streak: profile.current_streak || 0,
      totalXp: profile.total_xp || 0,
      wordsLearned: history.length,
      quizzesCompleted: 0,
      level: profile.jlpt_level || 'N5',
      levelProgress: ((profile.total_xp || 0) % 1000) / 10,
      jlptProgress: {
        N5: Math.min(100, ((profile.total_xp || 0) / 1000) * 100),
        N4: Math.max(0, Math.min(100, (((profile.total_xp || 0) - 1000) / 2000) * 100)),
        N3: 0,
      }
    };
  }, [profile, history]);

  const dynamicTasks = useMemo(() => {
    const tasks = [];
    
    if (dueCards.length > 0) {
      tasks.push({
        id: 'srs-review',
        type: 'vocabulary' as const,
        title: 'Ôn tập định kỳ',
        description: `${dueCards.length} từ vựng cần ôn tập ngay`,
        progress: 0,
        total: dueCards.length,
        xp: dueCards.length * 10,
        completed: false,
        estimatedTime: Math.ceil(dueCards.length * 0.5),
      });
    }

    if (writingRecs.length > 0) {
      tasks.push({
        id: 'kanji-writing',
        type: 'kanji' as const,
        title: 'Luyện viết Kanji',
        description: `Luyện lại ${writingRecs.map(r => r.word).join(', ')}`,
        progress: 0,
        total: writingRecs.length,
        xp: 30,
        completed: false,
        estimatedTime: 10,
      });
    }

    // Add default tasks if list is short
    if (tasks.length < 3) {
      tasks.push({
        id: 'ai-chat',
        type: 'quiz' as const,
        title: 'Hội thoại với Sensei',
        description: 'Luyện tập giao tiếp tự do 5 phút',
        progress: 0,
        total: 1,
        xp: 50,
        completed: false,
        estimatedTime: 5,
      });
    }

    return tasks;
  }, [dueCards, writingRecs]);

  const handleStartTask = (taskId: string) => {
    switch (taskId) {
      case 'srs-review':
        navigate('/vocabulary');
        break;
      case 'kanji-writing':
        if (writingRecs.length > 0) openWritingLab(writingRecs[0].word);
        break;
      case 'ai-chat':
        navigate('/sensei');
        break;
      default:
        navigate('/');
    }
  };

  if (profileLoading || historyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
      <motion.main 
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        initial="hidden"
        animate="show"
        className="container py-8 space-y-8"
      >
        {/* Streak Reminder */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <StreakReminderBanner />
        </motion.div>

        {/* ⚡ Quick 5 Banner */}
        <motion.section
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
        >
          <Link to="/quick">
            <div className="relative overflow-hidden rounded-3xl p-5 flex items-center gap-5 cursor-pointer group shadow-soft hover:shadow-elevated transition-shadow"
                 style={{ background: 'var(--gradient-sakura)' }}>
              {/* BG decoration */}
              <div className="absolute right-0 top-0 bottom-0 w-32 opacity-10 flex items-center justify-center">
                <Zap className="h-24 w-24 text-white" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-black text-white text-sm">Quick 5 ⚡</p>
                <p className="text-white/80 text-[10px] font-medium">5 câu hỏi xen kẽ · ~3 phút · Nhận XP ngay</p>
              </div>
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-xl group-hover:bg-white/30 transition-colors flex-shrink-0">
                <span className="text-white text-[10px] font-black uppercase tracking-wider">Bắt đầu</span>
                <ArrowRight className="h-3 w-3 text-white" />
              </div>
            </div>
          </Link>
        </motion.section>

        <motion.section
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          className="sakura-bg rounded-[2.5rem] p-8 md:p-10 border border-sakura-light/50 shadow-card"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
                Chào mừng trở lại! 🌸
              </h1>
              <p className="text-muted-foreground mb-6">
                Bạn đang đạt cấp độ <strong>{userStats.level}</strong>. Hãy tiếp tục lộ trình chinh phục JLPT nhé!
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                  { level: 'N5', progress: userStats.jlptProgress.N5, color: 'bg-sakura' },
                  { level: 'N4', progress: userStats.jlptProgress.N4, color: 'bg-indigo-jp' },
                  { level: 'N3', progress: userStats.jlptProgress.N3 || 0, color: 'bg-matcha' },
                  { level: 'N2', progress: 0, color: 'bg-crimson' },
                  { level: 'N1', progress: 0, color: 'bg-sumi/80' },
                ].map((item) => (
                  <Link key={item.level} to={`/learning-path/${item.level.toLowerCase()}`} className="group block space-y-1">
                    <div className="flex justify-between text-[10px] items-end px-1 font-bold">
                      <span>{item.level}</span>
                      <span className="text-muted-foreground opacity-70">{Math.floor(item.progress)}%</span>
                    </div>
                    <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full", item.color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6 bg-background/40 p-6 rounded-xl backdrop-blur-sm self-start">
              <div className="text-center">
                <p className="text-4xl font-bold text-gradient-sakura">
                  {userStats.streak}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Chuỗi ngày</p>
              </div>
              <div className="w-px h-12 bg-border/50" />
              <div className="text-center">
                <p className="text-4xl font-bold text-gradient-gold">
                  {userStats.wordsLearned}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Từ đã học</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Sensei Intelligence Insights */}
        {user?.id && (
          <motion.section
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          >
            <SenseiInsights userId={user.id} />
          </motion.section>
        )}

        {/* Word of the Day */}
        <motion.section
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
        >
          <Card className="border-2 border-gold/20 bg-gradient-to-br from-gold-light/10 to-transparent shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-gold" />
                Từ vựng của ngày
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <JapaneseText
                    text={wordOfTheDay.word}
                    furigana={wordOfTheDay.furigana}
                    meaning={wordOfTheDay.meaning}
                    size="lg"
                  />
                  <p className="text-lg font-medium">{wordOfTheDay.meaning}</p>
                </div>
                {wordOfTheDay.example && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Ví dụ:</p>
                    <p className="font-jp text-lg">{wordOfTheDay.example}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {wordOfTheDay.exampleMeaning}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* SRS Review Section */}
        {dueCards.length > 0 && (
          <motion.section
            variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Brain className="h-5 w-5 text-sakura" />
                Cần ôn tập ngay ({dueCards.length})
              </h2>
              <Link to="/vocabulary">
                <Button variant="ghost" size="sm" className="text-sakura font-bold text-xs uppercase tracking-widest gap-1">
                  Ôn tập tất cả <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {dueCards.map((card) => (
                <Card 
                  key={card.id} 
                  className="border-sakura/20 bg-sakura-light/5 hover:bg-sakura/5 transition-colors cursor-pointer group"
                  onClick={() => navigate('/vocabulary')}
                >
                  <CardContent className="p-4 text-center space-y-1">
                    <p className="font-jp text-lg font-bold group-hover:text-sakura transition-colors">{card.word}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{card.meaning}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>
        )}

        {/* AI Writing Recommendations */}
        {writingRecs.length > 0 && (
          <motion.section
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            className="p-8 rounded-[3rem] bg-gradient-to-br from-indigo-jp/5 to-sakura-light/10 border-2 border-indigo-jp/20 shadow-soft"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h2 className="text-xl font-black flex items-center gap-2 text-indigo-jp">
                  <Sparkles className="h-5 w-5" />
                  Gợi ý Luyện viết AI
                </h2>
                <p className="text-xs text-muted-foreground font-medium">Bạn đang gặp khó khăn với các chữ này. Luyện viết ngay để nhớ lâu hơn!</p>
              </div>
              <Badge className="bg-indigo-jp text-white uppercase tracking-widest text-[9px] px-3">Priority</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {writingRecs.map((rec) => (
                <div 
                  key={rec.id} 
                  className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-indigo-jp/10 flex items-center justify-between group hover:border-indigo-jp/30 transition-all cursor-pointer"
                  onClick={() => openWritingLab(rec.word)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-indigo-jp/5 flex items-center justify-center font-jp text-3xl font-black text-indigo-jp">
                      {rec.word[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{rec.word}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{rec.reading}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-full group-hover:bg-indigo-jp group-hover:text-white transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Advanced AI Tools Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6 !mt-12"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Công cụ AI nâng cao
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Link to="/sensei?mode=roleplay">
              <Card className="group overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all hover:shadow-elevated bg-card/60">
                <CardContent className="p-0 flex flex-col sm:flex-row h-full">
                  <div className="sm:w-1/3 relative h-40 sm:h-auto overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop" 
                      alt="AI Roleplay" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                  <div className="p-6 flex-1 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        AI Roleplay Studio
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Nhập vai vào các tình huống thực tế tại Nhật Bản. Luyện tập phản xạ giao tiếp tự nhiên với Sensei.
                      </p>
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto font-bold text-xs uppercase tracking-widest gap-2">
                      Bắt đầu ngay <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/news">
              <Card className="group overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all hover:shadow-elevated bg-card/60">
                <CardContent className="p-0 flex flex-col sm:flex-row h-full">
                  <div className="sm:w-1/3 relative h-40 sm:h-auto overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop" 
                      alt="Japanese News" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                  <div className="p-6 flex-1 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Globe className="h-5 w-5 text-indigo-jp" />
                        Tin tức thời gian thực
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Cập nhật tin tức Nhật Bản phiên bản dễ nghe, đọc. Vừa học từ vựng vừa nắm bắt tình hình thế giới.
                      </p>
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto font-bold text-xs uppercase tracking-widest gap-2">
                      Đọc tin tức <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </motion.section>

        {/* Social Activity Section */}
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between px-1 border-l-4 border-primary pl-4">
            <h2 className="text-2xl font-display font-bold">Cộng đồng & Mục tiêu</h2>
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">Social Hub</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <DailyQuests />
            
            <Card className="lg:col-span-2 border-2 border-primary/20 bg-card/40 backdrop-blur-sm shadow-soft overflow-hidden flex flex-col group transition-all hover:bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Hoạt động học tập
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <SkillHeatmap />
              </CardContent>
            </Card>

            <Card className="border-2 border-gold/20 bg-card/40 backdrop-blur-sm shadow-soft overflow-hidden flex flex-col group hover:shadow-elevated transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-gold" />
                  Bảng xếp hạng
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="text-center py-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Hạng hiện tại</p>
                  <p className="text-4xl font-black text-gold">#4</p>
                  <Badge className="bg-slate-400 mt-2 text-[10px] font-bold">GIẢI BẠC</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Lên TOP 3</span>
                    <span className="text-primary font-black">+250 XP</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '75%' }} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 border-t border-border/50 mt-auto">
                <Link to="/leagues" className="w-full">
                  <Button variant="ghost" className="w-full text-xs font-bold gap-2 hover:bg-gold/5">
                    Ghé thăm League <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-2 border-primary/10 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col transition-all hover:bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Hoạt động Squad
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <div className="divide-y divide-border/50">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-3 items-start p-4 hover:bg-muted/30 transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold leading-none">N3 Warriors</p>
                        <p className="text-[10px] text-muted-foreground leading-snug tracking-tight">Vũ Hải vừa cộng thêm 500 XP cho mục tiêu chung!</p>
                        <p className="text-[9px] text-muted-foreground/60 uppercase">10 phút trước</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pt-0 border-t border-border/50">
                <Link to="/squads" className="w-full pt-4">
                  <Button variant="ghost" className="w-full text-xs font-bold gap-2 hover:bg-primary/5">
                    Quản lý Squad <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="border-2 border-secondary/10 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col transition-all hover:bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-secondary" />
                  Bạn bè
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-6 pt-4">
                <div className="flex -space-x-3 overflow-hidden justify-center py-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Avatar key={i} className="inline-block h-12 w-12 rounded-2xl ring-4 ring-background shadow-md">
                      <AvatarFallback className="text-xs bg-secondary/10 text-secondary font-bold">U{i}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Bạn đang theo dõi <strong>16 người</strong></p>
                  <p className="text-xs text-muted-foreground">Có <span className="text-green-500 font-bold">3 người</span> đang trực tuyến học tập.</p>
                </div>
              </CardContent>
              <CardFooter className="pt-0 border-t border-border/50">
                <Link to="/friends" className="w-full pt-4">
                  <Button variant="ghost" className="w-full text-xs font-bold gap-2 hover:bg-secondary/5">
                    Quản lý bạn bè <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily Practice - Takes 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            <DailyPractice
              tasks={dynamicTasks}
              onStartTask={handleStartTask}
              totalXpToday={0}
              dailyGoal={100}
            />
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Quick Stats */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-matcha" />
                  Thống kê của bạn
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-sakura/10 text-center">
                  <p className="text-2xl font-bold text-sakura">
                    {userStats.streak}
                  </p>
                  <p className="text-xs text-muted-foreground">Ngày liên tiếp</p>
                </div>
                <div className="p-3 rounded-lg bg-matcha/10 text-center">
                  <p className="text-2xl font-bold text-matcha">
                    {userStats.quizzesCompleted}
                  </p>
                  <p className="text-xs text-muted-foreground">Bài tập đã làm</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Luyện tập nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/vocabulary">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-sakura" />
                      Từ vựng
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/reading">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                  >
                    <span className="flex items-center gap-2">
                      <Book className="h-4 w-4 text-indigo-500" />
                      Luyện đọc
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/video-learning">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                  >
                    <span className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-sky-500" />
                      Học qua Video
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/sensei">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                  >
                    <span className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-matcha" />
                      Sensei Hub
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/quiz">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-gold" />
                      Kiểm tra nhanh
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Tiện ích section */}
            <Card className="shadow-card overflow-hidden border-sakura/20">
              <CardHeader className="pb-2 bg-sakura/5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-sakura" />
                  Tiện ích VIP
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <Link to="/kanji-worksheet">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-4 rounded-xl border-dashed border-sakura/30 hover:bg-sakura/5 hover:border-sakura transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-sakura/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-sakura" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm">Tạo Tập viết Kanji</p>
                        <p className="text-[10px] text-muted-foreground">Xuất PDF Worksheet VIP</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Mini Leaderboard */}
            {leaderboardLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Leaderboard entries={leaderboard} />
            )}
          </motion.div>
        </div>

        {/* Achievements Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-gold" />
                  Thành tích
                </CardTitle>
                <Link to="/achievements">
                  <Button variant="ghost" size="sm">
                    Xem tất cả
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.slice(0, 3).map((achievement, index) => (
                  <AchievementBadge
                    key={achievement.id}
                    icon={achievement.icon}
                    title={achievement.title}
                    description={achievement.description}
                    unlocked={index < 2}
                    progress={index === 2 ? 45 : undefined}
                    maxProgress={index === 2 ? 100 : undefined}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </motion.main>
  );
};


// export default Index;
