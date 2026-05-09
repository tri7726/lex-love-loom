import React from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, Headphones, PenTool, Mic, Sparkles, ArrowRight, RotateCcw, ChevronLeft, Trophy, Flame, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GameMode } from './types';
import { VocabWord } from '@/types/vocabulary';
import { JapaneseText } from '@/components/common/JapaneseText';
import { AISenseiExplain } from '@/components/AI/AISenseiExplain';

const GAME_LABELS: Record<GameMode, { label: string; icon: React.ElementType; color: string }> = {
  classic: { label: 'Cổ điển', icon: Target, color: 'text-rose-500' },
  speed: { label: 'Tốc độ', icon: Zap, color: 'text-pink-500' },
  listening: { label: 'Nghe', icon: Headphones, color: 'text-rose-400' },
  writing: { label: 'Viết', icon: PenTool, color: 'text-pink-400' },
  match: { label: 'Ghép cặp', icon: Sparkles, color: 'text-rose-500' },
  pronunciation: { label: 'Phát âm', icon: Mic, color: 'text-sakura' },
  lab: { label: 'Viết tay', icon: PenTool, color: 'text-sakura' },
  boss: { label: 'Đấu Trùm', icon: Skull, color: 'text-rose-600' },
  fillblank: { label: 'Điền từ', icon: PenTool, color: 'text-sky-500' },
};

interface GameSessionStatsProps {
  gameType: GameMode;
  correct: number;
  total: number;
  score?: number;
  wrongWords: VocabWord[];
  bestStreak: number;
  suggestedNext: { game: GameMode; reason: string };
  onLabWord?: (word: VocabWord) => void;
  onRetryWrong: () => void;
  onTryNext: (game: GameMode) => void;
  onContinue: () => void;
  onBack: () => void;
  accentClass?: string;
}

export const GameSessionStats: React.FC<GameSessionStatsProps> = ({
  gameType, correct, total, score, wrongWords, bestStreak,
  suggestedNext, onLabWord, onRetryWrong, onTryNext, onContinue, onBack, accentClass = 'text-rose-500',
}) => {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const GameIcon = GAME_LABELS[gameType]?.icon || Target;
  const hasWrong = wrongWords.length > 0;
  const NextIcon = GAME_LABELS[suggestedNext.game]?.icon || Target;

  const getGrade = () => {
    if (accuracy >= 95) return { grade: 'S', color: 'text-gold', bg: 'bg-gold/10' };
    if (accuracy >= 80) return { grade: 'A', color: 'text-matcha', bg: 'bg-matcha/10' };
    if (accuracy >= 60) return { grade: 'B', color: 'text-rose-500', bg: 'bg-rose-500/10' };
    if (accuracy >= 40) return { grade: 'C', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { grade: 'D', color: 'text-muted-foreground', bg: 'bg-muted' };
  };

  const { grade, color, bg } = getGrade();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-5"
    >
      {/* Grade + overall */}
      <div className="relative text-center py-6 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 via-pink-50 to-white border border-rose-100">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-200/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-pink-200/15 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10">
          <div className={cn('inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-background shadow-lg border mb-4', color, bg)}>
            <span className="text-4xl font-black">{grade}</span>
          </div>
          <h2 className="text-xl font-black tracking-tight">Kết quả</h2>
          <div className="flex items-center justify-center gap-2 mt-1 text-sm text-muted-foreground">
            <GameIcon className={cn('h-4 w-4', GAME_LABELS[gameType]?.color)} />
            <span>{GAME_LABELS[gameType]?.label}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="border-none bg-muted/20 shadow-none rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className={cn('text-2xl font-black', accuracy >= 80 ? 'text-matcha' : accuracy >= 50 ? 'text-amber-500' : 'text-rose-500')}>
              {accuracy}%
            </p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Chính xác</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-muted/20 shadow-none rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-sakura">{correct}/{total}</p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Đúng</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-muted/20 shadow-none rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-gold">
              <Flame className="h-5 w-5 inline-block" /> {bestStreak}
            </p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Streak</p>
          </CardContent>
        </Card>
        {score !== undefined ? (
          <Card className="border-none bg-indigo-500/5 shadow-none rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-indigo-500">{score}</p>
              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Điểm</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none bg-muted/20 shadow-none rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-gold">{total - correct}</p>
              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Sai</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Wrong words list */}
      {hasWrong && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-600">Các từ cần ôn lại ({wrongWords.length})</h3>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {wrongWords.map(w => (
                <div key={w.id} className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-rose-50/50 group">
                  <div className="flex-1 flex items-center gap-3">
                    <JapaneseText text={w.word} furigana={w.reading || undefined} size="sm" className="font-bold font-jp" />
                    <span className="text-xs text-muted-foreground">— {w.meaning}</span>
                  </div>
                  {onLabWord && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-sakura" onClick={() => onLabWord(w)} title="Luyện viết">
                      <PenTool className="h-3 w-3" />
                    </Button>
                  )}
                  <AISenseiExplain 
                    content={w.word}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-sakura" title="Giải thích AI">
                        <Sparkles className="h-3 w-3" />
                      </Button>
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        {hasWrong && (
          <Button
            className="w-full gap-2 h-12 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-rose-400 to-pink-400 text-white shadow-lg"
            onClick={onRetryWrong}
          >
            <RotateCcw className="h-4 w-4" /> Chơi lại ({wrongWords.length} từ sai)
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full gap-3 h-12 rounded-2xl font-bold border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300"
          onClick={() => onTryNext(suggestedNext.game)}
        >
          <NextIcon className="h-4 w-4" />
          {suggestedNext.reason}
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onContinue} className="gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Về bài học
          </Button>
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground ml-auto">
            Đổi game <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
