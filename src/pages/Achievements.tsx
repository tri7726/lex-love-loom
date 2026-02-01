import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import { AchievementBadge, achievements } from '@/components/StreakBadge';

const Achievements = () => {
  // Simulate unlocked achievements (first 3 are unlocked)
  const unlockedIds = ['first-lesson', 'week-streak'];

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
              <div className="flex items-center justify-around text-center">
                <div>
                  <p className="text-4xl font-bold text-gradient-gold">
                    {unlockedIds.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Unlocked</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <p className="text-4xl font-bold text-muted-foreground">
                    {achievements.length - unlockedIds.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Locked</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <p className="text-4xl font-bold text-gradient-sakura">
                    {Math.round((unlockedIds.length / achievements.length) * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
              </div>
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((achievement, index) => {
                  const unlocked = unlockedIds.includes(achievement.id);
                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <AchievementBadge
                        icon={achievement.icon}
                        title={achievement.title}
                        description={achievement.description}
                        unlocked={unlocked}
                        progress={!unlocked && index === 2 ? 45 : undefined}
                        maxProgress={!unlocked && index === 2 ? 100 : undefined}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Achievements;
