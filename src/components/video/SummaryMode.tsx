import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, Target, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Segment {
  id: string;
  segment_index: number;
  japanese_text: string;
  vietnamese_text: string | null;
}

interface SummaryModeProps {
  segments: Segment[];
  completedSegments: Set<number>;
  segmentScores: Map<number, number>;
  quizScore?: { correct: number; total: number };
}

const SummaryMode: React.FC<SummaryModeProps> = ({
  segments,
  completedSegments,
  segmentScores,
  quizScore,
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
        className="text-center py-6"
      >
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-muted to-muted/50 mb-4`}>
          <span className={`text-5xl font-bold ${color}`}>{grade}</span>
        </div>
        <h2 className="text-xl font-semibold">Tổng kết bài học</h2>
        <p className="text-muted-foreground">
          Bạn đã hoàn thành {completedCount}/{totalSegments} đoạn
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto text-matcha mb-2" />
            <p className="text-2xl font-bold">{Math.round(completionRate)}%</p>
            <p className="text-sm text-muted-foreground">Hoàn thành</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-sakura mb-2" />
            <p className="text-2xl font-bold">{averageScore}%</p>
            <p className="text-sm text-muted-foreground">Điểm TB</p>
          </CardContent>
        </Card>

        {quizScore && (
          <Card className="col-span-2">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto text-gold mb-2" />
              <p className="text-2xl font-bold">
                {quizScore.correct}/{quizScore.total}
              </p>
              <p className="text-sm text-muted-foreground">Điểm Quiz</p>
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
                  <p className="font-jp text-sm truncate">
                    {segment.japanese_text}
                  </p>
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

export default SummaryMode;
