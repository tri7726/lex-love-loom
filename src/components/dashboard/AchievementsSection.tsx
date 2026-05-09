import { memo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight, Loader2, Lock, CheckCircle2, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAchievements } from '@/hooks/useAchievements';

export const AchievementsSection = memo(function AchievementsSection() {
  const { achievements, loading } = useAchievements();

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  // Top 4: most recent unlocks first, then closest-to-unlock
  const displayAchievements = [
    ...unlocked.sort((a, b) =>
      new Date(b.unlocked_at || 0).getTime() - new Date(a.unlocked_at || 0).getTime()
    ).slice(0, 2),
    ...locked
      .sort((a, b) => (b.progress || 0) / b.condition_value - (a.progress || 0) / a.condition_value)
      .slice(0, 2),
  ];

  // Loading state
  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
        <CardContent className="space-y-4">
          {/* Overall progress */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">
              {unlocked.length} / {achievements.length} đã mở khóa
            </span>
            <span className="font-bold text-gold">
              {achievements.length > 0 ? Math.round((unlocked.length / achievements.length) * 100) : 0}%
            </span>
          </div>
          <Progress
            value={achievements.length > 0 ? (unlocked.length / achievements.length) * 100 : 0}
            className="h-2"
          />

          {/* Empty state */}
          {achievements.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-xs text-muted-foreground">Chưa có thành tích nào</p>
            </div>
          )}

          {/* Achievement cards */}
          {displayAchievements.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {displayAchievements.map((a, idx) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    'p-4 rounded-2xl border transition-all',
                    a.unlocked
                      ? 'bg-gradient-to-br from-gold/10 to-sakura/5 border-gold/30 shadow-sm'
                      : 'bg-muted/30 border-border opacity-70'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'text-xl w-9 h-9 flex items-center justify-center rounded-xl shrink-0',
                      a.unlocked ? 'bg-gold/20' : 'bg-muted'
                    )}>
                      {a.unlocked ? a.icon : <Lock className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-bold text-xs truncate">{a.title}</p>
                        {a.unlocked && <CheckCircle2 className="h-3 w-3 text-matcha shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">{a.description}</p>
                      {a.xp_reward > 0 && (
                        <p className="text-[10px] text-gold font-semibold mt-0.5 flex items-center gap-1">
                          <Zap className="h-3 w-3" /> +{a.xp_reward} XP
                        </p>
                      )}
                      {/* Progress for locked */}
                      {!a.unlocked && a.progress !== undefined && (
                        <div className="mt-1.5 space-y-0.5">
                          <Progress
                            value={(a.progress / a.condition_value) * 100}
                            className="h-1"
                          />
                          <p className="text-[9px] text-muted-foreground">
                            {a.progress} / {a.condition_value}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.section>
  );
});
