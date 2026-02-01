import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  Mic,
  Trophy,
  Sparkles,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import DailyPractice from '@/components/DailyPractice';
import { JapaneseText } from '@/components/JapaneseText';
import { AchievementBadge, achievements } from '@/components/StreakBadge';
import Leaderboard from '@/components/Leaderboard';
import { Link, useNavigate } from 'react-router-dom';

// Sample data
const dailyTasks = [
  {
    id: '1',
    type: 'vocabulary' as const,
    title: 'Learn 5 new words',
    description: 'Family vocabulary (N5)',
    progress: 2,
    total: 5,
    xp: 25,
    completed: false,
    estimatedTime: 5,
  },
  {
    id: '2',
    type: 'kanji' as const,
    title: 'Practice Kanji',
    description: '人, 母, 父',
    progress: 0,
    total: 3,
    xp: 30,
    completed: false,
    estimatedTime: 10,
  },
  {
    id: '3',
    type: 'quiz' as const,
    title: 'Daily Quiz',
    description: '10 questions on greetings',
    progress: 0,
    total: 10,
    xp: 50,
    completed: false,
    estimatedTime: 8,
  },
  {
    id: '4',
    type: 'pronunciation' as const,
    title: 'Pronunciation Practice',
    description: 'Practice 3 sentences',
    progress: 1,
    total: 3,
    xp: 20,
    completed: false,
    estimatedTime: 5,
  },
];

const leaderboardData = [
  { rank: 1, userId: '1', username: 'SakuraMaster', xp: 4520, streak: 45 },
  { rank: 2, userId: '2', username: 'KanjiKing', xp: 4210, streak: 32 },
  { rank: 3, userId: '3', username: 'NihongoNinja', xp: 3890, streak: 28 },
  { rank: 4, userId: '4', username: 'You', xp: 1250, streak: 7, isCurrentUser: true },
  { rank: 5, userId: '5', username: 'TokyoLearner', xp: 1100, streak: 12 },
];

const wordOfTheDay = {
  word: '頑張る',
  furigana: 'がんばる',
  meaning: 'to do one\'s best, to persevere',
  example: '毎日頑張っています。',
  exampleMeaning: 'I\'m doing my best every day.',
};

const Index = () => {
  const navigate = useNavigate();
  const [userStats] = useState({
    streak: 7,
    totalXp: 1250,
    wordsLearned: 156,
    quizzesCompleted: 23,
    level: 'N5',
    levelProgress: 65,
  });

  const handleStartTask = (taskId: string) => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return;

    switch (task.type) {
      case 'vocabulary':
        navigate('/vocabulary');
        break;
      case 'kanji':
        navigate('/flashcards');
        break;
      case 'quiz':
        navigate('/quiz');
        break;
      case 'pronunciation':
        navigate('/pronunciation');
        break;
      default:
        navigate('/vocabulary');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation streak={userStats.streak} xp={userStats.totalXp} />

      <main className="container py-6 space-y-6">
        {/* Welcome Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sakura-bg rounded-2xl p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
                Welcome back! 🌸
              </h1>
              <p className="text-muted-foreground">
                Ready to continue your Japanese journey?
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gradient-sakura">
                  {userStats.level}
                </p>
                <p className="text-xs text-muted-foreground">Current Level</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-gradient-gold">
                  {userStats.wordsLearned}
                </p>
                <p className="text-xs text-muted-foreground">Words Learned</p>
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to N4</span>
              <span className="font-medium">{userStats.levelProgress}%</span>
            </div>
            <div className="progress-sakura">
              <motion.div
                className="progress-sakura-fill"
                initial={{ width: 0 }}
                animate={{ width: `${userStats.levelProgress}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
          </div>
        </motion.section>

        {/* Word of the Day */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 border-gold/20 bg-gradient-to-br from-gold-light/10 to-transparent shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-gold" />
                Word of the Day
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
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Example:</p>
                  <p className="font-jp text-lg">{wordOfTheDay.example}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {wordOfTheDay.exampleMeaning}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily Practice - Takes 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <DailyPractice
              tasks={dailyTasks}
              onStartTask={handleStartTask}
              totalXpToday={75}
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
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-sakura/10 text-center">
                  <p className="text-2xl font-bold text-sakura">
                    {userStats.streak}
                  </p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
                <div className="p-3 rounded-lg bg-matcha/10 text-center">
                  <p className="text-2xl font-bold text-matcha">
                    {userStats.quizzesCompleted}
                  </p>
                  <p className="text-xs text-muted-foreground">Quizzes Done</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Practice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/flashcards">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-sakura" />
                      Flashcards
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
                      <Brain className="h-4 w-4 text-matcha" />
                      Quick Quiz
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/pronunciation">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                  >
                    <span className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-gold" />
                      Pronunciation
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Mini Leaderboard */}
            <Leaderboard entries={leaderboardData.slice(0, 5)} />
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
                  Achievements
                </CardTitle>
                <Link to="/achievements">
                  <Button variant="ghost" size="sm">
                    View All
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
      </main>
    </div>
  );
};

export default Index;
