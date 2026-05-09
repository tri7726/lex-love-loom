import React from 'react';
import { motion } from 'framer-motion';
import { Play, X, CheckCircle, Sparkles, Search, BookOpen, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ClickableText } from '@/components/dictionary/ClickableText';

interface Segment {
  id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  japanese_text: string;
  vietnamese_text: string | null;
  vocabulary: Array<{ word: string; reading: string; meaning: string }>;
}

interface VocabularyItem {
  word: string;
  reading: string;
  meaning: string;
}

const renderTextWithFurigana = (text: string, vocabulary: VocabularyItem[] | unknown[], show: boolean) => {
  if (!show || !vocabulary || vocabulary.length === 0) return text;

  const vocab = [...(vocabulary as VocabularyItem[])].sort((a, b) => (b.word?.length || 0) - (a.word?.length || 0));
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

interface GrammarNote {
  point: string;
  explanation: string;
}

interface GrammarPoint {
  id: string;
  title: string;
  level: string;
  explanation: string;
  usage: string;
  example: string;
  translation?: string;
}

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
  isEmbedded?: boolean;
  grammarNotes?: GrammarNote[];
  matchedGrammarPoints?: GrammarPoint[];
  onSaveWord?: (vocab: { word: string; reading: string; meaning: string }) => void;
  savedWords?: Set<string>;
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
  isEmbedded = false,
  grammarNotes = [],
  matchedGrammarPoints = [],
  onSaveWord,
  savedWords = new Set(),
}) => {
  const [search, setSearch] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Find currently playing segment based on time
  const playingIndex = segments.findIndex(
    (seg) => currentTime >= seg.start_time && currentTime <= seg.end_time
  );

  const filteredSegments = segments.filter(seg =>
    seg.japanese_text.toLowerCase().includes(search.toLowerCase()) ||
    (seg.vietnamese_text && seg.vietnamese_text.toLowerCase().includes(search.toLowerCase()))
  );

  // Auto-scroll to currently playing segment
  React.useEffect(() => {
    if (isOpen && playingIndex !== -1 && !search) {
      const element = document.getElementById(`segment-${playingIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [playingIndex, search, isOpen]);

  if (!isOpen) return null;

  return (
    <div className={cn(
      "h-full flex flex-col bg-background",
      !isEmbedded && "border-l"
    )}>
      {/* Header */}
      <div className="flex flex-col border-b bg-muted/30">
        <div className="flex items-center justify-between p-3 pb-2">
          <h3 className="font-semibold text-sm">Nội dung bài học</h3>
          {!isEmbedded && onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nội dung..."
              className="h-8 pl-8 text-xs bg-white/50"
            />
          </div>
        </div>
      </div>

      {/* Grammar chips for current segment */}
      {(grammarNotes.length > 0 || matchedGrammarPoints.length > 0) && currentIndex >= 0 && (
        <div className="px-3 py-2 border-b bg-muted/10">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Ngữ pháp trong câu</p>
          <div className="flex flex-wrap gap-1.5">
            {grammarNotes.map((note, i) => (
              <Popover key={`ai-${i}`}>
                <PopoverTrigger asChild>
                  <Badge variant="outline" className="text-[10px] font-normal gap-1 cursor-pointer hover:bg-muted transition-colors">
                    <Sparkles className="h-2.5 w-2.5 text-sakura" />
                    <span className="font-jp">{note.point}</span>
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-64 text-sm">
                  <p className="font-jp font-bold text-primary mb-1">{note.point}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{note.explanation}</p>
                </PopoverContent>
              </Popover>
            ))}
            {matchedGrammarPoints.map(point => (
              <Popover key={`db-${point.id}`}>
                <PopoverTrigger asChild>
                  <Badge variant="secondary" className="text-[10px] font-medium gap-1 cursor-pointer hover:bg-primary/10 transition-colors">
                    <BookOpen className="h-2.5 w-2.5" />
                    <span className="font-jp">{point.title}</span>
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-2">
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
                    {point.translation && <p className="text-muted-foreground mt-1">{point.translation}</p>}
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>
      )}

      {/* Subtitle List */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-2 space-y-1">
          {filteredSegments.map((segment) => {
            const index = segments.findIndex(s => s.id === segment.id);
            const isPlaying = index === playingIndex;
            const isSelected = index === currentIndex;
            const isCompleted = completedSegments.has(index);
            const allVocabSaved = segment.vocabulary.length > 0 &&
              segment.vocabulary.every(v => savedWords.has(v.word));
            const anyVocabSaved = segment.vocabulary.some(v => savedWords.has(v.word));

            return (
              <motion.div
                key={segment.id}
                id={`segment-${index}`}
                className={`
                  w-full text-left p-3 rounded-xl transition-all
                  flex items-start gap-3 group relative
                  ${isSelected
                    ? 'bg-matcha/10 border border-matcha/30 shadow-sm'
                    : isPlaying
                      ? 'bg-primary/5 border border-primary/20 shadow-sm'
                      : 'hover:bg-muted border border-transparent'
                  }
                `}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                {/* Play indicator */}
                <button
                  onClick={() => onSegmentClick(index)}
                  className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    transition-all shadow-sm
                    ${isPlaying
                      ? 'bg-matcha text-white scale-110'
                      : isCompleted
                        ? 'bg-matcha/20 text-matcha hover:bg-matcha hover:text-white'
                        : 'bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-8">
                  <ClickableText className={`
                    font-jp text-lg leading-relaxed tracking-wide
                    ${isSelected || isPlaying ? 'text-foreground font-medium' : 'text-foreground/80'}
                  `}>
                    {renderTextWithFurigana(segment.japanese_text, segment.vocabulary, showFurigana)}
                  </ClickableText>
                  {showTranslation && segment.vietnamese_text && (
                    <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-1">
                      {segment.vietnamese_text}
                    </p>
                  )}
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {formatTime(segment.start_time)}
                  </span>

                  {/* Vocabulary chips — visible on group hover */}
                  {segment.vocabulary.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {segment.vocabulary.map((v, vi) => {
                        const isSaved = savedWords.has(v.word);
                        return (
                          <Badge
                            key={vi}
                            variant={isSaved ? "default" : "outline"}
                            className={cn(
                              "text-[9px] gap-1 py-0.5 px-1.5 rounded-full transition-all cursor-default",
                              isSaved
                                ? "bg-sakura/15 text-sakura border-sakura/20"
                                : "border-muted-foreground/20"
                            )}
                          >
                            <span className="font-jp font-bold">{v.word}</span>
                            <span className="text-muted-foreground">({v.reading})</span>
                            {onSaveWord && !isSaved && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSaveWord(v);
                                }}
                                className="ml-0.5 text-[8px] font-bold text-sakura hover:text-sakura/80 hover:underline"
                              >
                                Lưu
                              </button>
                            )}
                            {isSaved && (
                              <CheckCircle className="h-2.5 w-2.5 text-sakura" />
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Action buttons on hover */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Save vocabulary button */}
                  {onSaveWord && segment.vocabulary.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 transition-all",
                        allVocabSaved
                          ? "text-sakura cursor-default"
                          : "text-muted-foreground hover:text-sakura hover:bg-sakura/10"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!allVocabSaved) {
                          segment.vocabulary.forEach(v => {
                            if (!savedWords.has(v.word)) {
                              onSaveWord(v);
                            }
                          });
                        }
                      }}
                      title={allVocabSaved ? "Đã lưu tất cả từ" : "Lưu từ mới"}
                    >
                      {allVocabSaved ? (
                        <BookmarkCheck className="h-3.5 w-3.5" />
                      ) : (
                        <BookmarkPlus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}

                  {/* AI Explain button */}
                  {onExplain && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => onExplain(index)}
                      title="Phân tích AI"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
