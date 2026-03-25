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
      <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </Button>

      {/* Level header card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className={cn('h-2 bg-gradient-to-r', grad)} />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-2xl font-black shadow-lg', grad)}>
                {selectedLevel.level}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedSeries.name}</h1>
                <p className="text-muted-foreground">{selectedLevel.description}</p>
              </div>
            </div>

            {/* Lesson Range Selector - For Minna N5 & N4 */}
            {selectedSeries.id === 'mina' && (selectedLevel.level === 'N5' || selectedLevel.level === 'N4') && (
              <div className="flex-1 max-w-sm space-y-3 bg-muted/30 p-4 rounded-2xl border border-muted-foreground/10">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chọn phạm vi học</Label>
                  <Badge variant="secondary" className={cn("text-white border-0", grad)}>
                    Bài {lessonRange[0]} - {lessonRange[1]}
                  </Badge>
                </div>
                <Slider
                  defaultValue={selectedLevel.level === 'N4' ? [26, 30] : [1, 5]}
                  max={selectedLevel.level === 'N4' ? 50 : 25}
                  min={selectedLevel.level === 'N4' ? 26 : 1}
                  step={1}
                  value={lessonRange}
                  onValueChange={(v) => setLessonRange(v as [number, number])}
                />
                <Button 
                  size="sm" 
                  className={cn("w-full text-xs font-bold text-white shadow-md hover:shadow-lg transition-all", grad)}
                  onClick={handleStudyRange}
                >
                  Học {lessonRange[1] - lessonRange[0] + 1} bài đã chọn
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
                    className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 hover:bg-amber-50"
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
