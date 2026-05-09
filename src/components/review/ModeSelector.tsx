/**
 * ModeSelector — màn hình chọn chế độ ôn tập trước khi vào session
 */
import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, CheckSquare, Zap, Keyboard, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ReviewMode = 'flip' | 'choice' | 'speed' | 'type';

interface ModeCard {
  mode: ReviewMode;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge: string;
  gradient: string;
  iconBg: string;
}

const MODES: ModeCard[] = [
  {
    mode: 'flip',
    icon: <RotateCcw className="h-6 w-6" />,
    title: 'Lật thẻ',
    desc: 'Tự đánh giá mức độ nhớ. Phù hợp ôn sâu có suy nghĩ.',
    badge: 'Cổ điển',
    gradient: 'from-sakura/10 via-pink-50/30 to-transparent',
    iconBg: 'bg-sakura/15 text-sakura',
  },
  {
    mode: 'choice',
    icon: <CheckSquare className="h-6 w-6" />,
    title: 'Trắc nghiệm',
    desc: 'Chọn nghĩa đúng trong 4 lựa chọn. Được chấm điểm tự động.',
    badge: 'Phổ biến',
    gradient: 'from-indigo-500/10 via-blue-50/30 to-transparent',
    iconBg: 'bg-indigo-500/15 text-indigo-500',
  },
  {
    mode: 'speed',
    icon: <Zap className="h-6 w-6" />,
    title: 'Speed Round',
    desc: 'Đọc từ + nghĩa, bấm Biết/Không biết nhanh nhất. 60 giây.',
    badge: 'Thú vị',
    gradient: 'from-gold/10 via-amber-50/30 to-transparent',
    iconBg: 'bg-gold/15 text-gold',
  },
  {
    mode: 'type',
    icon: <Keyboard className="h-6 w-6" />,
    title: 'Gõ nghĩa',
    desc: 'Xem từ JP và tự gõ nghĩa tiếng Việt. Luyện nhớ chủ động.',
    badge: 'Nâng cao',
    gradient: 'from-matcha/10 via-green-50/30 to-transparent',
    iconBg: 'bg-matcha/15 text-matcha',
  },
];

interface ModeSelectorProps {
  dueCount: number;
  onSelectMode: (mode: ReviewMode) => void;
  onBack: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ dueCount, onSelectMode, onBack }) => {
  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
      {/* Header */}
      <header className="max-w-xl w-full mx-auto flex items-center gap-4 mb-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-2xl text-muted-foreground/70 hover:text-sakura shrink-0">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-xl font-black text-foreground leading-none">Chọn chế độ ôn tập</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-black text-sakura">{dueCount}</span> thẻ đang chờ bạn
          </p>
        </div>
      </header>

      {/* Mode grid */}
      <main className="max-w-xl w-full mx-auto flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODES.map((m, i) => (
            <motion.button
              key={m.mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectMode(m.mode)}
              className={cn(
                'relative text-left p-5 rounded-2xl border-2 border-border/40 hover:border-border/80 transition-all shadow-sm hover:shadow-md overflow-hidden',
                'bg-gradient-to-br', m.gradient
              )}
            >
              {/* Badge */}
              <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-background/70 text-muted-foreground border border-border/50">
                {m.badge}
              </span>

              {/* Icon */}
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-3', m.iconBg)}>
                {m.icon}
              </div>

              {/* Text */}
              <h3 className="font-black text-base text-foreground mb-1">{m.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
            </motion.button>
          ))}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50 mt-8 font-medium">
          Mọi chế độ đều cập nhật lịch ôn tập FSRS tự động
        </p>
      </main>
    </div>
  );
};
