import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTTS } from '@/hooks/useTTS';

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
  showFurigana?: boolean;
}

const VideoMode: React.FC<VideoModeProps> = ({
  currentSegment,
  currentIndex,
  totalSegments,
  isPlaying,
  onPlaySegment,
  onPrev,
  onNext,
  showFurigana = true,
}) => {
  const { speak, isSpeaking, stop, isSupported } = useTTS({ lang: 'ja-JP' });

  if (!currentSegment) return null;

  return (
    <div className="space-y-4">
      {/* Current subtitle display */}
      <Card className="bg-gradient-to-br from-background to-muted/30 border-2">
        <CardContent className="p-6 text-center">
          {/* Japanese with furigana */}
          <motion.div
            key={currentSegment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="font-jp text-2xl leading-relaxed">
              {currentSegment.japanese_text.split('').map((char, i) => (
                <span
                  key={i}
                  className="inline-block hover:text-sakura transition-colors cursor-pointer"
                  onClick={() => speak(char)}
                >
                  {char}
                </span>
              ))}
            </p>
            
            {/* Translation */}
            {currentSegment.vietnamese_text && (
              <p className="text-muted-foreground">
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
        <Button variant="outline" size="sm" className="gap-1">
          Phụ đề
        </Button>
        <Button variant="outline" size="sm" className="gap-1">
          Bản dịch
        </Button>
      </div>

      {/* Vocabulary & Grammar */}
      {(currentSegment.vocabulary.length > 0 || currentSegment.grammar_notes.length > 0) && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Vocabulary */}
            {currentSegment.vocabulary.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  📚 Từ vựng
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentSegment.vocabulary.map((vocab, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer hover:bg-sakura/20 transition-colors font-jp"
                      onClick={() => speak(vocab.word)}
                    >
                      {vocab.word}
                      {vocab.reading && (
                        <span className="text-muted-foreground ml-1">
                          ({vocab.reading})
                        </span>
                      )}
                      <span className="text-muted-foreground ml-1">
                        - {vocab.meaning}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Grammar */}
            {currentSegment.grammar_notes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  📖 Ngữ pháp
                </h4>
                <div className="space-y-2">
                  {currentSegment.grammar_notes.map((note, i) => (
                    <div key={i} className="text-sm p-2 bg-muted rounded">
                      <span className="font-jp font-medium">{note.point}</span>
                      <span className="mx-2">-</span>
                      <span className="text-muted-foreground">{note.explanation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VideoMode;
