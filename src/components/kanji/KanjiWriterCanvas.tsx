import React, { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { Button } from '@/components/ui/button';
import {
  Play,
  RotateCcw,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Grid3X3,
  Undo2,
  Info,
  Target,
  Sparkles,
  PenTool,
  Volume2,
  SlidersHorizontal,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useBrushSound } from '@/hooks/useBrushSound';
import { useZenSpeech } from '@/hooks/useZenSpeech';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface KanjiWriterCanvasProps {
  kanji: string;
  onSuccess?: (score: number) => void;
  onMistake?: (strokeNum: number) => void;
  onStrokeComplete?: (strokeData: any) => void;
  size?: number;
  className?: string;
  difficulty?: 'easy' | 'normal' | 'hard';
  showGuide?: boolean;
  tierMode?: 'trace' | 'prompted' | 'freehand';
}

export const KanjiWriterCanvas: React.FC<KanjiWriterCanvasProps> = ({
  kanji,
  onSuccess,
  onMistake,
  onStrokeComplete,
  size = 300,
  className,
  difficulty = 'normal',
  showGuide: initialShowGuide = true,
  tierMode = 'freehand',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);

  // Core States
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);

  // Advanced Controls State
  const [showGrid, setShowGrid] = useState(true);
  const [showOutline, setShowOutline] = useState(initialShowGuide);
  const [masteryMode, setMasteryMode] = useState(false);
  const [calligraphyMode, setCalligraphyMode] = useState(false);
  const [thinningRadius, setThinningRadius] = useState(0);

  // ── Feature 3 & 5 States ──
  const [strokeResults, setStrokeResults] = useState<{strokeNum: number; correct: boolean}[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonOpacity, setComparisonOpacity] = useState(50);
  const [showStrokeDetail, setShowStrokeDetail] = useState(false);

  // Velocity Tracking
  const lastPosRef = useRef<{ x: number, y: number } | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isDrawingRef = useRef(false);

  const tierLabel: Record<string, { label: string; badge: string }> = {
    trace: { label: 'Tập tô', badge: 'bg-sky-100 text-sky-700 border-sky-200' },
    prompted: { label: 'Có gợi ý', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
    freehand: { label: 'Tự do', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  };

  // Hooks
  const { playStrokeSound } = useBrushSound();
  const { readKanjiWisdom } = useZenSpeech();

  const handleReadWisdom = () => {
    readKanjiWisdom(kanji);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;

    const now = Date.now();
    const dt = now - lastTimeRef.current;
    if (dt < 20) return;

    const curPos = { x: e.clientX, y: e.clientY };
    if (lastPosRef.current) {
      const dx = curPos.x - lastPosRef.current.x;
      const dy = curPos.y - lastPosRef.current.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const velocity = dist / dt;

      const intensity = Math.min(2.5, 0.5 + (velocity * 0.8));
      playStrokeSound(intensity);

      const targetRadius = Math.min(1.5, velocity * 0.4);
      setThinningRadius(targetRadius);
    }

    lastPosRef.current = curPos;
    lastTimeRef.current = now;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDrawingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    lastTimeRef.current = Date.now();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
    setThinningRadius(0);
  };

  useEffect(() => {
    if (!containerRef.current || !kanji) return;

    containerRef.current.innerHTML = '';
    setLoading(true);
    writerRef.current = HanziWriter.create(containerRef.current, kanji, {
      width: size,
      height: size,
      padding: 0,
      showOutline: !masteryMode && showOutline && tierMode === 'trace',
      strokeColor: '#f43f5e',
      outlineColor: '#f1f5f9',
      drawingColor: '#334155',
      strokeAnimationSpeed: 1.5,
      delayBetweenStrokes: 150,
      highlightColor: '#4f46e5',
      charDataLoader: (char, onDataLoad) => {
        fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0.1.1/${char}.json`)
          .then(res => res.json())
          .then(data => {
             setTotalStrokes(data.strokes.length);
             onDataLoad(data);
          })
          .catch(err => {
            console.error('Failed to load Japanese Kanji, fallback to Chinese', err);
            fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`)
              .then(res => res.json())
              .then(data => {
                 setTotalStrokes(data.strokes.length);
                 onDataLoad(data);
              });
          });
      }
    });

    setLoading(false);

    return () => {
      writerRef.current = null;
    };
  }, [kanji, size, masteryMode, tierMode]);

  useEffect(() => {
    if (writerRef.current) {
      if ((!masteryMode && showOutline) || isReviewMode) writerRef.current.showOutline();
      else writerRef.current.hideOutline();

      if (isReviewMode) {
        writerRef.current.showCharacter();
      }
    }
  }, [showOutline, masteryMode, isReviewMode]);

  const handleAnimate = () => {
    if (writerRef.current) {
      writerRef.current.animateCharacter();
    }
  };

  const handleReset = () => {
    if (writerRef.current) {
      writerRef.current.cancelQuiz();
      setIsQuizMode(false);
      setIsReviewMode(false);
      setLastScore(null);
      setStrokeResults([]);
      setShowComparison(false);
      setShowStrokeDetail(false);
      if (!masteryMode && showOutline) writerRef.current.showOutline();
    }
  };

  const toggleMastery = () => {
    const nextMode = !masteryMode;
    setMasteryMode(nextMode);
    toast.info(nextMode ? 'Chế độ BẮT BUỘC: Không gợi ý, độ chuẩn xác cao!' : 'Chế độ CẢM NHẬN: Có gợi ý & hỗ trợ nét vẽ.', {
      icon: nextMode ? <Target className="h-4 w-4 text-rose-500" /> : <Sparkles className="h-4 w-4 text-sakura" />
    });
  };

  const toggleCalligraphy = () => {
    const nextMode = !calligraphyMode;
    setCalligraphyMode(nextMode);
    if (nextMode) {
      setShowGrid(false);
      setShowOutline(false);
      setMasteryMode(true);
      toast.info('Bắt đầu hành trình THƯ PHÁP. Chúc bạn tĩnh tâm!', {
        icon: <PenTool className="h-4 w-4 text-foreground" />
      });
    } else {
      setShowGrid(true);
      setShowOutline(true);
      setMasteryMode(false);
    }
  };

  const getArtisanTitle = (score: number) => {
    if (score >= 95) return { title: 'DASHƯ (Grandmaster)', color: 'text-orange-500' };
    if (score >= 85) return { title: 'NGHỆ NHÂN (Artisan)', color: 'text-emerald-500' };
    if (score >= 70) return { title: 'CHUYÊN CẦN (Diligent)', color: 'text-blue-500' };
    return { title: 'TÂN THỦ (Novice)', color: 'text-muted-foreground/70' };
  };

  const handleUndo = () => {
    if (isQuizMode) {
      toast.info('Trong chế độ Quiz, hãy quay lại hoặc bắt đầu lại!', { icon: <Info className="h-4 w-4" /> });
    } else {
      handleReset();
    }
  };

  const toggleComparison = () => {
    const next = !showComparison;
    setShowComparison(next);
    if (writerRef.current) {
      if (next) {
        writerRef.current.showOutline();
      } else {
        writerRef.current.hideOutline();
      }
    }
  };

  const getQuizConfig = () => {
    switch (tierMode) {
      case 'trace':
        return { showHintAfterMisses: 0, lenience: 2.0 };
      case 'prompted':
        return { showHintAfterMisses: 1, lenience: 1.5 };
      case 'freehand':
      default:
        return {
          showHintAfterMisses: masteryMode ? 999 : 1,
          lenience: masteryMode ? 0.7 : 1.3
        };
    }
  };

  const startQuiz = () => {
    if (writerRef.current) {
      setIsQuizMode(true);
      setIsReviewMode(false);
      setMistakeCount(0);
      setStrokeResults([]);
      setShowComparison(false);
      setShowStrokeDetail(false);
      const config = getQuizConfig();
      writerRef.current.quiz({
        showHintAfterMisses: config.showHintAfterMisses,
        lenience: config.lenience,
        onComplete: (summary: any) => {
          const rawScore = 100 - (summary.totalMistakes * 15);
          const finalScore = Math.max(50, rawScore);
          setLastScore(finalScore);
          setIsReviewMode(true);
          setIsQuizMode(false);
          const appraisal = getArtisanTitle(finalScore);
          toast.success(`Hoàn thành! Xếp hạng: ${appraisal.title}`, {
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          });
          if (finalScore >= 85) {
            readKanjiWisdom(kanji);
          }
          if (onSuccess) onSuccess(finalScore);
        },
        onCorrectStroke: (strokeData) => {
           if (onStrokeComplete) onStrokeComplete(strokeData);
           playStrokeSound(1.2);
           setStrokeResults(prev => [...prev, { strokeNum: strokeData.strokeNum, correct: true }]);
        },
        onMistake: (strokeData) => {
          setMistakeCount(prev => prev + 1);
          setStrokeResults(prev => [...prev, { strokeNum: strokeData.strokeNum, correct: false }]);
          if (onMistake) onMistake(strokeData.strokeNum);
          if ('vibrate' in navigator) navigator.vibrate(50);
          if (!masteryMode) {
            toast.error('Nét viết chưa đúng!', { icon: <AlertCircle className="h-4 w-4 text-rose-500" />, duration: 1500 });
          }
        },
      } as any);
    }
  };

  // Aggregate stroke results for per-stroke display
  const aggregatedStrokes = React.useMemo(() => {
    const map = new Map<number, { attempts: number; correct: number }>();
    strokeResults.forEach(r => {
      const cur = map.get(r.strokeNum) || { attempts: 0, correct: 0 };
      cur.attempts++;
      if (r.correct) cur.correct++;
      map.set(r.strokeNum, cur);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([strokeNum, data]) => ({
        strokeNum,
        attempts: data.attempts,
        correct: data.correct,
        accuracy: Math.round((data.correct / data.attempts) * 100),
        passed: data.correct > 0,
      }));
  }, [strokeResults]);

  const tierInfo = tierLabel[tierMode];

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <filter id="brush-physics">
          <feMorphology operator="erode" radius={thinningRadius} in="SourceGraphic" result="thinner" />
          <feGaussianBlur stdDeviation="0.2" in="thinner" />
        </filter>
      </svg>

      {/* Tier indicator badge */}
      {isQuizMode && tierMode !== 'freehand' && (
        <div className={cn(
          'px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider shadow-sm animate-in fade-in slide-in-from-top-2',
          tierInfo.badge
        )}>
          {tierInfo.label}
        </div>
      )}

      <div className={cn(
        "flex items-center gap-2 p-1.5 backdrop-blur-md rounded-2xl border transition-all duration-700 self-end mb-[-12px] z-20",
        calligraphyMode ? "bg-card/90 border-border shadow-2xl scale-110" : "bg-white/40 border-white shadow-soft"
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCalligraphy}
          className={cn("h-8 w-8 rounded-xl transition-all", calligraphyMode ? "bg-white text-foreground rotate-12" : "text-muted-foreground/70 hover:text-sakura")}
          title="Chế độ Thư pháp (Calligraphy)"
        >
          <PenTool className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border/20 mx-1" />
        <Button
          variant="ghost" size="icon" onClick={toggleMastery}
          className={cn("h-8 w-8 rounded-xl transition-all", masteryMode ? "bg-rose-500 text-white shadow-sm" : "bg-sakura/10 text-sakura")}
          title={masteryMode ? "Chế độ Bắt buộc" : "Chế độ Cảm nhận"}
        >
          {masteryMode ? <Target className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </Button>
        {!calligraphyMode && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="ghost" size="icon" onClick={() => setShowGrid(!showGrid)}
              className={cn("h-8 w-8 rounded-xl transition-all", showGrid ? "bg-sakura/10 text-sakura" : "text-muted-foreground/70")}
              title="Bật/Tắt Lưới"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            {!masteryMode && (
              <Button
                variant="ghost" size="icon" onClick={() => setShowOutline(!showOutline)}
                className={cn("h-8 w-8 rounded-xl transition-all", showOutline ? "bg-sakura/10 text-sakura" : "text-muted-foreground/70")}
                title="Bật/Tắt Khung chữ"
              >
                {showOutline ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            )}
          </>
        )}
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          variant="ghost" size="icon" onClick={handleReadWisdom}
          className="h-8 w-8 rounded-xl text-muted-foreground/70 hover:text-emerald-500 hover:bg-emerald-50"
          title="Nghe giảng giải (Zen Reading)"
        >
          <Volume2 className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          variant="ghost" size="icon" onClick={handleUndo}
          className={cn("h-8 w-8 rounded-xl transition-all", calligraphyMode ? "text-muted-foreground/70 hover:text-white" : "text-muted-foreground/70 hover:text-sakura hover:bg-sakura/5")}
          title="Hoàn tác/Làm lại"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative group">
        <div className={cn(
          "absolute -inset-4 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700",
          calligraphyMode ? "bg-card/20" : "bg-sakura/5"
        )} />
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={cn(
            "rounded-[3rem] shadow-elevated border-4 overflow-hidden relative z-10 p-4 transition-all duration-700 hover:scale-[1.02]",
            calligraphyMode ? "bg-cream border-border shadow-2xl" : "bg-white/80 border-white/50 backdrop-blur-sm"
          )}
          style={{ width: size, height: size, filter: 'url(#brush-physics)', touchAction: 'none' }}
        />
        {!calligraphyMode && showGrid && (
          <div className="absolute inset-0 pointer-events-none border-sakura/10 border-dashed border-2 m-10 rounded-[2rem] opacity-30 z-20">
            <div className="absolute top-1/2 left-0 w-full h-px border-t border-dashed border-sakura/20 -translate-y-1/2" />
            <div className="absolute top-0 left-1/2 w-px h-full border-l border-dashed border-sakura/20 -translate-x-1/2" />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-[141%] h-px border-t border-dashed border-sakura/10 rotate-45" />
               <div className="w-[141%] h-px border-t border-dashed border-sakura/10 -rotate-45" />
            </div>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 backdrop-blur-md rounded-[3rem]">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 border-4 border-sakura/20 border-t-sakura rounded-full animate-spin" />
              <p className="text-[10px] font-black text-sakura uppercase tracking-widest animate-pulse">Đang nạp Hán tự...</p>
            </div>
          </div>
        )}

        {/* Comparison overlay opacity slider */}
        {isReviewMode && showComparison && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-sakura/10">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="range"
              min={0}
              max={100}
              value={comparisonOpacity}
              onChange={(e) => {
                const val = Number(e.target.value);
                setComparisonOpacity(val);
                if (writerRef.current) {
                  const svg = containerRef.current?.querySelector('svg');
                  if (svg) {
                    svg.style.opacity = String(val / 100);
                  }
                }
              }}
              className="w-24 h-1 accent-sakura cursor-pointer"
            />
            <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{comparisonOpacity}%</span>
          </div>
        )}
      </div>

      {/* ── Review / Comparison section ── */}
      {isReviewMode && lastScore !== null && (
        <div className="w-full max-w-[360px] space-y-3">
          {/* Score card */}
          <div className="p-6 bg-white/60 backdrop-blur-xl rounded-[2rem] border-2 border-sakura/10 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-3 bg-sakura/10 rounded-2xl">
                <Sparkles className={cn("h-6 w-6", getArtisanTitle(lastScore!).color)} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">Xếp hạng Sensei</p>
                <h4 className={cn("text-xl font-serif font-black tracking-tight", getArtisanTitle(lastScore!).color)}>
                  {getArtisanTitle(lastScore!).title}
                </h4>
              </div>
              <div className="h-px w-12 bg-sakura/20" />
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                {lastScore >= 95
                  ? "Thật tuyệt mỹ! Hãy lắng nghe Sensei giảng giải về linh hồn của chữ này."
                  : lastScore >= 85
                  ? "Kỹ thuật của bạn rất tốt. Bạn đã mở khóa lời giảng của Sensei."
                  : "Hãy luyện tập thêm để cảm nhận được sự chuyên tâm."}
              </p>

              {/* Comparison toggle */}
              <div className="flex items-center justify-center gap-3 w-full pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleComparison}
                  className={cn(
                    'gap-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
                    showComparison
                      ? 'bg-sakura/10 text-sakura border border-sakura/20'
                      : 'text-muted-foreground/60 hover:text-sakura'
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  {showComparison ? 'Ẩn mẫu' : 'So sánh với mẫu'}
                </Button>
              </div>

              <div className="flex gap-3 w-full mt-1">
                <Button variant="outline" onClick={handleAnimate} className="flex-1 rounded-xl border-sakura/20 text-[10px] font-black uppercase tracking-wider">Xem lại mẫu</Button>
                <Button onClick={handleReset} className="flex-1 rounded-xl bg-muted text-white text-[10px] font-black uppercase tracking-wider">Luyện tiếp</Button>
              </div>
            </div>
          </div>

          {/* Per-stroke breakdown */}
          {aggregatedStrokes.length > 0 && (
            <div className="p-4 bg-white/60 backdrop-blur-xl rounded-[2rem] border-2 border-sakura/10 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
              <button
                onClick={() => setShowStrokeDetail(!showStrokeDetail)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-sakura" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                    Chi tiết từng nét
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground/40">
                    ({aggregatedStrokes.filter(s => s.passed).length}/{aggregatedStrokes.length})
                  </span>
                </div>
                {showStrokeDetail ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />}
              </button>

              {showStrokeDetail && (
                <div className="mt-3 space-y-1.5 border-t border-sakura/10 pt-3">
                  {aggregatedStrokes.map((s) => (
                    <div key={s.strokeNum} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/50">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'h-2 w-2 rounded-full',
                          s.passed ? 'bg-emerald-400' : s.accuracy >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                        )} />
                        <span className="text-xs font-bold text-muted-foreground/70">Nét {s.strokeNum + 1}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'text-[10px] font-black',
                          s.passed ? 'text-emerald-600' : 'text-rose-500'
                        )}>
                          {s.passed ? 'Đạt' : 'Chưa đạt'}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground/40 w-8 text-right">
                          {s.accuracy}%
                        </span>
                        {s.attempts > 1 && (
                          <span className="text-[9px] text-muted-foreground/30">
                            ({s.attempts} lần)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 w-full max-w-[360px] relative z-10">
        {!isReviewMode && (
          isQuizMode ? (
            <Button variant="outline" onClick={handleReset} className={cn(
              "flex-1 gap-2 rounded-2xl h-14 border-2 font-black text-[11px] uppercase tracking-[0.2em] transition-all",
              calligraphyMode ? "bg-card border-border text-white hover:bg-muted" : "border-sakura/10 bg-white/50 hover:bg-sakura/5 text-sakura"
            )}><RotateCcw className="h-4 w-4" /> Thoát Quiz</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleAnimate} className={cn(
                "flex-1 gap-2 rounded-2xl h-14 border-2 font-black text-[11px] uppercase tracking-[0.2em] transition-all",
                calligraphyMode ? "bg-card border-border text-white hover:bg-muted" : "border-sakura/10 bg-white/50 hover:bg-sakura/5 text-muted-foreground"
              )}><Play className="h-4 w-4" /> Xem mẫu</Button>
              <Button onClick={startQuiz} className={cn(
                "flex-[1.5] gap-2 rounded-2xl h-14 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all hover:scale-105 active:scale-95",
                calligraphyMode ? "bg-card text-white shadow-slate-900/20" : "bg-sakura hover:bg-sakura-dark text-white shadow-sakura/20"
              )}><HelpCircle className="h-4 w-4" /> Bắt đầu Quiz</Button>
            </>
          )
        )}
      </div>
    </div>
  );
};
