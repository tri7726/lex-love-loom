import React, { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';
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
}

export const KanjiWriterCanvas: React.FC<KanjiWriterCanvasProps> = ({
  kanji,
  onSuccess,
  onMistake,
  onStrokeComplete,
  size = 300,
  className,
  difficulty = 'normal',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !kanji) return;

    // Clear previous writer
    containerRef.current.innerHTML = '';
    
    setLoading(true);
    writerRef.current = HanziWriter.create(containerRef.current, kanji, {
      width: size,
      height: size,
      padding: 20,
      showOutline: true,
      strokeColor: '#E11D48', // Sakura / Crimson tint
      outlineColor: '#f1f5f9',
      drawingColor: '#334155',
      strokeAnimationSpeed: 1.5,
      delayBetweenStrokes: 150,
      highlightColor: '#4F46E5', // Indigo highlight
      // Using Japanese data source
      charDataLoader: (char, onDataLoad) => {
        fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0.1.1/${char}.json`)
          .then(res => res.json())
          .then(data => {
             setTotalStrokes(data.strokes.length);
             onDataLoad(data);
          })
          .catch(err => {
            console.error('Failed to load Japanese Kanji data, trying Chinese fallback...', err);
            // Fallback to default loader (Chinese data)
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
  }, [kanji, size]);

  const handleAnimate = () => {
    if (writerRef.current) {
      writerRef.current.animateCharacter();
    }
  };

  const handleReset = () => {
    if (writerRef.current) {
      writerRef.current.cancelQuiz();
      writerRef.current.showCharacter();
      writerRef.current.showOutline();
      setIsQuizMode(false);
    }
  };

  const startQuiz = () => {
    if (writerRef.current) {
      setIsQuizMode(true);
      setMistakeCount(0);
      writerRef.current.quiz({
        onComplete: (summary) => {
          // Calculate a 0-100 score
          // penalty: each mistake reduces score by 15%, minimum score 50 if all strokes completed
          const rawScore = 100 - (summary.totalMistakes * 15);
          const finalScore = Math.max(50, rawScore);

          toast.success(`Hoàn thành! Độ chuẩn xác: ${finalScore}%`, {
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          });
          
          if (onSuccess) onSuccess(finalScore);
        },
        onMistake: (strokeData) => {
          setMistakeCount(prev => prev + 1);
          if (onMistake) onMistake(strokeData.strokeNum);
          
          // Trigger subtle haptic if available
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }
          
          toast.error('Nét viết chưa đúng, hãy thử lại!', {
             icon: <AlertCircle className="h-4 w-4 text-rose-500" />,
             duration: 1500
          });
        },
        onCorrectStroke: (strokeData) => {
           if (onStrokeComplete) onStrokeComplete(strokeData);
           
           // Brush ASMR placeholder - sound could be triggered here
           // new Audio('/assets/sounds/brush-stroke.mp3').play();
        }
      });
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <div className="relative group">
        <div 
          ref={containerRef} 
          className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-slate-100 overflow-hidden"
          style={{ width: size, height: size }}
        />
        
        {/* Help Grid overlay */}
        <div className="absolute inset-0 pointer-events-none border-slate-100/50 border-dashed border-2 m-8 rounded-2xl opacity-20">
          <div className="absolute top-1/2 left-0 w-full h-px border-t border-dashed border-slate-400 -translate-y-1/2" />
          <div className="absolute top-0 left-1/2 w-px h-full border-l border-dashed border-slate-400 -translate-x-1/2" />
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-[2.5rem]">
            <div className="h-8 w-8 border-4 border-sakura/20 border-t-sakura rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex gap-3 w-full max-w-[340px]">
        {isQuizMode ? (
          <Button 
            variant="outline" 
            onClick={handleReset} 
            className="flex-1 gap-2 rounded-2xl h-14 border-2 font-black text-xs uppercase tracking-widest"
          >
            <RotateCcw className="h-4 w-4" /> Thoát Quiz
          </Button>
        ) : (
          <>
            <Button 
              variant="outline" 
              onClick={handleAnimate} 
              className="flex-1 gap-2 rounded-2xl h-14 border-2 font-black text-xs uppercase tracking-widest hover:bg-slate-50"
            >
              <Play className="h-4 w-4" /> Xem mẫu
            </Button>
            <Button 
              onClick={startQuiz} 
              className="flex-[1.5] gap-2 rounded-2xl h-14 bg-sakura hover:bg-sakura/90 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-sakura/20"
            >
              <HelpCircle className="h-4 w-4" /> Bắt đầu Quiz
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
