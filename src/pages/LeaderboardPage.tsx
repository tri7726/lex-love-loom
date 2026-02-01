import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import Leaderboard from '@/components/Leaderboard';

const leaderboardData = [
  { rank: 1, userId: '1', username: 'SakuraMaster', xp: 4520, streak: 45 },
  { rank: 2, userId: '2', username: 'KanjiKing', xp: 4210, streak: 32 },
  { rank: 3, userId: '3', username: 'NihongoNinja', xp: 3890, streak: 28 },
  { rank: 4, userId: '4', username: 'You', xp: 1250, streak: 7, isCurrentUser: true },
  { rank: 5, userId: '5', username: 'TokyoLearner', xp: 1100, streak: 12 },
  { rank: 6, userId: '6', username: 'HiraganaHero', xp: 980, streak: 8 },
  { rank: 7, userId: '7', username: 'KatakanaKid', xp: 850, streak: 5 },
  { rank: 8, userId: '8', username: 'JapanFan', xp: 720, streak: 3 },
  { rank: 9, userId: '9', username: 'Beginner123', xp: 580, streak: 2 },
  { rank: 10, userId: '10', username: 'NewLearner', xp: 450, streak: 1 },
];

const LeaderboardPage = () => {
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
            Leaderboard
          </h1>
          <p className="text-muted-foreground">
            See how you rank against other learners
          </p>
        </motion.div>

        {/* Your Rank Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 border-primary/30 bg-primary/5 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Your Rank</p>
                  <p className="text-4xl font-bold">#4</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total XP</p>
                  <p className="text-4xl font-bold text-gradient-sakura">1,250</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                You need 2,640 more XP to reach #3. Keep learning! 🎯
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Full Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Leaderboard 
            entries={leaderboardData} 
            title="Top Learners" 
            period="weekly" 
          />
        </motion.div>
      </main>
    </div>
  );
};

export default LeaderboardPage;
