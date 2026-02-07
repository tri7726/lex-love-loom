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
  Monitor,
  MonitorOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import KanaKeyboard from '@/components/KanaKeyboard';
import KanjiSuggestions from '@/components/KanjiSuggestions';
import { useKanaInput, KanaMode } from '@/hooks/useKanaInput';
import { useKanjiLookup } from '@/hooks/useKanjiLookup';
import { compareStrings, calculateScore, DiffResult } from '@/lib/stringComparison';

interface Segment {
  id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  japanese_text: string;
  vietnamese_text: string | null;
}

interface DictationModeProps {
  segments: Segment[];
  currentIndex: number;
  completedSegments: Set<number>;
  onIndexChange: (index: number) => void;
  onPlaySegment: () => void;
  onComplete: (score: number) => void;
  playerReady: boolean;
}

interface KanjiSuggestion {
  kanji: string;
  reading: string;
  meaning: string;
  source?: string;
}

const DictationMode: React.FC<DictationModeProps> = ({
  segments,
  currentIndex,
  completedSegments,
  onIndexChange,
  onPlaySegment,
  onComplete,
  playerReady,
}) => {
  const [userInput, setUserInput] = useState('');
  const [hasChecked, setHasChecked] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult[]>([]);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [hideVideo, setHideVideo] = useState(false);
  
  // Cursor management
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
  }, [userInput, localSuggestions.length, hasChecked]);

  // Reset state when segment changes
  useEffect(() => {
    setUserInput('');
    setHasChecked(false);
    setDiffResult([]);
    setScore(0);
    setShowHint(false);
    setShowAnswer(false);
    setCursorPos(null);
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

  const handleCheck = () => {
    if (!currentSegment || !userInput.trim()) return;
    
    // Auto-normalize half-width/full-width before checking?
    // The compareStrings utility already handles normalization.

    const diff = compareStrings(userInput, currentSegment.japanese_text);
    const segmentScore = calculateScore(userInput, currentSegment.japanese_text);
    
    setDiffResult(diff);
    setScore(segmentScore);
    setHasChecked(true);
    onComplete(segmentScore);
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
      {/* Header with segment info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Chép chính tả
          </span>
          <Badge variant="outline" className="font-mono">
            Câu {currentIndex + 1}/{segments.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHideVideo(!hideVideo)}
            className="gap-1"
          >
            {hideVideo ? <Monitor className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
            {hideVideo ? 'Hiện video' : 'Ẩn video'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const event = new CustomEvent('toggle-subtitle-panel');
              window.dispatchEvent(event);
            }}
          >
            Phím tắt
          </Button>
        </div>
      </div>

      {/* Segment selector (horizontal scroll) */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {segments.map((_, index) => {
            const isActive = index === currentIndex;
            const isCompleted = completedSegments.has(index);
            
            return (
              <Button
                key={index}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={`
                  h-8 min-w-[60px] flex-shrink-0
                  ${isActive ? 'bg-matcha hover:bg-matcha/90' : ''}
                  ${isCompleted && !isActive ? 'border-matcha/50 text-matcha' : ''}
                `}
                onClick={() => onIndexChange(index)}
              >
                Câu {index + 1}
              </Button>
            );
          })}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleNext}
            disabled={currentIndex === segments.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
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
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHint(!showHint)}
            className="h-10 w-10"
          >
            <Lightbulb className={`h-5 w-5 ${showHint ? 'text-gold fill-gold' : ''}`} />
          </Button>
          
          <Button
            size="lg"
            className="gap-2 px-8 bg-matcha hover:bg-matcha/90 text-white"
            onClick={onPlaySegment}
            disabled={!playerReady}
          >
            <Play className="h-5 w-5" />
            Phát lại
          </Button>
          
          <Button
            variant={hasChecked ? 'default' : 'outline'}
            size="lg"
            className="gap-2 px-6"
            onClick={hasChecked ? handleNext : handleCheck}
            disabled={!hasChecked && !userInput.trim()}
          >
            {hasChecked ? (
              <>
                Tiếp
                <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              'Kiểm tra'
            )}
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
          {showHint && currentSegment.vietnamese_text && (
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
              <p className="font-jp text-lg">{currentSegment.japanese_text}</p>
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
                <span className="text-xl font-bold">
                  {score}%
                </span>
                {score >= 90 && (
                  <Badge className="bg-matcha text-white">Chính xác!</Badge>
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
                <p className="font-jp text-lg text-primary font-medium">{currentSegment.japanese_text}</p>
                {currentSegment.vietnamese_text && (
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

export default DictationMode;
