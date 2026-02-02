import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Volume2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PronunciationScore {
  accuracy: number; // 0-100: Độ chính xác từ
  duration: number; // 0-100: Trường âm (dài/ngắn)
  rhythm: number; // 0-100: Nhịp điệu, ngắt câu
  fluency: number; // 0-100: Độ trôi chảy
  overall: number; // 0-100: Điểm tổng
  feedback: PronunciationFeedback[];
  highlightedText?: HighlightedWord[];
}

export interface PronunciationFeedback {
  type: 'success' | 'warning' | 'error';
  category: 'accuracy' | 'duration' | 'rhythm' | 'fluency';
  message: string;
  suggestion?: string;
}

export interface HighlightedWord {
  word: string;
  status: 'correct' | 'incorrect' | 'missing' | 'extra';
  expected?: string;
}

interface Props {
  score: PronunciationScore | null;
  targetText: string;
  userTranscript: string;
  onRetry?: () => void;
  onPlayTarget?: () => void;
  isLoading?: boolean;
}

const criteriaConfig = {
  accuracy: { label: 'Độ chính xác', icon: CheckCircle2, description: 'Phát âm đúng từng từ' },
  duration: { label: 'Trường âm', icon: TrendingUp, description: 'Âm dài/ngắn chính xác' },
  rhythm: { label: 'Nhịp điệu', icon: Volume2, description: 'Ngắt câu tự nhiên' },
  fluency: { label: 'Độ trôi chảy', icon: TrendingUp, description: 'Nói liền mạch' },
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-matcha';
  if (score >= 60) return 'text-gold';
  if (score >= 40) return 'text-orange-500';
  return 'text-destructive';
};

const getScoreBg = (score: number) => {
  if (score >= 80) return 'bg-matcha/20';
  if (score >= 60) return 'bg-gold/20';
  if (score >= 40) return 'bg-orange-500/20';
  return 'bg-destructive/20';
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return 'Xuất sắc!';
  if (score >= 80) return 'Rất tốt';
  if (score >= 70) return 'Tốt';
  if (score >= 60) return 'Khá';
  if (score >= 50) return 'Trung bình';
  return 'Cần luyện tập';
};

export const PronunciationAnalysis: React.FC<Props> = ({
  score,
  targetText,
  userTranscript,
  onRetry,
  onPlayTarget,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-muted-foreground">Đang phân tích phát âm...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!score) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Overall Score */}
      <Card className="shadow-elevated border-2 border-primary/20 overflow-hidden">
        <div className={cn("p-6", getScoreBg(score.overall))}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Điểm tổng</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-5xl font-bold", getScoreColor(score.overall))}>
                  {score.overall}
                </span>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <p className={cn("text-lg font-medium mt-1", getScoreColor(score.overall))}>
                {getScoreLabel(score.overall)}
              </p>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center",
                getScoreBg(score.overall)
              )}
            >
              <span className={cn("text-4xl font-bold", getScoreColor(score.overall))}>
                {score.overall >= 80 ? '🎉' : score.overall >= 60 ? '👍' : '💪'}
              </span>
            </motion.div>
          </div>
        </div>
      </Card>

      {/* 4 Criteria Breakdown */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Phân tích chi tiết</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['accuracy', 'duration', 'rhythm', 'fluency'] as const).map((key, index) => {
            const config = criteriaConfig[key];
            const value = score[key];
            const Icon = config.icon;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", getScoreColor(value))} />
                    <span className="font-medium">{config.label}</span>
                    <span className="text-xs text-muted-foreground">({config.description})</span>
                  </div>
                  <span className={cn("font-bold", getScoreColor(value))}>{value}%</span>
                </div>
                <Progress value={value} className="h-2" />
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Highlighted Text Comparison */}
      {score.highlightedText && score.highlightedText.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">So sánh phát âm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Văn bản gốc:</p>
              <p className="font-jp text-lg">{targetText}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Bạn đã nói:</p>
              <div className="font-jp text-lg flex flex-wrap gap-1">
                {score.highlightedText.map((word, i) => (
                  <span
                    key={i}
                    className={cn(
                      "px-1 rounded",
                      word.status === 'correct' && 'bg-matcha/20 text-matcha',
                      word.status === 'incorrect' && 'bg-destructive/20 text-destructive line-through',
                      word.status === 'missing' && 'bg-gold/20 text-gold italic',
                      word.status === 'extra' && 'bg-muted text-muted-foreground'
                    )}
                    title={word.expected ? `Đúng: ${word.expected}` : undefined}
                  >
                    {word.word}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback List */}
      {score.feedback.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Gợi ý cải thiện</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {score.feedback.map((fb, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "p-3 rounded-lg flex items-start gap-3",
                  fb.type === 'success' && 'bg-matcha/10',
                  fb.type === 'warning' && 'bg-gold/10',
                  fb.type === 'error' && 'bg-destructive/10'
                )}
              >
                {fb.type === 'success' && <CheckCircle2 className="h-5 w-5 text-matcha shrink-0 mt-0.5" />}
                {fb.type === 'warning' && <AlertTriangle className="h-5 w-5 text-gold shrink-0 mt-0.5" />}
                {fb.type === 'error' && <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                <div>
                  <p className="font-medium">{fb.message}</p>
                  {fb.suggestion && (
                    <p className="text-sm text-muted-foreground mt-1">{fb.suggestion}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onPlayTarget && (
          <Button variant="outline" onClick={onPlayTarget} className="flex-1">
            <Volume2 className="h-4 w-4 mr-2" />
            Nghe mẫu
          </Button>
        )}
        {onRetry && (
          <Button onClick={onRetry} className="flex-1">
            Luyện lại
          </Button>
        )}
      </div>
    </motion.div>
  );
};

// Helper function to analyze pronunciation
export const analyzePronunciation = (
  targetText: string,
  userTranscript: string
): PronunciationScore => {
  const normalizeText = (text: string) => 
    text.trim().toLowerCase().replace(/\s+/g, '').replace(/[。、！？]/g, '');

  const target = normalizeText(targetText);
  const user = normalizeText(userTranscript);

  // Calculate accuracy based on character matching
  let matches = 0;
  const maxLen = Math.max(target.length, user.length);
  const minLen = Math.min(target.length, user.length);

  for (let i = 0; i < minLen; i++) {
    if (target[i] === user[i]) matches++;
  }

  const accuracy = maxLen > 0 ? Math.round((matches / maxLen) * 100) : 0;

  // Duration score based on length difference
  const lengthRatio = user.length / (target.length || 1);
  const duration = Math.round(Math.max(0, 100 - Math.abs(1 - lengthRatio) * 100));

  // Rhythm: simplified - based on pause patterns (mock for now)
  const rhythm = Math.round(70 + Math.random() * 30);

  // Fluency: based on completeness and accuracy
  const fluency = Math.round((accuracy * 0.6 + duration * 0.4));

  // Overall weighted score
  const overall = Math.round(
    accuracy * 0.4 + duration * 0.2 + rhythm * 0.2 + fluency * 0.2
  );

  // Generate feedback
  const feedback: PronunciationFeedback[] = [];

  if (accuracy >= 90) {
    feedback.push({
      type: 'success',
      category: 'accuracy',
      message: 'Phát âm rất chính xác!',
    });
  } else if (accuracy >= 70) {
    feedback.push({
      type: 'warning',
      category: 'accuracy',
      message: 'Một số từ chưa chính xác',
      suggestion: 'Hãy nghe lại mẫu và luyện tập từng từ riêng lẻ',
    });
  } else {
    feedback.push({
      type: 'error',
      category: 'accuracy',
      message: 'Cần cải thiện độ chính xác',
      suggestion: 'Thử nói chậm hơn và rõ ràng từng từ',
    });
  }

  if (duration < 70) {
    feedback.push({
      type: 'warning',
      category: 'duration',
      message: lengthRatio < 1 ? 'Bạn nói hơi ngắn' : 'Bạn nói hơi dài',
      suggestion: 'Chú ý độ dài của các âm như ー, っ',
    });
  }

  if (fluency >= 80) {
    feedback.push({
      type: 'success',
      category: 'fluency',
      message: 'Nói trôi chảy tự nhiên!',
    });
  }

  // Generate highlighted text
  const targetWords = targetText.split('');
  const userWords = userTranscript.split('');
  const highlightedText: HighlightedWord[] = [];

  const normalTarget = normalizeText(targetText);
  const normalUser = normalizeText(userTranscript);

  let ti = 0, ui = 0;
  while (ti < normalTarget.length || ui < normalUser.length) {
    if (ti < normalTarget.length && ui < normalUser.length) {
      if (normalTarget[ti] === normalUser[ui]) {
        highlightedText.push({ word: normalUser[ui], status: 'correct' });
        ti++;
        ui++;
      } else {
        highlightedText.push({ 
          word: normalUser[ui], 
          status: 'incorrect',
          expected: normalTarget[ti]
        });
        ti++;
        ui++;
      }
    } else if (ui < normalUser.length) {
      highlightedText.push({ word: normalUser[ui], status: 'extra' });
      ui++;
    } else {
      highlightedText.push({ word: normalTarget[ti], status: 'missing' });
      ti++;
    }
  }

  return {
    accuracy,
    duration,
    rhythm,
    fluency,
    overall,
    feedback,
    highlightedText,
  };
};

export default PronunciationAnalysis;
