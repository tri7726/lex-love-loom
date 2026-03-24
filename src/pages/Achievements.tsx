import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Flame, Target, Zap, Crown, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { AchievementBadge } from '@/components/StreakBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AchievementData {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

interface Stats {
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  flashcard_count: number;
  pronunciation_count: number;
}

export const Achievements = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const [profileRes, flashcardsRes, pronunciationRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('total_xp, current_streak, longest_streak')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('flashcards')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('pronunciation_results')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);

        const profile = profileRes.data;
        setStats({
          total_xp: profile?.total_xp ?? 0,
          current_streak: profile?.current_streak ?? 0,
          longest_streak: profile?.longest_streak ?? 0,
          flashcard_count: flashcardsRes.count ?? 0,
          pronunciation_count: pronunciationRes.count ?? 0,
        });
      } catch (err) {
        console.error('Error fetching achievement stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const buildAchievements = (s: Stats): AchievementData[] => [
    {
      id: 'first-lesson',
      icon: <Star className="h-5 w-5" />,
      title: 'First Steps',
      description: 'Complete your first lesson',
      unlocked: s.total_xp > 0,
      progress: s.total_xp > 0 ? undefined : 0,
      maxProgress: s.total_xp > 0 ? undefined : 1,
    },
    {
      id: 'week-streak',
      icon: <Flame className="h-5 w-5" />,
      title: 'On Fire',
      description: '7 day streak',
      unlocked: s.current_streak >= 7,
      progress: s.current_streak >= 7 ? undefined : s.current_streak,
      maxProgress: s.current_streak >= 7 ? undefined : 7,
    },
    {
      id: 'month-streak',
      icon: <Trophy className="h-5 w-5" />,
      title: 'Dedicated Learner',
      description: '30 day streak',
      unlocked: s.current_streak >= 30,
      progress: s.current_streak >= 30 ? undefined : s.current_streak,
      maxProgress: s.current_streak >= 30 ? undefined : 30,
    },
    {
      id: 'vocab-100',
      icon: <Target className="h-5 w-5" />,
      title: 'Vocabulary Master',
      description: 'Create 100 flashcards',
      unlocked: s.flashcard_count >= 100,
      progress: s.flashcard_count >= 100 ? undefined : s.flashcard_count,
      maxProgress: s.flashcard_count >= 100 ? undefined : 100,
    },
    {
      id: 'speaking-10',
      icon: <BookOpen className="h-5 w-5" />,
      title: 'Speaking Practice',
      description: 'Complete 10 pronunciation sessions',
      unlocked: s.pronunciation_count >= 10,
      progress: s.pronunciation_count >= 10 ? undefined : s.pronunciation_count,
      maxProgress: s.pronunciation_count >= 10 ? undefined : 10,
    },
    {
      id: 'xp-1000',
      icon: <Zap className="h-5 w-5" />,
      title: 'XP Hunter',
      description: 'Earn 1,000 XP',
      unlocked: s.total_xp >= 1000,
      progress: s.total_xp >= 1000 ? undefined : s.total_xp,
      maxProgress: s.total_xp >= 1000 ? undefined : 1000,
    },
    {
      id: 'xp-5000',
      icon: <Crown className="h-5 w-5" />,
      title: 'XP Legend',
      description: 'Earn 5,000 XP',
      unlocked: s.total_xp >= 5000,
      progress: s.total_xp >= 5000 ? undefined : s.total_xp,
      maxProgress: s.total_xp >= 5000 ? undefined : 5000,
    },
  ];

  const achievementList = stats ? buildAchievements(stats) : [];
  const unlockedCount = achievementList.filter((a) => a.unlocked).length;
  const totalCount = achievementList.length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-2">
            <Trophy className="h-8 w-8 text-gold" />
            Achievements
          </h1>
          <p className="text-muted-foreground">
            Track your progress and unlock badges
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 border-gold/30 bg-gradient-to-br from-gold-light/10 to-transparent">
            <CardContent className="p-6">
              {loading ? (
                <div className="flex justify-center py-2">
                  <span className="text-muted-foreground text-sm">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center justify-around text-center">
                  <div>
                    <p className="text-4xl font-bold text-gradient-gold">{unlockedCount}</p>
                    <p className="text-sm text-muted-foreground">Unlocked</p>
                  </div>
                  <div className="w-px h-12 bg-border" />
                  <div>
                    <p className="text-4xl font-bold text-muted-foreground">
                      {totalCount - unlockedCount}
                    </p>
                    <p className="text-sm text-muted-foreground">Locked</p>
                  </div>
                  <div className="w-px h-12 bg-border" />
                  <div>
                    <p className="text-4xl font-bold text-gradient-sakura">
                      {totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Complete</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievements Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>All Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-24 rounded-xl bg-muted/40 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievementList.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.07 }}
                    >
                      <AchievementBadge
                        icon={achievement.icon}
                        title={achievement.title}
                        description={achievement.description}
                        unlocked={achievement.unlocked}
                        progress={achievement.progress}
                        maxProgress={achievement.maxProgress}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};
