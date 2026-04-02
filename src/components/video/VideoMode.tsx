import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTTS } from '@/hooks/useTTS';
import { AnalysisPanel } from './AnalysisPanel';
import { supabase } from '@/integrations/supabase/client';

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
}) => {
  const { speak, isSpeaking, stop, isSupported } = useTTS({ lang: 'ja-JP' });

  if (!currentSegment) return null;

  return (
    <div className="space-y-4">
      {/* Current subtitle display */}
      <Card className="bg-gradient-to-br from-background to-muted/30 border-2">
        <CardContent className="p-6 text-center">
          {/* Japanese with optional furigana */}
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
                
                if (!showFurigana || vocab.length === 0) {
                  return text.split('').map((char, i) => (
                    <span
                      key={i}
                      className="inline-block hover:text-sakura transition-colors cursor-pointer"
                      onClick={() => speak(char)}
                    >
                      {char}
                    </span>
                  ));
                }

                // Simple regex-based replacement for furigana injection
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
                      <ruby className="hover:text-sakura transition-colors cursor-pointer" onClick={() => speak(part.text)}>
                        {part.text}
                        <rt className="text-xs text-sakura opacity-80 select-none">
                          {part.furigana}
                        </rt>
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
      <div className="flex items-center justify-center gap-2">
        <Button 
          variant={showFurigana ? "default" : "outline"} 
          size="sm" 
          className={`gap-1 ${showFurigana ? 'bg-sakura hover:bg-sakura/90' : ''}`}
          onClick={onToggleFurigana}
        >
          Furigana
        </Button>
        <Button 
          variant={showTranslation ? "default" : "outline"} 
          size="sm" 
          className={`gap-1 ${showTranslation ? 'bg-gold hover:bg-gold/90 border-gold/50' : ''}`}
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
      </div>
    </div>
  );
};

// export default VideoMode;
