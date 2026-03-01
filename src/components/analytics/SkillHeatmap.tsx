import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers, BookOpen, Brain, Mic, Trophy } from 'lucide-react';

interface SkillData {
  skill: string;
  levels: {
    N5: number;
    N4: number;
    N3: number;
    N2: number;
    N1: number;
  };
}

const mockData: SkillData[] = [
  { skill: 'Từ vựng', levels: { N5: 85, N4: 30, N3: 5, N2: 0, N1: 0 } },
  { skill: 'Hán tự', levels: { N5: 70, N4: 20, N3: 2, N2: 0, N1: 0 } },
  { skill: 'Ngữ pháp', levels: { N5: 60, N4: 15, N3: 0, N2: 0, N1: 0 } },
  { skill: 'Nghe hiểu', levels: { N5: 45, N4: 10, N3: 0, N2: 0, N1: 0 } },
  { skill: 'Đọc hiểu', levels: { N5: 30, N4: 5, N3: 0, N2: 0, N1: 0 } },
];

const getColorClass = (value: number) => {
  if (value === 0) return 'bg-muted/10';
  if (value < 20) return 'bg-primary/20';
  if (value < 50) return 'bg-primary/40';
  if (value < 80) return 'bg-primary/70';
  return 'bg-primary';
};

export const SkillHeatmap: React.FC = () => {
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

  return (
    <Card className="shadow-card border-primary/10 overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Bản đồ năng lực (Skill Heatmap)
        </CardTitle>
        <CardDescription>
          Trực quan hóa mức độ ưu thế của bạn theo từng cấp độ và kỹ năng.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-2 mb-2">
          <div className="text-xs font-bold text-muted-foreground pt-4">Kỹ năng</div>
          {levels.map(lvl => (
            <div key={lvl} className="text-center text-xs font-bold text-muted-foreground pt-4">
              {lvl}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {mockData.map((row, i) => (
            <motion.div 
              key={row.skill} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="grid grid-cols-6 gap-2 items-center"
            >
              <div className="text-sm font-medium">{row.skill}</div>
              {levels.map(lvl => (
                <div 
                  key={lvl}
                  className={`aspect-square rounded-md ${getColorClass(row.levels[lvl])} transition-all hover:scale-110 hover:shadow-soft flex items-center justify-center group relative`}
                >
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white transition-opacity">
                    {row.levels[lvl]}%
                  </span>
                  {/* Tooltip emulation */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap">
                    {row.skill} ({lvl}): {row.levels[lvl]}%
                  </div>
                </div>
              ))}
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 px-2">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Mức độ:</span>
          <div className="flex gap-1 items-center">
            {[0, 20, 50, 80, 100].map((v, i) => (
              <div key={i} className={`w-3 h-3 rounded-[2px] ${getColorClass(v === 100 ? 90 : v)}`} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
