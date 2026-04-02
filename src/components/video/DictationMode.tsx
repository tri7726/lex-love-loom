import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Eye,
  EyeOff,
  Lightbulb,
  CheckCircle,
  XCircle,
  Keyboard,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { KanaKeyboard } from '@/components/KanaKeyboard';
import { KanjiSuggestions } from '@/components/KanjiSuggestions';
import { useKanaInput, KanaMode } from '@/hooks/useKanaInput';
import { useKanjiLookup } from '@/hooks/useKanjiLookup';
import { useXP } from '@/hooks/useXP';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { compareStrings, calculateScore, DiffResult } from '@/lib/stringComparison';
import { toast } from 'sonner';

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

interface Segment {
  id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  japanese_text: string;
  vietnamese_text: string | null;
  vocabulary: Array<{ word: string; reading: string; meaning: string }>;
}

interface DictationModeProps {
  segments: Segment[];
  currentIndex: number;
  completedSegments: Set<number>;
  onIndexChange: (index: number) => void;
  onPlaySegment: () => void;
  onComplete: (score: number) => void;
  playerReady: boolean;
  showFurigana?: boolean;
  showTranslation?: boolean;
  videoId?: string; // for saving progress
}

interface KanjiSuggestion {
  kanji: string;
  reading: string;
  meaning: string;
  source?: string;
}

export const DictationMode: React.FC<DictationModeProps> = ({
  segments,
  currentIndex,
  completedSegments,
  onIndexChange,
  onPlaySegment,
  onComplete,
  playerReady,
  showFurigana = false,
  showTranslation = true,
  videoId,
}) => {
  const [userInput, setUserInput] = useState('');
  const [hasChecked, setHasChecked] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult[]>([]);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { awardXP } = useXP();
  const { user } = useAuth();
  const { mode: kanaMode, cycleMode, processInput, getKanjiSuggestions } = useKanaInput();
  const { suggestions: apiSuggestions, isLoading: isLookupLoading, lookupKanji, clearSuggestions } = useKanjiLookup();

  const currentSegment = segments[currentIndex];
  
  // Combine local and API suggestions
  const localSuggestions = getKanjiSuggestions(userInput);
  const allSuggestions: KanjiSuggestion[] = [
    ...localSuggestions.map(s => ({ ...s, source: 'local' })),
    ...apiSuggestions.filter(api => !localSuggestions.some(local => local.kanji === api.kanji)),
  ];

  // Lookup from API when local suggestions are empty
  useEffect(() => {
    if (userInput.length >= 2 && localSuggestions.length === 0 && !hasChecked) {
      lookupKanji(userInput);
    } else if (userInput.length < 2) {
      clearSuggestions();
    }
  }, [userInput, localSuggestions.length, hasChecked, lookupKanji, clearSuggestions]);

  // Reset state when segment changes
  useEffect(() => {
    setUserInput('');
    setHasChecked(false);
    setDiffResult([]);
    setScore(0);
    setShowHint(false);
    setShowAnswer(false);
    setCursorPos(null);
    setXpEarned(0);
  }, [currentIndex]);

  // Restore cursor position after render
  useLayoutEffect(() => {
    if (inputRef.current && cursorPos !== null) {
      inputRef.current.setSelectionRange(cursorPos, cursorPos);
    }
  }, [userInput, cursorPos]);

  const handleKanjiSelect = (kanji: string) => {
    setUserInput(kanji);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const selectionStart = e.target.selectionStart || newValue.length;
    
    // Process input with cursor awareness
    const { text, cursor } = processInput(newValue, selectionStart);
    
    setUserInput(text);
    setCursorPos(cursor);
  };

  const handleCheck = async () => {
    if (!currentSegment || !userInput.trim()) return;
    
    const diff = compareStrings(userInput, currentSegment.japanese_text);
    const segmentScore = calculateScore(userInput, currentSegment.japanese_text);
    
    setDiffResult(diff);
    setScore(segmentScore);
    setHasChecked(true);
    onComplete(segmentScore);

    // Save progress + award XP
    if (user && currentSegment.id) {
      const xp = segmentScore >= 90 ? 15 : segmentScore >= 70 ? 8 : 3;
      setXpEarned(xp);

      // Save to user_video_progress
      await (supabase as any).from('user_video_progress').upsert({
        user_id: user.id,
        segment_id: currentSegment.id,
        user_input: userInput,
        score: segmentScore,
        status: segmentScore >= 70 ? 'completed' : 'attempted',
        last_practiced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,segment_id' });

      // Award XP
      await awardXP('reading', xp, { video_id: videoId, segment_id: currentSegment.id, score: segmentScore });

      if (segmentScore >= 90) {
        toast.success(`Chính xác! +${xp} XP 🎉`);
      } else if (segmentScore >= 70) {
        toast(`Khá tốt! +${xp} XP`, { icon: '👍' });
      }
    }
  };

  const handleRetry = () => {
    setUserInput('');
    setHasChecked(false);
    setDiffResult([]);
    setScore(0);
    setCursorPos(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleNext = () => {
    if (currentIndex < segments.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  const handleKanaKeyPress = (char: string) => {
    setUserInput(prev => prev + char);
    inputRef.current?.focus();
  };

  const getKanaModeLabel = (mode: KanaMode): string => {
    switch (mode) {
      case 'hiragana': return 'あ';
      case 'katakana': return 'ア';
      default: return 'A';
    }
  };

  // Generate asterisk hint
  const asteriskHint = currentSegment?.japanese_text
    .split('')
    .map(() => '*')
    .join(' ');

  if (!currentSegment) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-bold">Chép chính tả</h2>
          <span className="text-sm text-muted-foreground">
            (Câu hỏi {currentIndex + 1}/{segments.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              const event = new CustomEvent('toggle-subtitle-panel');
              window.dispatchEvent(event);
            }}
          >
            <Keyboard className="h-3.5 w-3.5" />
            Phím tắt
          </Button>
        </div>
      </div>

      {/* Segment selector (horizontal scroll) */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 pb-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 flex-shrink-0 bg-muted/50 rounded-lg hover:bg-muted"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          {segments.map((_, index) => {
            const isActive = index === currentIndex;
            const isCompleted = completedSegments.has(index);
            
            return (
              <Button
                key={index}
                variant={isActive ? 'default' : 'secondary'}
                size="sm"
                className={cn(
                  'h-9 min-w-[70px] flex-shrink-0 rounded-lg transition-all',
                  isActive 
                    ? 'bg-matcha text-white hover:bg-matcha/90 border-none' 
                    : 'bg-muted/50 text-foreground hover:bg-muted border-none',
                  isCompleted && !isActive && 'text-matcha ring-1 ring-matcha/30'
                )}
                onClick={() => onIndexChange(index)}
              >
                Câu {index + 1}
              </Button>
            );
          })}
          
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 flex-shrink-0 bg-muted/50 rounded-lg hover:bg-muted"
            onClick={handleNext}
            disabled={currentIndex === segments.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Input area */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={userInput}
              onChange={handleInputChange}
              placeholder="Nhập những gì bạn nghe được..."
              className="font-jp text-lg pr-12 h-12"
              disabled={hasChecked}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !hasChecked && userInput.trim()) {
                  handleCheck();
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 font-jp text-base"
              onClick={cycleMode}
              disabled={hasChecked}
            >
              {getKanaModeLabel(kanaMode)}
            </Button>
          </div>
        </div>

        {/* Asterisk hint */}
        {!hasChecked && !showAnswer && (
          <div className="text-center">
            <p className="font-mono text-lg text-sakura tracking-widest">
              {asteriskHint}
            </p>
            <div className="h-px bg-border my-2 mx-auto w-full max-w-md" style={{ 
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, hsl(var(--border)) 4px, hsl(var(--border)) 8px)'
            }} />
          </div>
        )}

        {/* Kanji Suggestions */}
        {!hasChecked && (allSuggestions.length > 0 || isLookupLoading) && (
          <KanjiSuggestions 
            suggestions={allSuggestions} 
            onSelect={handleKanjiSelect}
            isLoading={isLookupLoading}
          />
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowHint(!showHint)}
            className={cn(
               "h-12 w-12 rounded-xl bg-muted/30 hover:bg-muted border-none",
               showHint && "text-gold bg-gold/10"
            )}
          >
            <Lightbulb className={cn("h-5 w-5", showHint && "fill-gold")} />
          </Button>
          
          <Button
            variant="secondary"
            size="lg"
            className="h-12 gap-2 px-8 rounded-xl bg-muted/50 hover:bg-muted border-none"
            onClick={onPlaySegment}
            disabled={!playerReady}
          >
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 fill-foreground" />
                <span>Phát lại</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">Space</span>
            </div>
          </Button>
          
          <Button
            variant={hasChecked ? "default" : "default"}
            size="lg"
            className={cn(
              "h-12 flex-1 sm:flex-none gap-2 px-10 rounded-xl font-bold shadow-lg border-none",
              hasChecked 
                ? "bg-matcha/20 text-matcha hover:bg-matcha/30" 
                : "bg-matcha text-white hover:bg-matcha/90 shadow-matcha/20"
            )}
            onClick={hasChecked ? handleNext : handleCheck}
            disabled={!hasChecked && !userInput.trim()}
          >
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <span>{hasChecked ? "Tiếp" : "Kiểm tra"}</span>
                {hasChecked && <ChevronRight className="h-4 w-4" />}
              </div>
              <span className="text-[10px] opacity-80 mt-0.5 font-normal">
                {hasChecked ? "Tab" : "Enter"}
              </span>
            </div>
          </Button>
        </div>

        {/* Hint & Answer buttons */}
        {!hasChecked && (
          <div className="flex justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnswer(!showAnswer)}
              className="gap-1"
            >
              {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAnswer ? 'Ẩn đáp án' : 'Xem đáp án'}
            </Button>
          </div>
        )}

        {/* Hints */}
        <AnimatePresence>
          {showHint && showTranslation && currentSegment.vietnamese_text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-gold/10 rounded-lg text-center"
            >
              <p className="text-sm">💡 {currentSegment.vietnamese_text}</p>
            </motion.div>
          )}

          {showAnswer && !hasChecked && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-muted rounded-lg text-center"
            >
              <div className="font-jp text-lg flex flex-wrap justify-center gap-1">
                {renderTextWithFurigana(currentSegment.japanese_text, currentSegment.vocabulary, showFurigana)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Display */}
        <AnimatePresence>
          {hasChecked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {/* Score */}
              <div className="flex items-center justify-center gap-3">
                {score >= 90 ? (
                  <CheckCircle className="h-6 w-6 text-matcha" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive" />
                )}
                <span className="text-xl font-bold">{score}%</span>
                {score >= 90 && <Badge className="bg-matcha text-white">Chính xác!</Badge>}
                {xpEarned > 0 && (
                  <Badge className="bg-gold/10 text-gold border-gold/20 gap-1">
                    <Zap className="h-3 w-3" /> +{xpEarned} XP
                  </Badge>
                )}
              </div>

              {/* Diff Display */}
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Kết quả của bạn:</p>
                <div className="font-jp text-lg flex flex-wrap justify-center gap-0.5">
                  {diffResult.map((item, i) => (
                    <span
                      key={i}
                      className={`
                        px-0.5 rounded
                        ${item.correct 
                          ? 'text-matcha' 
                          : 'text-orange-600 bg-orange-100 decoration-wavy decoration-orange-400 underline-offset-4'
                        }
                      `}
                    >
                      {item.char}
                    </span>
                  ))}
                </div>
              </div>

              {/* Correct Answer */}
              <div className="p-4 bg-primary/5 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Đáp án đúng:</p>
                <div className="font-jp text-lg text-primary font-medium flex flex-wrap justify-center gap-1">
                  {renderTextWithFurigana(currentSegment.japanese_text, currentSegment.vocabulary, showFurigana)}
                </div>
                {showTranslation && currentSegment.vietnamese_text && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentSegment.vietnamese_text}
                  </p>
                )}
              </div>

              {/* Retry button */}
              <div className="flex justify-center">
                <Button variant="outline" onClick={handleRetry} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Thử lại
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kana Keyboard */}
        {!hasChecked && (
          <KanaKeyboard onKeyPress={handleKanaKeyPress} />
        )}
      </div>
    </div>
  );
};

// export default DictationMode;
