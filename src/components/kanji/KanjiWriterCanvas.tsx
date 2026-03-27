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
  Volume2
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

  // Velocity Tracking
  const lastPosRef = useRef<{ x: number, y: number } | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isDrawingRef = useRef(false);

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
      showOutline: !masteryMode && showOutline,
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
  }, [kanji, size, masteryMode]);

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
        icon: <PenTool className="h-4 w-4 text-slate-900" />
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
    return { title: 'TÂN THỦ (Novice)', color: 'text-slate-400' };
  };

  const handleUndo = () => {
    if (isQuizMode) {
      toast.info('Trong chế độ Quiz, hãy quay lại hoặc bắt đầu lại!', { icon: <Info className="h-4 w-4" /> });
    } else {
      handleReset();
    }
  };

  const startQuiz = () => {
    if (writerRef.current) {
      setIsQuizMode(true);
      setIsReviewMode(false);
      setMistakeCount(0);
      writerRef.current.quiz({
        showHintAfterMisses: masteryMode ? 999 : 1,
        lenience: masteryMode ? 0.7 : 1.3,
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
        },
        onMistake: (strokeData) => {
          setMistakeCount(prev => prev + 1);
          if (onMistake) onMistake(strokeData.strokeNum);
          if ('vibrate' in navigator) navigator.vibrate(50);
          if (!masteryMode) {
            toast.error('Nét viết chưa đúng!', { icon: <AlertCircle className="h-4 w-4 text-rose-500" />, duration: 1500 });
          }
        },
      } as any);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <filter id="brush-physics">
          <feMorphology operator="erode" radius={thinningRadius} in="SourceGraphic" result="thinner" />
          <feGaussianBlur stdDeviation="0.2" in="thinner" />
        </filter>
      </svg>

      <div className={cn(
        "flex items-center gap-2 p-1.5 backdrop-blur-md rounded-2xl border transition-all duration-700 self-end mb-[-12px] z-20",
        calligraphyMode ? "bg-slate-900/90 border-slate-700 shadow-2xl scale-110" : "bg-white/40 border-white shadow-soft"
      )}>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleCalligraphy}
          className={cn("h-8 w-8 rounded-xl transition-all", calligraphyMode ? "bg-white text-slate-900 rotate-12" : "text-slate-400 hover:text-sakura")}
          title="Chế độ Thư pháp (Calligraphy)"
        >
          <PenTool className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-slate-200/20 mx-1" />
        <Button 
          variant="ghost" size="icon" onClick={toggleMastery}
          className={cn("h-8 w-8 rounded-xl transition-all", masteryMode ? "bg-rose-500 text-white shadow-sm" : "bg-sakura/10 text-sakura")}
          title={masteryMode ? "Chế độ Bắt buộc" : "Chế độ Cảm nhận"}
        >
          {masteryMode ? <Target className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </Button>
        {!calligraphyMode && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Button 
              variant="ghost" size="icon" onClick={() => setShowGrid(!showGrid)}
              className={cn("h-8 w-8 rounded-xl transition-all", showGrid ? "bg-sakura/10 text-sakura" : "text-slate-400")}
              title="Bật/Tắt Lưới"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            {!masteryMode && (
              <Button 
                variant="ghost" size="icon" onClick={() => setShowOutline(!showOutline)}
                className={cn("h-8 w-8 rounded-xl transition-all", showOutline ? "bg-sakura/10 text-sakura" : "text-slate-400")}
                title="Bật/Tắt Khung chữ"
              >
                {showOutline ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            )}
          </>
        )}
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <Button 
          variant="ghost" size="icon" onClick={handleReadWisdom}
          className="h-8 w-8 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
          title="Nghe giảng giải (Zen Reading)"
        >
          <Volume2 className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <Button 
          variant="ghost" size="icon" onClick={handleUndo}
          className={cn("h-8 w-8 rounded-xl transition-all", calligraphyMode ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-sakura hover:bg-sakura/5")}
          title="Hoàn tác/Làm lại"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative group">
        <div className={cn(
          "absolute -inset-4 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700",
          calligraphyMode ? "bg-slate-900/20" : "bg-sakura/5"
        )} />
        <div 
          ref={containerRef} 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={cn(
            "rounded-[3rem] shadow-elevated border-4 overflow-hidden relative z-10 p-4 transition-all duration-700 hover:scale-[1.02]",
            calligraphyMode ? "bg-slate-50 border-slate-200 shadow-2xl" : "bg-white/80 border-white/50 backdrop-blur-sm"
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
      </div>

      {isReviewMode && lastScore !== null && (
        <div className="w-full max-w-[360px] p-6 bg-white/60 backdrop-blur-xl rounded-[2rem] border-2 border-sakura/10 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-3 bg-sakura/10 rounded-2xl">
              <Sparkles className={cn("h-6 w-6", getArtisanTitle(lastScore!).color)} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Xếp hạng Sensei</p>
              <h4 className={cn("text-xl font-serif font-black tracking-tight", getArtisanTitle(lastScore!).color)}>
                {getArtisanTitle(lastScore!).title}
              </h4>
            </div>
            <div className="h-px w-12 bg-sakura/20" />
            <p className="text-xs text-slate-500 italic leading-relaxed">
              {lastScore >= 95 
                ? "Thật tuyệt mỹ! Hãy lắng nghe Sensei giảng giải về linh hồn của chữ này." 
                : lastScore >= 85 
                ? "Kỹ thuật của bạn rất tốt. Bạn đã mở khóa lời giảng của Sensei."
                : "Hãy luyện tập thêm để cảm nhận được sự chuyên tâm."}
            </p>
            <div className="flex gap-3 w-full mt-2">
              <Button variant="outline" onClick={handleAnimate} className="flex-1 rounded-xl border-sakura/20 text-[10px] font-black uppercase tracking-wider">Xem lại mẫu</Button>
              <Button onClick={handleReset} className="flex-1 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider">Luyện tiếp</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 w-full max-w-[360px] relative z-10">
        {!isReviewMode && (
          isQuizMode ? (
            <Button variant="outline" onClick={handleReset} className={cn(
              "flex-1 gap-2 rounded-2xl h-14 border-2 font-black text-[11px] uppercase tracking-[0.2em] transition-all",
              calligraphyMode ? "bg-slate-900 border-slate-700 text-white hover:bg-slate-800" : "border-sakura/10 bg-white/50 hover:bg-sakura/5 text-sakura"
            )}><RotateCcw className="h-4 w-4" /> Thoát Quiz</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleAnimate} className={cn(
                "flex-1 gap-2 rounded-2xl h-14 border-2 font-black text-[11px] uppercase tracking-[0.2em] transition-all",
                calligraphyMode ? "bg-slate-900 border-slate-700 text-white hover:bg-slate-800" : "border-sakura/10 bg-white/50 hover:bg-sakura/5 text-slate-500"
              )}><Play className="h-4 w-4" /> Xem mẫu</Button>
              <Button onClick={startQuiz} className={cn(
                "flex-[1.5] gap-2 rounded-2xl h-14 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all hover:scale-105 active:scale-95",
                calligraphyMode ? "bg-slate-900 text-white shadow-slate-900/20" : "bg-sakura hover:bg-sakura-dark text-white shadow-sakura/20"
              )}><HelpCircle className="h-4 w-4" /> Bắt đầu Quiz</Button>
            </>
          )
        )}
      </div>
    </div>
  );
};
