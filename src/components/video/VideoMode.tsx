import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX, Sparkles, SkipForward, BookOpen, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTTS } from '@/hooks/useTTS';
import type { GrammarPoint } from '@/data/grammar-db';

interface Segment {
  id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  japanese_text: string;
  vietnamese_text: string | null;
  vocabulary: Array<{ word: string; reading: string; meaning: string }>;
  grammar_notes: Array<{ point: string; explanation: string }>;
}

interface VideoModeProps {
  currentSegment: Segment | null;
  currentIndex: number;
  totalSegments: number;
  isPlaying: boolean;
  onPlaySegment: () => void;
  onPrev: () => void;
  onNext: () => void;
  onShowAnalysis?: () => void;
  showFurigana?: boolean;
  showTranslation?: boolean;
  onToggleFurigana?: () => void;
  onToggleTranslation?: () => void;
  autoAdvance?: boolean;
  onToggleAutoAdvance?: () => void;
  matchedGrammarPoints?: GrammarPoint[];
  savedWords?: Set<string>;
  onSaveWord?: (vocab: { word: string; reading: string; meaning: string }) => void;
}

export const VideoMode: React.FC<VideoModeProps> = ({
  currentSegment,
  currentIndex,
  totalSegments,
  isPlaying,
  onPlaySegment,
  onPrev,
  onNext,
  onShowAnalysis,
  showFurigana = false,
  showTranslation = true,
  onToggleFurigana,
  onToggleTranslation,
  autoAdvance = false,
  onToggleAutoAdvance,
  matchedGrammarPoints = [],
  savedWords = new Set(),
  onSaveWord,
}) => {
  const { speak, isSpeaking, stop, isSupported } = useTTS({ lang: 'ja-JP' });

  if (!currentSegment) return null;

  return (
    <div className="space-y-4">
      {/* Segment counter */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs px-3 py-1">
          Đoạn {currentIndex + 1} / {totalSegments}
        </Badge>
        {autoAdvance && (
          <Badge className="bg-matcha/15 text-matcha text-xs border-none gap-1">
            <SkipForward className="h-3 w-3" />
            Tự động chuyển
          </Badge>
        )}
      </div>

      {/* Current subtitle display */}
      <Card className="bg-gradient-to-br from-background to-muted/30 border-2">
        <CardContent className="p-6 text-center">
          <motion.div
            key={currentSegment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="font-jp text-3xl leading-relaxed flex flex-wrap justify-center gap-1">
              {(() => {
                const text = currentSegment.japanese_text;
                const vocab = (currentSegment.vocabulary || []).sort((a, b) => b.word.length - a.word.length);

                // Build grammar pattern list sorted by length for greedy matching
                const grammarPatterns = [...(currentSegment.grammar_notes || []).map(g => g.point), ...matchedGrammarPoints.map(p => p.title)]
                  .filter(Boolean)
                  .sort((a, b) => b.length - a.length);

                // Split text by grammar patterns first, then apply furigana
                let segments: Array<{ text: string; isGrammar?: boolean; grammarTitle?: string; grammarExplanation?: string }> = [{ text }];

                // Pass 1: Split by grammar patterns (greedy match)
                if (grammarPatterns.length > 0) {
                  const newSegments: typeof segments = [];
                  segments.forEach(seg => {
                    if (seg.isGrammar) { newSegments.push(seg); return; }
                    let remaining = seg.text;
                    let pos = 0;
                    while (pos < remaining.length) {
                      let matched = false;
                      for (const gp of grammarPatterns) {
                        if (remaining.slice(pos).startsWith(gp)) {
                          if (pos > 0) newSegments.push({ text: remaining.slice(0, pos) });
                          const gpFull = matchedGrammarPoints.find(p => p.title === gp);
                          const note = currentSegment.grammar_notes?.find(g => g.point === gp);
                          newSegments.push({
                            text: gp,
                            isGrammar: true,
                            grammarTitle: gp,
                            grammarExplanation: note?.explanation || gpFull?.explanation || '',
                          });
                          remaining = remaining.slice(pos + gp.length);
                          pos = 0;
                          matched = true;
                          break;
                        }
                      }
                      if (!matched) pos++;
                    }
                    if (remaining) newSegments.push({ text: remaining });
                  });
                  segments = newSegments;
                }

                // Pass 2: Apply furigana to non-grammar text chunks
                const finalParts: Array<{ text: string; furigana?: string; isGrammar?: boolean; grammarTitle?: string; grammarExplanation?: string }> = [];
                segments.forEach(seg => {
                  if (seg.isGrammar) {
                    finalParts.push(seg);
                    return;
                  }
                  let parts: Array<{ text: string; furigana?: string }> = [{ text: seg.text }];
                  vocab.forEach(v => {
                    const newParts: typeof parts = [];
                    parts.forEach(part => {
                      if (part.furigana) { newParts.push(part); return; }
                      const subParts = part.text.split(v.word);
                      subParts.forEach((subPart, i) => {
                        if (subPart) newParts.push({ text: subPart });
                        if (i < subParts.length - 1) newParts.push({ text: v.word, furigana: v.reading });
                      });
                    });
                    parts = newParts;
                  });
                  parts.forEach(p => finalParts.push(p));
                });

                return finalParts.map((part, i) => (
                  <span key={i} className="inline-block">
                    {part.isGrammar ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <span className="relative inline-block cursor-pointer group">
                            <span className="relative z-10 px-0.5 py-0.5 rounded bg-gradient-to-r from-indigo-100/80 to-violet-100/80 text-indigo-700 border-b-2 border-indigo-300 font-bold group-hover:from-indigo-200/80 group-hover:to-violet-200/80 transition-all">
                              {part.text}
                            </span>
                          </span>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 text-sm space-y-2">
                          <p className="font-jp font-bold text-primary">{part.grammarTitle}</p>
                          {part.grammarExplanation && (
                            <p className="text-xs text-muted-foreground leading-relaxed">{part.grammarExplanation}</p>
                          )}
                        </PopoverContent>
                      </Popover>
                    ) : part.furigana ? (
                      <ruby className="hover:text-sakura transition-colors cursor-pointer" onClick={() => speak(part.text)}>
                        {part.text}
                        <rt className="text-xs text-sakura opacity-80 select-none">{part.furigana}</rt>
                      </ruby>
                    ) : (
                      part.text.split('').map((char, j) => (
                        <span
                          key={j}
                          className="hover:text-sakura transition-colors cursor-pointer"
                          onClick={() => speak(char)}
                        >
                          {char}
                        </span>
                      ))
                    )}
                  </span>
                ));
              })()}
            </div>
            
            {/* Translation */}
            {showTranslation && currentSegment.vietnamese_text && (
              <p className="text-muted-foreground text-lg border-t pt-4 border-border/40 font-sans">
                {currentSegment.vietnamese_text}
              </p>
            )}

            {/* Grammar notes inline */}
            {(currentSegment.grammar_notes?.length > 0 || matchedGrammarPoints.length > 0) && (
              <div className="flex flex-wrap justify-center gap-2 pt-3 border-t border-border/40">
                {(currentSegment.grammar_notes || []).map((note, i) => (
                  <Popover key={`ai-${i}`}>
                    <PopoverTrigger asChild>
                      <Badge variant="outline" className="text-xs font-normal gap-1 cursor-pointer hover:bg-muted transition-colors">
                        <Sparkles className="h-3 w-3 text-sakura" />
                        <span className="font-jp font-medium">{note.point}</span>
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 text-sm">
                      <p className="font-jp font-bold text-primary mb-1">{note.point}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed">{note.explanation}</p>
                    </PopoverContent>
                  </Popover>
                ))}
                {matchedGrammarPoints.map(point => (
                  <Popover key={`db-${point.id}`}>
                    <PopoverTrigger asChild>
                      <Badge variant="secondary" className="text-xs font-medium gap-1 cursor-pointer hover:bg-primary/10 transition-colors">
                        <BookOpen className="h-3 w-3" />
                        <span className="font-jp">{point.title}</span>
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-jp font-bold text-primary">{point.title}</p>
                        <Badge className="bg-sakura/10 text-sakura border-none text-[10px]">{point.level}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{point.explanation}</p>
                      <div className="bg-muted p-2 rounded-lg">
                        <code className="text-xs font-jp text-primary">{point.usage}</code>
                      </div>
                      <div className="bg-muted/50 p-2 rounded-lg text-xs">
                        <p className="font-jp">{point.example}</p>
                        <p className="text-muted-foreground mt-1">{point.translation}</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            )}
          </motion.div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <Button
          size="lg"
          onClick={onPlaySegment}
          className="gap-2 px-8"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          Phát đoạn này
        </Button>

        {isSupported && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => isSpeaking ? stop() : speak(currentSegment.japanese_text)}
          >
            {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        )}
        
        <Button
          variant="outline"
          size="icon"
          onClick={onNext}
          disabled={currentIndex === totalSegments - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Quick toggle buttons */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Button 
          variant={showFurigana ? "default" : "outline"} 
          size="sm" 
          className={cn("gap-1", showFurigana ? 'bg-sakura hover:bg-sakura/90' : '')}
          onClick={onToggleFurigana}
        >
          Furigana
        </Button>
        <Button 
          variant={showTranslation ? "default" : "outline"} 
          size="sm" 
          className={cn("gap-1", showTranslation ? 'bg-gold hover:bg-gold/90 border-gold/50' : '')}
          onClick={onToggleTranslation}
        >
          Dịch
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 border-matcha/50 text-matcha hover:bg-matcha/10"
          onClick={() => onShowAnalysis?.()}
        >
          <Sparkles className="h-3 w-3" />
          Giải thích AI
        </Button>
        {onToggleAutoAdvance && (
          <Button
            variant={autoAdvance ? "default" : "outline"}
            size="sm"
            className={cn("gap-1", autoAdvance ? 'bg-matcha hover:bg-matcha/90' : '')}
            onClick={onToggleAutoAdvance}
          >
            <SkipForward className="h-3 w-3" />
            Tự chuyển
          </Button>
        )}
      </div>

      {/* Vocabulary section */}
      {currentSegment.vocabulary && currentSegment.vocabulary.length > 0 && (
        <div className="border-t border-border/40 pt-3">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Từ vựng trong câu</p>
          <div className="flex flex-wrap gap-2">
            {currentSegment.vocabulary.map((v, i) => {
              const isSaved = savedWords.has(v.word);
              return (
                <Badge
                  key={i}
                  variant={isSaved ? "default" : "outline"}
                  className={cn(
                    "text-xs gap-1.5 py-1.5 px-3 rounded-full transition-all",
                    isSaved
                      ? "bg-sakura/15 text-sakura border-sakura/20"
                      : "border-muted-foreground/20 hover:border-sakura/30"
                  )}
                >
                  <span className="font-jp font-bold">{v.word}</span>
                  <span className="text-muted-foreground">({v.reading})</span>
                  <span className="text-muted-foreground">— {v.meaning}</span>
                  {onSaveWord && !isSaved && (
                    <button
                      onClick={() => onSaveWord(v)}
                      className="ml-1 text-[10px] font-bold text-sakura hover:text-sakura/80 hover:underline"
                    >
                      Lưu
                    </button>
                  )}
                  {isSaved && (
                    <span className="ml-1 text-[10px] text-sakura font-bold">✓</span>
                  )}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
