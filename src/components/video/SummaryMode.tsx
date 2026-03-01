import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, Target, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const renderTextWithFurigana = (text: string, vocabulary: any[], show: boolean) => {
  if (!show || !vocabulary || vocabulary.length === 0) return text;
  
  const vocab = [...vocabulary].sort((a, b) => b.word.length - a.word.length);
  let parts: Array<{ text: string, furigana?: string }> = [{ text }];
  
  vocab.forEach(v => {
    const newParts: typeof parts = [];
    parts.forEach(part => {
      if (part.furigana) {
        newParts.push(part);
        return;
      }
      const subParts = part.text.split(v.word);
      subParts.forEach((subPart, i) => {
        if (subPart) newParts.push({ text: subPart });
        if (i < subParts.length - 1) {
          newParts.push({ text: v.word, furigana: v.reading });
        }
      });
    });
    parts = newParts;
  });

  return parts.map((part, i) => (
    <span key={i} className="inline-block">
      {part.furigana ? (
        <ruby>
          {part.text}
          <rt className="text-[10px] opacity-70">{part.furigana}</rt>
        </ruby>
      ) : part.text}
    </span>
  ));
};

interface Segment {
  id: string;
  segment_index: number;
  japanese_text: string;
  vietnamese_text: string | null;
  vocabulary: Array<{ word: string; reading: string; meaning: string }>;
}

interface SummaryModeProps {
  segments: Segment[];
  completedSegments: Set<number>;
  segmentScores: Map<number, number>;
  quizScore?: { correct: number; total: number };
  showFurigana?: boolean;
  showTranslation?: boolean;
}

export const SummaryMode: React.FC<SummaryModeProps> = ({
  segments,
  completedSegments,
  segmentScores,
  quizScore,
  showFurigana = false,
  showTranslation = true,
}) => {
  const totalSegments = segments.length;
  const completedCount = completedSegments.size;
  const completionRate = totalSegments > 0 ? (completedCount / totalSegments) * 100 : 0;
  
  // Calculate average score
  const scores = Array.from(segmentScores.values());
  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Get grade based on completion and scores
  const getGrade = () => {
    if (completionRate >= 90 && averageScore >= 90) return { grade: 'S', color: 'text-gold' };
    if (completionRate >= 80 && averageScore >= 80) return { grade: 'A', color: 'text-matcha' };
    if (completionRate >= 60 && averageScore >= 70) return { grade: 'B', color: 'text-primary' };
    if (completionRate >= 40 && averageScore >= 60) return { grade: 'C', color: 'text-muted-foreground' };
    return { grade: 'D', color: 'text-muted-foreground' };
  };

  const { grade, color } = getGrade();

  return (
    <div className="space-y-6">
      {/* Overall Grade */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 relative"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-matcha/5 rounded-full blur-3xl -z-10" />
        <div className={cn(
          "inline-flex items-center justify-center w-28 h-28 rounded-2xl bg-background shadow-xl border border-muted-foreground/10 mb-6 rotate-3 transition-transform hover:rotate-0",
          color
        )}>
          <span className="text-6xl font-black">{grade}</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Kết quả luyện tập</h2>
        <p className="text-muted-foreground mt-1">
          Tuyệt vời! Bạn đã hoàn thành <span className="text-matcha font-bold">{completedCount}/{totalSegments}</span> đoạn video.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-none bg-muted/30 shadow-none rounded-2xl">
          <CardContent className="p-6 text-center">
            <Target className="h-6 w-6 mx-auto text-matcha mb-2 opacity-70" />
            <p className="text-3xl font-black">{Math.round(completionRate)}%</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Hoàn thành</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-muted/30 shadow-none rounded-2xl">
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-6 w-6 mx-auto text-sakura mb-2 opacity-70" />
            <p className="text-3xl font-black">{averageScore}%</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Độ chính xác (TB)</p>
          </CardContent>
        </Card>

        {quizScore && (
          <Card className="border-none bg-matcha/5 shadow-none rounded-2xl col-span-2 lg:col-span-1">
            <CardContent className="p-6 text-center">
              <Trophy className="h-6 w-6 mx-auto text-gold mb-2 opacity-70" />
              <p className="text-3xl font-black">
                {quizScore.correct}/{quizScore.total}
              </p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Kết quả Quiz</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Segment breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chi tiết từng câu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {segments.map((segment, index) => {
            const isCompleted = completedSegments.has(index);
            const score = segmentScores.get(index);
            
            return (
              <div
                key={segment.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                <div className={`
                  flex items-center justify-center w-6 h-6 rounded-full
                  ${isCompleted ? 'bg-matcha text-white' : 'bg-muted text-muted-foreground'}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </div>
                
                
                <div className="flex-1 min-w-0">
                  <div className="font-jp text-sm">
                    {renderTextWithFurigana(segment.japanese_text, segment.vocabulary, showFurigana)}
                  </div>
                  {showTranslation && segment.vietnamese_text && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-1">
                      {segment.vietnamese_text}
                    </p>
                  )}
                </div>
                
                {score !== undefined && (
                  <Badge 
                    variant={score >= 90 ? 'default' : 'secondary'}
                    className={score >= 90 ? 'bg-matcha' : ''}
                  >
                    {score}%
                  </Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

// export default SummaryMode;
