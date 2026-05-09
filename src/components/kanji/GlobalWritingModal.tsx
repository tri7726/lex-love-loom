import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { WordWritingLab } from './WordWritingLab';
import { X, Sparkles, PenTool, BookOpen, CheckCircle2, ChevronRight, Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LabOptions } from '@/contexts/WritingLabContext';
import { useWordLookup } from '@/hooks/useWordLookup';

interface GlobalWritingModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: string;
  getMastery?: (word: string) => number | null;
  labOptions?: LabOptions;
}

export const GlobalWritingModal: React.FC<GlobalWritingModalProps> = ({
  isOpen,
  onClose,
  word,
  getMastery,
  labOptions,
}) => {
  const { result: lookupResult, isLoading: lookupLoading, lookup, clear: clearLookup } = useWordLookup();
  const [showDict, setShowDict] = useState(false);
  const allWords = labOptions?.allWords;
  const onWordComplete = labOptions?.onWordComplete;
  const isLabSession = !!allWords && allWords.length > 0;

  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [sessionDone, setSessionDone] = useState(false);

  // Reset when modal opens with new words
  useEffect(() => {
    if (isOpen && isLabSession) {
      const startIdx = allWords.indexOf(word);
      setCurrentWordIdx(startIdx >= 0 ? startIdx : 0);
      setSessionScores([]);
      setSessionDone(false);
    }
  }, [isOpen, isLabSession, allWords, word]);

  const handleWordComplete = useCallback((score: number) => {
    const currentWord = allWords?.[currentWordIdx];
    if (currentWord && onWordComplete) {
      onWordComplete(currentWord, score);
    }
    setSessionScores(prev => [...prev, score]);
  }, [allWords, currentWordIdx, onWordComplete]);

  const handleNextWord = useCallback(() => {
    if (allWords && currentWordIdx < allWords.length - 1) {
      setCurrentWordIdx(prev => prev + 1);
    } else {
      setSessionDone(true);
    }
  }, [allWords, currentWordIdx]);

  const handleSkipWord = useCallback(() => {
    // Skip with 0 score
    handleWordComplete(0);
    handleNextWord();
  }, [handleWordComplete, handleNextWord]);

  const currentLabWord = isLabSession ? allWords![currentWordIdx] : word;
  const sessionProgress = isLabSession
    ? `${currentWordIdx + 1} / ${allWords!.length}`
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen p-0 overflow-hidden rounded-none border-none bg-cream/95 backdrop-blur-xl shadow-2xl">
        <div className="relative h-full flex flex-col md:flex-row">
          {/* Sidebar / Info */}
          <div className="w-full md:w-96 bg-sakura/5 p-10 flex flex-col justify-between border-r border-sakura/10 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <PenTool className="h-5 w-5 text-sakura" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-foreground text-lg uppercase tracking-tight">Writing Lab</h3>
                  <div className="h-0.5 w-12 bg-sakura rounded-full" />
                </div>
              </div>

              {/* Session progress badge */}
              {isLabSession && !sessionDone && (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-xl border border-sakura/10 text-xs font-black text-sakura uppercase tracking-wider">
                  <PenTool className="h-3.5 w-3.5" />
                  <span>Từ {sessionProgress}</span>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-black text-sakura/60 uppercase tracking-widest">
                  {isLabSession ? 'Đang luyện tập' : 'Đang luyện tập'}
                </p>
                <h2 className="text-6xl font-jp font-black text-foreground break-all leading-tight">
                  {currentLabWord}
                </h2>
              </div>

              {/* Session word list progress */}
              {isLabSession && !sessionDone && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                  {allWords!.map((w, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all',
                        idx === currentWordIdx
                          ? 'bg-sakura/10 text-sakura font-bold border border-sakura/20'
                          : idx < currentWordIdx
                          ? 'text-emerald-600 bg-emerald-50/50'
                          : 'text-muted-foreground/40'
                      )}
                    >
                      <span className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
                        idx === currentWordIdx ? 'bg-sakura text-white' :
                        idx < currentWordIdx ? 'bg-emerald-200 text-white' :
                        'bg-muted/30 text-muted-foreground/30'
                      )}>
                        {idx < currentWordIdx ? <CheckCircle2 className="h-3 w-3" /> : idx + 1}
                      </span>
                      <span className="truncate font-jp">{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Session complete summary */}
              {sessionDone && (
                <div className="space-y-3 p-4 bg-white/60 rounded-2xl border border-emerald-200 text-center">
                  <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-700">Hoàn thành buổi tập!</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
                      {sessionScores.filter(s => s >= 70).length}/{sessionScores.length} từ đạt yêu cầu
                    </p>
                  </div>
                  <div className="flex gap-1 justify-center">
                    {sessionScores.map((s, idx) => (
                      <span key={idx} className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black',
                        s >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        s >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      )}>
                        {s >= 80 ? 'A' : s >= 50 ? 'B' : 'C'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3 p-4 bg-white/60 rounded-2xl border border-sakura/5 text-xs text-muted-foreground italic leading-relaxed">
                  <Sparkles className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <p>"Nét chữ nết người – Hãy tập trung cao độ vào từng điểm dừng bút để đạt độ chuẩn xác nghệ nhân."</p>
                </div>

                {!sessionDone && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 rounded-xl border-sakura/20 text-foreground/70 hover:bg-sakura/5"
                    onClick={() => {
                      if (!showDict) {
                        lookup(currentLabWord);
                        setShowDict(true);
                      } else {
                        setShowDict(false);
                        clearLookup();
                      }
                    }}
                  >
                    <BookOpen className={cn("h-4 w-4", showDict ? "text-sakura" : "text-sakura")} />
                    <span className="text-xs font-bold">{showDict ? 'Ẩn từ điển' : 'Xem chi tiết từ điển'}</span>
                  </Button>
                )}

                {/* Dictionary results */}
                {showDict && (
                  <div className="p-4 rounded-2xl bg-white/80 border border-sakura/10 space-y-3 animate-in slide-in-from-top-2">
                    {lookupLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-sakura/60" />
                      </div>
                    ) : lookupResult ? (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-2xl font-jp font-black text-foreground">{lookupResult.word}</p>
                            <p className="text-sm text-muted-foreground font-jp">{lookupResult.reading}</p>
                          </div>
                          <div className="flex gap-1">
                            {lookupResult.source && (
                              <Badge variant="outline" className="text-[9px] uppercase tracking-wider h-5 text-muted-foreground/50 border-border/50">
                                {lookupResult.source}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-muted-foreground/50 hover:text-sakura"
                              onClick={() => {
                                if ('speechSynthesis' in window) {
                                  speechSynthesis.cancel();
                                  const u = new SpeechSynthesisUtterance(lookupResult.word);
                                  u.lang = 'ja-JP'; u.rate = 0.8;
                                  speechSynthesis.speak(u);
                                }
                              }}
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">{lookupResult.meaning}</p>
                        {lookupResult.hanviet && (
                          <p className="text-xs text-muted-foreground/60 italic">{lookupResult.hanviet}</p>
                        )}
                        {lookupResult.examples && lookupResult.examples.length > 0 && (
                          <div className="pt-2 border-t border-sakura/5 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Ví dụ</p>
                            {lookupResult.examples.slice(0, 2).map((ex, i) => (
                              <div key={i} className="text-xs space-y-0.5">
                                <p className="font-jp text-foreground/80">{ex.japanese}</p>
                                <p className="text-muted-foreground/60">{ex.vietnamese}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-center text-muted-foreground/50 py-2">Không tìm thấy dữ liệu từ điển cho từ này.</p>
                    )}
                  </div>
                )}

                {isLabSession && !sessionDone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 text-muted-foreground/50 hover:text-rose-400 text-[10px] font-bold uppercase tracking-wider"
                    onClick={handleSkipWord}
                  >
                    <ChevronRight className="h-3 w-3" />
                    Bỏ qua từ này
                  </Button>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={onClose}
              className="mt-8 rounded-xl h-12 text-muted-foreground/70 hover:bg-sakura/5 hover:text-sakura group transition-all"
            >
              <X className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
              Đóng Phòng Lab
            </Button>
          </div>

          {/* Main Lab Area */}
          <div className="flex-1 p-8 md:p-16 flex items-center justify-center bg-white/40 min-h-0">
            <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
              <filter id="ink-bleed">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
                <feGaussianBlur stdDeviation="0.4" />
              </filter>
            </svg>

            <audio
              autoPlay
              loop
              src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3"
              className="hidden"
              onPlay={(e) => { e.currentTarget.volume = 0.2; }}
            />

            <ScrollArea className="w-full h-full max-h-[calc(100vh-2rem)]">
              <div className="flex flex-col items-center justify-center min-h-full py-12">
                {sessionDone ? (
                  <div className="text-center space-y-8 py-16">
                    <div className="text-7xl">🎉</div>
                    <h3 className="text-3xl font-black uppercase tracking-widest">Xong hết!</h3>
                    <p className="text-muted-foreground text-lg">
                      Bạn đã luyện viết {sessionScores.length} từ.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => { setCurrentWordIdx(0); setSessionScores([]); setSessionDone(false); }}
                        className="rounded-xl border-sakura/20 h-12 px-8"
                      >
                        Luyện lại
                      </Button>
                      <Button
                        onClick={onClose}
                        className="bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-xl h-12 px-8"
                      >
                        Đóng
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ filter: 'url(#ink-bleed)' }}>
                    <WordWritingLab
                      word={currentLabWord}
                      size={540}
                      getMastery={getMastery}
                      onComplete={handleWordComplete}
                    />
                    {/* Auto-advance after completion */}
                    {sessionScores.length === currentWordIdx + 1 && (
                      <div className="mt-6 flex justify-center">
                        <Button
                          onClick={handleNextWord}
                          className="gap-2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-2xl px-10 h-14 text-base shadow-lg font-bold"
                        >
                          {currentWordIdx < (allWords?.length ?? 0) - 1 ? (
                            <>Từ tiếp theo <ChevronRight className="h-4 w-4" /></>
                          ) : (
                            <>Xem kết quả <Sparkles className="h-4 w-4" /></>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="absolute top-10 right-10 pointer-events-none opacity-20 animate-float">
          <span className="text-3xl">🌸</span>
        </div>
        <div className="absolute bottom-20 left-10 pointer-events-none opacity-10 animate-float-slow">
          <span className="text-2xl">💮</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
