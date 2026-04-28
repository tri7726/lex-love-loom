import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, Zap, Lock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Navigation } from '@/components/Navigation';
import { useAchievements } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Tổng quát',
  xp: 'XP',
  streak: 'Streak',
  flashcard: 'Flashcard',
  quiz: 'Quiz',
  social: 'Xã hội',
  speaking: 'Luyện nói',
};

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-sakura/10 text-sakura border-sakura/20',
  xp: 'bg-gold/10 text-gold border-gold/20',
  streak: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  flashcard: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  quiz: 'bg-matcha/10 text-matcha border-matcha/20',
  social: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  speaking: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
};

export const Achievements = () => {
  const { achievements, loading } = useAchievements();

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);
  const pct = achievements.length > 0 ? Math.round((unlocked.length / achievements.length) * 100) : 0;

  // Group by category
  const categories = [...new Set(achievements.map(a => a.category))];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container py-6 space-y-6 max-w-4xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-2">
            <Trophy className="h-8 w-8 text-gold" />
            Thành tích
          </h1>
          <p className="text-muted-foreground">Mở khóa huy hiệu qua các hoạt động học tập</p>
        </motion.div>

        {/* Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-around text-center mb-4">
                <div>
                  <p className="text-4xl font-bold text-gradient-gold">{unlocked.length}</p>
                  <p className="text-sm text-muted-foreground">Đã mở</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <p className="text-4xl font-bold text-muted-foreground">{locked.length}</p>
                  <p className="text-sm text-muted-foreground">Chưa mở</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <p className="text-4xl font-bold text-gradient-sakura">{pct}%</p>
                  <p className="text-sm text-muted-foreground">Hoàn thành</p>
                </div>
              </div>
              <Progress value={pct} className="h-2" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievements by category */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          categories.map((cat, ci) => (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + ci * 0.05 }}
            >
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-xs', CATEGORY_COLORS[cat])}>
                      {CATEGORY_LABELS[cat] ?? cat}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {achievements.filter(a => a.category === cat).map((a, idx) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        className={cn(
                          'p-4 rounded-2xl border transition-all',
                          a.unlocked
                            ? 'bg-gradient-to-br from-gold/10 to-sakura/5 border-gold/30 shadow-sm'
                            : 'bg-muted/30 border-border opacity-60'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'text-2xl w-10 h-10 flex items-center justify-center rounded-xl shrink-0',
                            a.unlocked ? 'bg-gold/20' : 'bg-muted'
                          )}>
                            {a.unlocked ? a.icon : <Lock className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="font-bold text-sm truncate">{a.title}</p>
                              {a.unlocked && <CheckCircle2 className="h-3.5 w-3.5 text-matcha shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground leading-snug">{a.description}</p>
                            {a.xp_reward > 0 && (
                              <p className="text-xs text-gold font-semibold mt-1 flex items-center gap-1">
                                <Zap className="h-3 w-3" /> +{a.xp_reward} XP
                              </p>
                            )}
                            {/* Progress bar for locked */}
                            {!a.unlocked && a.progress !== undefined && (
                              <div className="mt-2 space-y-1">
                                <Progress value={(a.progress / a.condition_value) * 100} className="h-1.5" />
                                <p className="text-[10px] text-muted-foreground">
                                  {a.progress} / {a.condition_value}
                                </p>
                              </div>
                            )}
                            {a.unlocked && a.unlocked_at && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {new Date(a.unlocked_at).toLocaleDateString('vi-VN')}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </main>
    </div>
  );
};
export default Achievements;
