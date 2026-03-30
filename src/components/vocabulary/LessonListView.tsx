import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getLevelGradient, getLevelAccent } from './utils';
import { TextbookSeries, JLPTLevel, Lesson } from './types';

interface LessonListViewProps {
  selectedSeries: TextbookSeries;
  selectedLevel: JLPTLevel;
  lessonRange: [number, number];
  setLessonRange: (range: [number, number]) => void;
  handleStudyRange: () => void;
  navigateToDetail: (lesson: Lesson, autoGame?: string) => void;
  goBack: () => void;
}

export const LessonListView: React.FC<LessonListViewProps> = ({
  selectedSeries,
  selectedLevel,
  lessonRange,
  setLessonRange,
  handleStudyRange,
  navigateToDetail,
  goBack,
}) => {
  const accent = getLevelAccent(selectedSeries.id, selectedLevel.level);
  const grad = getLevelGradient(selectedSeries.id, selectedLevel.level);

  return (
    <motion.div
      key="lessons"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-6"
    >
      <Button variant="ghost" size="sm" onClick={goBack} className="gap-2 text-sakura hover:bg-sakura-light/50 rounded-full font-bold">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </Button>

      {/* Level header card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className={cn('h-2 bg-gradient-to-r', grad)} />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className={cn('w-16 h-16 rounded-[1.25rem] bg-gradient-to-br flex items-center justify-center text-white text-3xl font-black shadow-elevated transition-transform hover:scale-105', grad)}>
                {selectedLevel.level}
              </div>
              <div>
                <h1 className="text-3xl font-display font-black text-sumi">{selectedSeries.name}</h1>
                <p className="text-muted-foreground font-medium">{selectedLevel.description}</p>
              </div>
            </div>

            {/* Lesson Range Selector */}
            {selectedLevel.lessons.length > 3 && (
              <div className="flex-1 max-w-sm space-y-4 bg-cream/30 p-5 rounded-[2rem] border border-sakura-light/30 shadow-sm">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phạm vi học tập</Label>
                  <Badge className={cn("text-white border-0 font-black px-3 py-0.5", grad)}>
                    Bài {lessonRange[0]} - {lessonRange[1]}
                  </Badge>
                </div>
                <Slider
                  defaultValue={lessonRange}
                  max={selectedSeries.id === 'mina' ? (selectedLevel.level === 'N4' ? 50 : 25) : selectedLevel.lessons.length}
                  min={selectedSeries.id === 'mina' ? (selectedLevel.level === 'N4' ? 26 : 1) : 1}
                  step={1}
                  value={lessonRange}
                  onValueChange={(v) => setLessonRange(v as [number, number])}
                />
                <Button 
                  size="lg" 
                  className={cn("w-full text-xs font-black text-white shadow-soft hover:shadow-elevated transition-all rounded-xl uppercase tracking-widest", grad)}
                  onClick={handleStudyRange}
                >
                  Bắt đầu học ngay
                </Button>
              </div>
            )}

            <div className="text-right hidden lg:block">
              <p className="text-2xl font-bold">{selectedLevel.lessons.length}</p>
              <p className="text-xs text-muted-foreground">bài học</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {selectedLevel.lessons.map((lesson, idx) => (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.025 }}
          >
            <Card
              className={cn(
                'cursor-pointer group hover:shadow-md transition-all duration-200 border hover:border-transparent overflow-hidden',
                `hover:ring-2 ${accent.ring}`
              )}
              onClick={() => navigateToDetail(lesson)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0',
                  accent.badge, 'group-hover:scale-110 transition-transform'
                )}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{lesson.name}</p>
                  <p className="text-xs text-muted-foreground">{lesson.words.length} từ vựng</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Quick Quiz shortcut */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-gold hover:bg-gold-light/20"
                    title="Quick Quiz"
                    onClick={e => {
                      e.stopPropagation();
                      navigateToDetail(lesson, 'quiz');
                    }}
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </Button>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
