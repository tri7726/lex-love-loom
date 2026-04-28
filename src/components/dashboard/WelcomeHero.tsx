import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getLevelInfo } from '@/lib/leveling';
import { Progress } from '@/components/ui/progress';

interface WelcomeHeroProps {
  profile: {
    current_streak?: number;
    total_xp?: number;
    jlpt_level?: string;
  } | null;
  history?: { length: number } | any[];
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({ profile, history = [] }) => {
  const userStats = useMemo(() => {
    const defaultStats = {
      streak: 0,
      totalXp: 0,
      wordsLearned: 0,
      quizzesCompleted: 0,
      level: 'N5',
      levelInfo: getLevelInfo(0),
      jlptProgress: { N5: 0, N4: 0, N3: 0 },
    };

    if (!profile) return defaultStats;

    try {
      return {
        streak: profile.current_streak || 0,
        totalXp: profile.total_xp || 0,
        wordsLearned: history?.length || 0,
        quizzesCompleted: 0,
        level: profile.jlpt_level || 'N5',
        levelInfo: getLevelInfo(profile.total_xp || 0),
        jlptProgress: {
          N5: Math.min(100, ((profile.total_xp || 0) / 1000) * 100),
          N4: Math.max(0, Math.min(100, (((profile.total_xp || 0) - 1000) / 2000) * 100)),
          N3: 0,
        },
      };
    } catch (err) {
      console.error('Error calculating userStats:', err);
      return defaultStats;
    }
  }, [profile, history]);

  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      className="sakura-bg rounded-[2.5rem] p-8 md:p-10 border border-sakura-light/50 shadow-card"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Chào mừng trở lại! 🌸
          </h1>
          <div className="mb-6 space-y-2">
            <p className="text-muted-foreground">
              Bạn đang ở cấp học thuật <strong>{userStats.level}</strong>. Hãy tiếp tục lộ trình chinh phục JLPT nhé!
            </p>

            {/* Gamification Shimmer Bar */}
            <div className="w-full max-w-sm space-y-1.5 mt-4">
              <div className="flex justify-between text-xs font-bold text-sakura-dark">
                <span>Level {userStats.levelInfo.level}</span>
                <span>{Math.floor(userStats.levelInfo.progressPercentage)}%</span>
              </div>
              <Progress value={userStats.levelInfo.progressPercentage} showShimmer={true} className="h-3" />
              <p className="text-[10px] text-muted-foreground text-right font-medium">
                Còn {userStats.levelInfo.xpRequiredForNextLevel - userStats.levelInfo.currentXpInLevel} XP để lên Lv.{userStats.levelInfo.level + 1}
              </p>
            </div>
          </div>

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
              {userStats.levelInfo.level}
            </p>
            <p className="text-xs text-sakura-dark uppercase tracking-wider font-black">Level</p>
          </div>
          <div className="w-px h-12 bg-border/50" />
          <div className="text-center">
            <p className="text-4xl font-bold text-gradient-gold">
              {userStats.streak}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Chuỗi ngày</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
};
