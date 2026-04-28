import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { StreakReminderBanner } from '@/components/StreakReminderBanner';
import { DailyPractice } from '@/components/DailyPractice';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';
import { WelcomeHero, QuickModeBanner } from '@/components/dashboard';
import { SkeletonHero, SkeletonWordOfTheDay, SkeletonCard, SkeletonSidebar } from '@/components/dashboard/Skeletons';
import { useProfile } from '@/hooks/useProfile';
import { useWordHistory } from '@/hooks/useWordHistory';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useWritingLab } from '@/contexts/WritingLabContext';
import { supabase } from '@/integrations/supabase/client';

// Lazy-loaded below-fold components
const WordOfTheDay = lazy(() => import('@/components/dashboard/WordOfTheDay').then(m => ({ default: m.WordOfTheDay })));
const ReviewPreview = lazy(() => import('@/components/dashboard/ReviewPreview').then(m => ({ default: m.ReviewPreview })));
const WritingRecs = lazy(() => import('@/components/dashboard/WritingRecs').then(m => ({ default: m.WritingRecs })));
const AIToolsGrid = lazy(() => import('@/components/dashboard/AIToolsGrid').then(m => ({ default: m.AIToolsGrid })));
const SocialSummary = lazy(() => import('@/components/dashboard/SocialSummary').then(m => ({ default: m.SocialSummary })));
const DashboardSidebar = lazy(() => import('@/components/dashboard/DashboardSidebar').then(m => ({ default: m.DashboardSidebar })));
const AchievementsSection = lazy(() => import('@/components/dashboard/AchievementsSection').then(m => ({ default: m.AchievementsSection })));
const SenseiInsights = lazy(() => import('@/components/dashboard/SenseiInsights').then(m => ({ default: m.SenseiInsights })));
const EvolvedSkillsSection = lazy(() => import('@/components/dashboard/EvolvedSkillsSection').then(m => ({ default: m.EvolvedSkillsSection })));

function SuspenseFallback({ type }: { type?: 'hero' | 'word' | 'card' | 'sidebar' }) {
  switch (type) {
    case 'hero': return <SkeletonHero />;
    case 'word': return <SkeletonWordOfTheDay />;
    case 'sidebar': return <SkeletonSidebar />;
    default: return <SkeletonCard />;
  }
}

export const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openWritingLab } = useWritingLab();
  const { profile, loading: profileLoading, updateStreak } = useProfile();
  const { history, isLoading: historyLoading } = useWordHistory();
  const { friends } = useFriends();

  const [leaderboard, setLeaderboard] = useState<
    { rank: number; userId: string; username: string; xp: number; streak: number; avatar?: string; isCurrentUser: boolean }[]
  >([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [dueCount, setDueCount] = useState(0);
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [writingRecs, setWritingRecs] = useState<any[]>([]);
  const [todayXP, setTodayXP] = useState(0);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchDueCards = useCallback(async () => {
    if (!user) return;
    const { data: countData } = await supabase.rpc('get_due_flashcards_count', { user_uuid: user.id });
    setDueCount(countData || 0);
    const { data } = await (supabase as any)
      .from('flashcards')
      .select('id, word, reading, meaning')
      .eq('user_id', user.id)
      .lte('next_review_date', new Date().toISOString())
      .limit(5);
    setDueCards(data || []);
  }, [user]);

  const fetchWritingRecommendations = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('flashcards')
      .select('id, word, reading, meaning, ease_factor')
      .eq('user_id', user.id)
      .lt('ease_factor', 2.0)
      .limit(3);
    setWritingRecs(data || []);
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, total_xp, current_streak, avatar_url')
        .order('total_xp', { ascending: false })
        .limit(5);
      if (error) throw error;
      setLeaderboard(
        (data || []).map((p, i) => ({
          rank: i + 1,
          userId: p.user_id,
          username: p.display_name || 'Anonymous',
          xp: p.total_xp || 0,
          streak: p.current_streak || 0,
          avatar: p.avatar_url || undefined,
          isCurrentUser: p.user_id === user?.id,
        }))
      );
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
      const today = new Date().toISOString().split('T')[0];
      (supabase as any)
        .from('xp_events')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .then(({ data }: { data: { amount: number }[] | null }) => {
          setTodayXP((data || []).reduce((acc, e) => acc + (e.amount || 0), 0));
        });
    }
  }, [user?.id]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const dynamicTasks = useMemo(() => {
    const tasks: any[] = [];
    if (dueCount > 0) {
      tasks.push({
        id: 'srs-review',
        type: 'vocabulary' as const,
        title: 'Ôn tập định kỳ',
        description: `${dueCount} thẻ vựng đang chờ bạn ôn tập`,
        progress: 0, total: dueCount, xp: Math.min(dueCount * 5, 200), completed: false, estimatedTime: Math.ceil(dueCount * 0.2),
      });
    }
    if (writingRecs.length > 0) {
      tasks.push({
        id: 'kanji-writing',
        type: 'kanji' as const,
        title: 'Luyện viết Kanji',
        description: `Luyện lại ${writingRecs.map(r => r.word).join(', ')}`,
        progress: 0, total: writingRecs.length, xp: 30, completed: false, estimatedTime: 10,
      });
    }
    if (tasks.length < 3) {
      tasks.push({
        id: 'ai-chat',
        type: 'quiz' as const,
        title: 'Hội thoại với Sensei',
        description: 'Luyện tập giao tiếp tự do 5 phút',
        progress: 0, total: 1, xp: 50, completed: false, estimatedTime: 5,
      });
    }
    return tasks;
  }, [dueCount, writingRecs]);

  const handleStartTask = useCallback((taskId: string) => {
    switch (taskId) {
      case 'srs-review': navigate('/review'); break;
      case 'kanji-writing': if (writingRecs.length > 0) openWritingLab(writingRecs[0].word); break;
      case 'ai-chat': navigate('/sensei'); break;
    }
  }, [navigate, writingRecs, openWritingLab]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (profileLoading || historyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.main
      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
      initial="hidden"
      animate="show"
      className="py-8 space-y-10"
    >
      <StreakReminderBanner />
      <QuickModeBanner />

      <SectionErrorBoundary name="WelcomeHero">
        <WelcomeHero profile={profile} history={history} />
      </SectionErrorBoundary>

      {user?.id && (
        <Suspense fallback={<SuspenseFallback type="card" />}>
          <SectionErrorBoundary name="SenseiInsights">
            <SenseiInsights userId={user.id} />
          </SectionErrorBoundary>
        </Suspense>
      )}
      {user?.id && (
        <Suspense fallback={<SuspenseFallback type="card" />}>
          <SectionErrorBoundary name="EvolvedSkills">
            <EvolvedSkillsSection />
          </SectionErrorBoundary>
        </Suspense>
      )}

      <Suspense fallback={<SuspenseFallback type="word" />}>
        <SectionErrorBoundary name="WordOfTheDay"><WordOfTheDay /></SectionErrorBoundary>
      </Suspense>

      <Suspense fallback={<SuspenseFallback type="card" />}>
        <SectionErrorBoundary name="ReviewPreview">
          <ReviewPreview dueCards={dueCards} dueCount={dueCount} />
        </SectionErrorBoundary>
      </Suspense>

      <Suspense fallback={<SuspenseFallback type="card" />}>
        <SectionErrorBoundary name="WritingRecs">
          <WritingRecs writingRecs={writingRecs} onStartWriting={openWritingLab} />
        </SectionErrorBoundary>
      </Suspense>

      <Suspense fallback={<SuspenseFallback type="card" />}>
        <SectionErrorBoundary name="AIToolsGrid"><AIToolsGrid /></SectionErrorBoundary>
      </Suspense>

      <Suspense fallback={<SuspenseFallback type="card" />}>
        <SectionErrorBoundary name="SocialSummary">
          <SocialSummary leaderboard={leaderboard} leaderboardLoading={leaderboardLoading} friends={friends} />
        </SectionErrorBoundary>
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionErrorBoundary name="DailyPractice">
            <DailyPractice tasks={dynamicTasks} onStartTask={handleStartTask} totalXpToday={todayXP} dailyGoal={100} />
          </SectionErrorBoundary>
        </div>
        <Suspense fallback={<SuspenseFallback type="sidebar" />}>
          <SectionErrorBoundary name="DashboardSidebar">
            <DashboardSidebar
              streak={profile?.current_streak ?? 0}
              quizzesCompleted={0}
              leaderboard={leaderboard}
              leaderboardLoading={leaderboardLoading}
            />
          </SectionErrorBoundary>
        </Suspense>
      </div>

      <Suspense fallback={<SuspenseFallback type="card" />}>
        <SectionErrorBoundary name="AchievementsSection"><AchievementsSection /></SectionErrorBoundary>
      </Suspense>
    </motion.main>
  );
};

