import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Info,
  Brain,
  Sparkles,
  Copy,
  PlayCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GrammarMasteryBadge } from '@/components/grammar/GrammarMasteryBadge';
import { cn } from '@/lib/utils';
export interface GrammarPoint {
  id: string;
  lesson?: number;
  level: string;
  title: string;
  usage: string;
  explanation: string;
  examples: Array<{ japanese: string; vietnamese: string; reading: string }>;
  comparisons?: Array<{ target: string; difference: string }>;
  category: string;
  related_ids?: string[];
  pitfall?: string;
  video_url?: string;
}

interface GrammarCardProps {
  point: GrammarPoint;
  mastery: { level?: string; progress?: number; nextReview?: string };
  showTranslation: boolean;
  isSpeaking: boolean;
  onSpeak: (text: string) => void;
  onPractice: (point: GrammarPoint) => void;
  onDeepExplain: (point: GrammarPoint) => void;
  onCopy: (text: string) => void;
  relatedPoints: GrammarPoint[];
}

export const GrammarCard: React.FC<GrammarCardProps> = ({
  point,
  mastery,
  showTranslation,
  isSpeaking,
  onSpeak,
  onPractice,
  onDeepExplain,
  onCopy,
  relatedPoints,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const isDue = mastery.nextReview && new Date(mastery.nextReview).getTime() <= Date.now() && mastery.level !== 'mastered';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Max tilt ±5 degrees — subtle 3D effect
    setRotateX((y - centerY) / centerY * -3);
    setRotateY((x - centerX) / centerX * 3);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: 0.05 }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="perspective-container"
        style={{ perspective: '1000px' }}
      >
        <Card
          className="shadow-card hover:shadow-elevated transition-all border-none overflow-hidden group"
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <div className="h-1 bg-sakura opacity-30 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2 items-center">
                <Badge className="bg-sakura/10 text-sakura border-sakura/20 font-bold px-3">
                  {point.level}
                </Badge>
                {isDue && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-[10px] px-2 animate-pulse">
                    Cần ôn
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest hidden sm:inline-block">
                  {point.category}
                </span>
              </div>
              <GrammarMasteryBadge
                level={(mastery.level as 'new' | 'learning' | 'reviewing' | 'mastered') || 'new'}
                progress={mastery.progress || 0}
              />
            </div>
            <CardTitle className="text-2xl font-bold font-jp text-primary flex items-center justify-between">
              {point.title}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-sakura/10 hover:text-sakura"
                  onClick={() => onPractice(point)}
                  title="Luyện bài tập Quiz"
                >
                  <Brain className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-indigo-500/10 hover:text-indigo-500"
                  onClick={() => onDeepExplain(point)}
                  title="Giải thích sâu ngữ pháp"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-sakura/10 hover:text-sakura"
                  onClick={() => onCopy(point.title)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="bg-background border-2 border-primary/5 p-4 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="font-medium text-foreground/90 leading-relaxed">
                  {point.explanation}
                </p>
              </div>

              {point.pitfall && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50/50 border border-amber-200/50">
                  <span className="text-amber-500 text-sm shrink-0 mt-0.5">⚠️</span>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {point.pitfall}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-dashed space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cách dùng</p>
                <code className="block text-primary font-bold text-lg font-jp">{point.usage}</code>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ví dụ</p>
              {point.examples.map((ex, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="p-4 bg-muted/30 rounded-2xl flex items-center justify-between gap-4">
                    <p className="font-jp text-xl flex-1 leading-relaxed">{ex.japanese}</p>
                    <Button
                      variant="secondary"
                      size="icon"
                      className={cn(
                        "h-10 w-10 shrink-0 rounded-xl transition-all",
                        isSpeaking ? "bg-sakura text-white" : "bg-white shadow-soft"
                      )}
                      onClick={() => onSpeak(ex.japanese)}
                    >
                      {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                  </div>
                  {showTranslation && ex.vietnamese && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 bg-sakura/5 rounded-xl border border-sakura/10 text-sm text-muted-foreground"
                    >
                      🇻🇳 {ex.vietnamese}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            {point.comparisons && point.comparisons.length > 0 && (
              <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                  <Brain className="h-3 w-3" /> So sánh ngữ pháp
                </p>
                {point.comparisons.map((comp, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-sm font-bold text-indigo-700">So với: {comp.target}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{comp.difference}</p>
                  </div>
                ))}
              </div>
            )}

            {relatedPoints.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Liên quan:</span>
                {relatedPoints.map(rel => (
                  <Badge key={rel.id} variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary/70 border-primary/10 font-medium">
                    {rel.title}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-sakura/20 text-sakura hover:bg-sakura hover:text-white transition-all gap-2 font-bold h-11"
                onClick={() => onPractice(point)}
              >
                <PlayCircle className="h-4 w-4" />
                Luyện tập ngay
              </Button>
              <Button
                className="flex-1 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all gap-2 font-bold h-11 border-indigo-500/20"
                variant="outline"
                onClick={() => onDeepExplain(point)}
              >
                <Brain className="h-4 w-4" />
                Giải thích sâu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default GrammarCard;
