import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

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
  if (value === 0) return 'bg-muted/20 dark:bg-slate-800/20';
  if (value < 20) return 'bg-sakura-light/40 dark:bg-sakura-dark/20 text-sakura-dark/40';
  if (value < 50) return 'bg-sakura/30 dark:bg-sakura-dark/40 text-sakura-dark';
  if (value < 80) return 'bg-sakura/60 dark:bg-sakura-dark/70 text-white';
  return 'bg-sakura text-white';
};

export const SkillHeatmap: React.FC = () => {
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

  return (
    <TooltipProvider>
      <Card className="shadow-card border-2 border-sakura/20 overflow-hidden bg-sakura-light/30 backdrop-blur-md">
        <CardHeader className="pb-4 border-b border-sakura/10">
          <CardTitle className="text-xl flex items-center gap-2 font-display text-sakura-dark">
            <Layers className="h-5 w-5" />
            Bản đồ năng lực (Skill Heatmap)
          </CardTitle>
          <CardDescription className="text-xs text-sakura-dark/60 font-medium">
            Trực quan hóa mức độ ưu thế của bạn theo từng cấp độ và kỹ năng.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Header row with perfect alignment */}
          <div className="grid grid-cols-[80px_1fr] md:grid-cols-[100px_1fr] gap-3 mb-4">
            <div className="text-[10px] font-black text-sakura-dark/40 uppercase tracking-widest flex items-center">
              Kỹ năng
            </div>
            <div className="grid grid-cols-5 gap-2">
              {levels.map(lvl => (
                <div key={lvl} className="text-center text-[10px] font-black text-sakura-dark/60 uppercase tracking-wider">
                  {lvl}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {mockData.map((row, i) => (
              <motion.div 
                key={row.skill} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-[80px_1fr] md:grid-cols-[100px_1fr] gap-3 items-center"
              >
                <div className="text-xs font-bold text-sakura-dark truncate">
                  {row.skill}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {levels.map(lvl => (
                    <Tooltip key={lvl}>
                      <TooltipTrigger asChild>
                        <motion.div 
                          whileHover={{ scale: 1.1 }}
                          className={`aspect-square rounded-lg ${getColorClass(row.levels[lvl])} transition-all shadow-sm flex items-center justify-center cursor-help border border-white/40`}
                        >
                          {row.levels[lvl] > 0 && (
                            <span className="text-[8px] md:text-[9px] font-bold opacity-90">
                              {row.levels[lvl]}%
                            </span>
                          )}
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-sakura text-white border-white/20 shadow-elevated">
                        <p className="font-bold text-xs">{row.skill} ({lvl})</p>
                        <div className="h-px bg-white/20 my-1" />
                        <p className="text-[10px] font-medium">Tiến độ: {row.levels[lvl]}%</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 px-1">
            <span className="text-[9px] text-sakura-dark/40 uppercase font-black tracking-widest">Mức độ:</span>
            <div className="flex gap-1.5 items-center">
              {[0, 20, 50, 80, 100].map((v, i) => (
                <div key={i} className={`w-3.5 h-3.5 rounded-sm ${getColorClass(v === 100 ? 90 : v)} border border-white/20 shadow-sm`} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
