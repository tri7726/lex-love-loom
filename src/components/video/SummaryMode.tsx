import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, Target, BarChart3, Mic, Headphones } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const renderTextWithFurigana = (text: string, vocabulary: { word: string; reading: string; meaning: string }[] | unknown[], show: boolean) => {
  if (!show || !vocabulary || vocabulary.length === 0) return text;
  
  const vocab = [...(vocabulary as { word: string; reading: string; meaning: string }[])].sort((a, b) => b.word.length - a.word.length);
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
  speakingCompletedSegments?: Set<number>;
  speakingScores?: Map<number, number>;
  quizScore?: { correct: number; total: number };
  showFurigana?: boolean;
  showTranslation?: boolean;
}

export const SummaryMode: React.FC<SummaryModeProps> = ({
  segments,
  completedSegments,
  segmentScores,
  speakingCompletedSegments = new Set(),
  speakingScores = new Map(),
  quizScore,
  showFurigana = false,
  showTranslation = true,
}) => {
  const totalSegments = segments.length;
  const completedCount = completedSegments.size;
  const completionRate = totalSegments > 0 ? (completedCount / totalSegments) * 100 : 0;
  
  // Dictation average score
  const dictScores = Array.from(segmentScores.values());
  const avgDictation = dictScores.length > 0 
    ? Math.round(dictScores.reduce((a, b) => a + b, 0) / dictScores.length)
    : 0;

  // Speaking average score
  const spkScores = Array.from(speakingScores.values());
  const avgSpeaking = spkScores.length > 0
    ? Math.round(spkScores.reduce((a, b) => a + b, 0) / spkScores.length)
    : 0;

  // Overall average
  const allScores = [...dictScores, ...spkScores];
  const averageScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  const speakingRate = totalSegments > 0 ? (speakingCompletedSegments.size / totalSegments) * 100 : 0;

  const getGrade = () => {
    const combined = (completionRate + speakingRate) / 2;
    if (combined >= 90 && averageScore >= 90) return { grade: 'S', color: 'text-gold', bg: 'bg-gold/10' };
    if (combined >= 80 && averageScore >= 80) return { grade: 'A', color: 'text-matcha', bg: 'bg-matcha/10' };
    if (combined >= 60 && averageScore >= 70) return { grade: 'B', color: 'text-primary', bg: 'bg-primary/10' };
    if (combined >= 40 && averageScore >= 60) return { grade: 'C', color: 'text-muted-foreground', bg: 'bg-muted' };
    return { grade: 'D', color: 'text-muted-foreground', bg: 'bg-muted' };
  };

  const { grade, color, bg } = getGrade();

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
          Bạn đã hoàn thành <span className="text-matcha font-bold">{completedCount}/{totalSegments}</span> đoạn chép chính tả
          {speakingCompletedSegments.size > 0 && (
            <> và <span className="text-sakura font-bold">{speakingCompletedSegments.size}/{totalSegments}</span> đoạn phát âm</>
          )}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-none bg-muted/30 shadow-none rounded-2xl">
          <CardContent className="p-5 text-center">
            <Headphones className="h-5 w-5 mx-auto text-matcha mb-2 opacity-70" />
            <p className="text-2xl font-black">{Math.round(completionRate)}%</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Chép chính tả</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-muted/30 shadow-none rounded-2xl">
          <CardContent className="p-5 text-center">
            <Mic className="h-5 w-5 mx-auto text-sakura mb-2 opacity-70" />
            <p className="text-2xl font-black">{Math.round(speakingRate)}%</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Phát âm</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-muted/30 shadow-none rounded-2xl">
          <CardContent className="p-5 text-center">
            <BarChart3 className="h-5 w-5 mx-auto text-primary mb-2 opacity-70" />
            <p className="text-2xl font-black">{avgDictation > 0 ? `${avgDictation}%` : '—'}</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">TB Chép tả</p>
          </CardContent>
        </Card>

        {quizScore ? (
          <Card className="border-none bg-matcha/5 shadow-none rounded-2xl">
            <CardContent className="p-5 text-center">
              <Trophy className="h-5 w-5 mx-auto text-gold mb-2 opacity-70" />
              <p className="text-2xl font-black">{quizScore.correct}/{quizScore.total}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Quiz</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none bg-muted/30 shadow-none rounded-2xl">
            <CardContent className="p-5 text-center">
              <Target className="h-5 w-5 mx-auto text-primary mb-2 opacity-70" />
              <p className="text-2xl font-black">{avgSpeaking > 0 ? `${avgSpeaking}%` : '—'}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">TB Phát âm</p>
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
            const isDictCompleted = completedSegments.has(index);
            const isSpeakCompleted = speakingCompletedSegments.has(index);
            const dictScore = segmentScores.get(index);
            const speakScore = speakingScores.get(index);
            
            return (
              <div
                key={segment.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50"
              >
                {/* Status icons */}
                <div className="flex flex-col gap-0.5">
                  <div className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-full",
                    isDictCompleted ? 'bg-matcha text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    {isDictCompleted ? <CheckCircle className="h-3 w-3" /> : <Headphones className="h-3 w-3" />}
                  </div>
                  <div className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-full",
                    isSpeakCompleted ? 'bg-sakura text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    {isSpeakCompleted ? <CheckCircle className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  </div>
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
                
                {/* Scores */}
                <div className="flex flex-col gap-0.5 items-end">
                  {dictScore !== undefined && (
                    <Badge 
                      variant={dictScore >= 90 ? 'default' : 'secondary'}
                      className={cn("text-[10px] h-5", dictScore >= 90 ? 'bg-matcha' : '')}
                    >
                      ✍️ {dictScore}%
                    </Badge>
                  )}
                  {speakScore !== undefined && (
                    <Badge 
                      variant={speakScore >= 70 ? 'default' : 'secondary'}
                      className={cn("text-[10px] h-5", speakScore >= 70 ? 'bg-sakura' : '')}
                    >
                      🎤 {speakScore}%
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
