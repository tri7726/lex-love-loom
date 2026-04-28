import { memo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { achievements, AchievementBadge } from '@/components/StreakBadge';

export const AchievementsSection = memo(function AchievementsSection() {
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
  );
});
