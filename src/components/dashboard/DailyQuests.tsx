import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  Trophy, 
  Zap,
  BookOpen,
  MessageSquare,
  Gift
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MOCK_QUESTS = [
  { id: '1', title: 'Văn ôn võ luyện', description: 'Học thêm 10 từ vựng mới', current: 7, target: 10, reward: 200, icon: <Zap className="h-4 w-4" />, type: 'vocab' },
  { id: '2', title: 'Mọt sách Nhật Bản', description: 'Đọc ít nhất 2 bài tin tức', current: 2, target: 2, reward: 300, icon: <BookOpen className="h-4 w-4" />, type: 'reading', completed: true },
  { id: '3', title: 'Bậc thầy đàm thoại', description: 'Hoàn thành 1 buổi Roleplay AI', current: 0, target: 1, reward: 500, icon: <MessageSquare className="h-4 w-4" />, type: 'roleplay' },
];

export const DailyQuests = () => {
  const completedCount = MOCK_QUESTS.filter(q => q.completed || q.current >= q.target).length;
  const totalCount = MOCK_QUESTS.length;

  return (
    <Card className="border-2 border-primary/20 bg-card/60 backdrop-blur-sm shadow-soft overflow-hidden">
      <CardHeader className="pb-4 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" /> Nhiệm vụ hàng ngày
            </CardTitle>
            <CardDescription className="text-xs">
              Hoàn thành để nhận XP và phần thưởng hấp dẫn!
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-primary">{completedCount}/{totalCount}</span>
          </div>
        </div>
        <Progress value={(completedCount / totalCount) * 100} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {MOCK_QUESTS.map((quest) => {
          const isDone = quest.completed || quest.current >= quest.target;
          return (
            <motion.div 
              key={quest.id}
              initial={false}
              animate={{ opacity: isDone ? 0.7 : 1 }}
              className={cn(
                "p-3 rounded-xl border-2 transition-all flex items-center gap-3",
                isDone ? "bg-muted/30 border-transparent" : "bg-background border-border hover:border-primary/30"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                isDone ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
              )}>
                {quest.icon}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-center">
                  <p className={cn("text-xs font-bold truncate", isDone && "line-through")}>{quest.title}</p>
                  <span className="text-[10px] font-black text-primary">+{quest.reward} XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(quest.current / quest.target) * 100} className="h-1 flex-1" />
                  <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                    {quest.current}/{quest.target}
                  </span>
                </div>
              </div>
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
              )}
            </motion.div>
          );
        })}
        {completedCount === totalCount && (
          <Button className="w-full rounded-xl bg-gold hover:bg-gold/90 text-gold-foreground font-bold shadow-lg gap-2 mt-2">
            <Trophy className="h-4 w-4" /> Nhận thưởng rương báu
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
