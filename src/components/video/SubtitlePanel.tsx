import React from 'react';
import { motion } from 'framer-motion';
import { Play, X, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Segment {
  id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  japanese_text: string;
  vietnamese_text: string | null;
  vocabulary: Array<{ word: string; reading: string; meaning: string }>;
}

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

interface SubtitlePanelProps {
  segments: Segment[];
  currentIndex: number;
  currentTime?: number;
  completedSegments: Set<number>;
  onSegmentClick: (index: number) => void;
  onExplain?: (index: number) => void;
  onClose?: () => void;
  isOpen?: boolean;
  showFurigana?: boolean;
  showTranslation?: boolean;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SubtitlePanel: React.FC<SubtitlePanelProps> = ({
  segments,
  currentIndex,
  currentTime = 0,
  completedSegments,
  onSegmentClick,
  onExplain,
  onClose,
  isOpen = true,
  showFurigana = false,
  showTranslation = true,
}) => {
  if (!isOpen) return null;

  // Find currently playing segment based on time
  const playingIndex = segments.findIndex(
    (seg) => currentTime >= seg.start_time && currentTime <= seg.end_time
  );

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">Phụ đề</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Subtitle List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {segments.map((segment, index) => {
            const isPlaying = index === playingIndex;
            const isSelected = index === currentIndex;
            const isCompleted = completedSegments.has(index);

            return (
              <motion.button
                key={segment.id}
                onClick={() => onSegmentClick(index)}
                className={`
                  w-full text-left p-3 rounded-lg transition-all
                  flex items-start gap-2 group
                  ${isSelected 
                    ? 'bg-matcha/10 border border-matcha/30' 
                    : isPlaying
                      ? 'bg-primary/5 border border-primary/20'
                      : 'hover:bg-muted border border-transparent'
                  }
                `}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                {/* Play indicator */}
                <div className={`
                  flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                  transition-colors
                  ${isPlaying 
                    ? 'bg-matcha text-white' 
                    : isCompleted
                      ? 'bg-matcha/20 text-matcha'
                      : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                  }
                `}>
                  {isCompleted ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={`
                    font-jp text-sm leading-relaxed
                    ${isSelected || isPlaying ? 'text-foreground' : 'text-muted-foreground'}
                  `}>
                    {renderTextWithFurigana(segment.japanese_text, segment.vocabulary, showFurigana)}
                  </div>
                  {showTranslation && segment.vietnamese_text && (
                    <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-1">
                      {segment.vietnamese_text}
                    </p>
                  )}
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {formatTime(segment.start_time)}
                  </span>
                </div>

                {/* AI Explain Button */}
                {onExplain && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-matcha hover:text-matcha/80 hover:bg-matcha/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExplain(index);
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </Button>
                )}
              </motion.button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

// export default SubtitlePanel;
