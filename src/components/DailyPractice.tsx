import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  Mic,
  Target,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface DailyTask {
  id: string;
  type: 'vocabulary' | 'kanji' | 'quiz' | 'pronunciation' | 'review';
  title: string;
  description: string;
  progress: number;
  total: number;
  xp: number;
  completed: boolean;
  estimatedTime: number;
}

interface DailyPracticeProps {
  tasks: DailyTask[];
  onStartTask: (taskId: string) => void;
  totalXpToday: number;
  dailyGoal: number;
}

export const DailyPractice: React.FC<DailyPracticeProps> = ({
  tasks,
  onStartTask,
  totalXpToday,
  dailyGoal,
}) => {
  const completedTasks = tasks.filter((t) => t.completed).length;
  const xpProgress = Math.min((totalXpToday / dailyGoal) * 100, 100);

  const getTaskIcon = (type: DailyTask['type']) => {
    switch (type) {
      case 'vocabulary':
        return <BookOpen className="h-5 w-5" />;
      case 'kanji':
        return <span className="text-lg font-jp font-bold">漢</span>;
      case 'quiz':
        return <Brain className="h-5 w-5" />;
      case 'pronunciation':
        return <Mic className="h-5 w-5" />;
      case 'review':
        return <Target className="h-5 w-5" />;
    }
  };

  const getTaskColor = (type: DailyTask['type']) => {
    switch (type) {
      case 'vocabulary':
        return 'bg-sakura/10 text-sakura border-sakura/30';
      case 'kanji':
        return 'bg-indigo-jp/10 text-indigo-jp border-indigo-jp/30';
      case 'quiz':
        return 'bg-matcha/10 text-matcha border-matcha/30';
      case 'pronunciation':
        return 'bg-gold/10 text-gold border-gold/30';
      case 'review':
        return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  return (
    <Card className="shadow-card overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 via-sakura-light/30 to-gold-light/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            <CardTitle>Today's Practice</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            {completedTasks}/{tasks.length} completed
          </span>
        </div>

        {/* Daily XP Progress */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Daily Goal</span>
            <span className="font-medium">
              {totalXpToday} / {dailyGoal} XP
            </span>
          </div>
          <div className="progress-sakura">
            <motion.div
              className="progress-sakura-fill"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
              task.completed
                ? 'bg-matcha/5 border-matcha/30'
                : 'bg-card hover:shadow-sm'
            )}
          >
            <div
              className={cn(
                'p-3 rounded-lg border',
                task.completed
                  ? 'bg-matcha/10 text-matcha border-matcha/30'
                  : getTaskColor(task.type)
              )}
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                getTaskIcon(task.type)
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4
                  className={cn(
                    'font-medium',
                    task.completed && 'line-through text-muted-foreground'
                  )}
                >
                  {task.title}
                </h4>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gold/10 text-gold">
                  +{task.xp} XP
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {task.description}
              </p>

              {!task.completed && task.progress > 0 && (
                <div className="mt-2">
                  <Progress
                    value={(task.progress / task.total) * 100}
                    className="h-1.5"
                  />
                  <span className="text-xs text-muted-foreground mt-1">
                    {task.progress}/{task.total}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {task.estimatedTime}m
              </span>
              {!task.completed && (
                <Button
                  size="sm"
                  variant={task.progress > 0 ? 'default' : 'outline'}
                  onClick={() => onStartTask(task.id)}
                  className="click-feedback"
                >
                  {task.progress > 0 ? 'Continue' : 'Start'}
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DailyPractice;
