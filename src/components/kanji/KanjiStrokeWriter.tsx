import React, { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, PenTool, Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface KanjiStrokeWriterProps {
  character: string;
  onComplete?: () => void;
  width?: number;
  height?: number;
}

export const KanjiStrokeWriter: React.FC<KanjiStrokeWriterProps> = ({
  character,
  onComplete,
  width = 300,
  height = 300,
}) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [mode, setMode] = useState<'demo' | 'quiz'>('demo');
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetRef.current || !character) return;

    // Clear previous content
    targetRef.current.innerHTML = '';
    setLoading(true);

    writerRef.current = HanziWriter.create(targetRef.current, character, {
      width,
      height,
      padding: 20,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 200,
      strokeColor: '#3b82f6', // primary color
      outlineColor: '#e5e7eb',
      drawingColor: '#1e40af',
      showOutline: true,
      showCharacter: true,
    });

    writerRef.current.animateCharacter().then(() => setLoading(false));

    return () => {
      if (writerRef.current) {
        // No explicit destroy in hanzi-writer but clearing ref is good
        writerRef.current = null;
      }
    };
  }, [character, width, height]);

  const handleAnimate = () => {
    if (writerRef.current) {
      writerRef.current.animateCharacter();
    }
  };

  const startQuiz = () => {
    if (writerRef.current) {
      setMode('quiz');
      setIsQuizActive(true);
      writerRef.current.quiz({
        onComplete: (data) => {
          toast.success('Xuất sắc! Bạn đã viết đúng toàn bộ nét.', {
            icon: <Sparkles className="h-4 w-4 text-yellow-500" />
          });
          setIsQuizActive(false);
          if (onComplete) onComplete();
        }
      });
    }
  };

  const reset = () => {
    if (writerRef.current) {
      writerRef.current.cancelQuiz();
      writerRef.current.showCharacter();
      writerRef.current.showOutline();
      setMode('demo');
      setIsQuizActive(false);
      handleAnimate();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <div className="relative bg-white rounded-3xl p-4 shadow-xl border-4 border-primary/10 overflow-hidden group">
        {/* Helper Grid Background */}
        <div className="absolute inset-0 pointer-events-none border-border/20 border-dashed border-2 m-8 rounded-2xl opacity-40">
          <div className="absolute top-1/2 left-0 w-full h-px border-t border-dashed border-border -translate-y-1/2" />
          <div className="absolute top-0 left-1/2 w-px h-full border-l border-dashed border-border -translate-x-1/2" />
        </div>

        <div ref={targetRef} className="relative z-10" />
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {mode === 'quiz' && isQuizActive && (
          <div className="absolute top-4 right-4 animate-bounce">
            <PenTool className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        {mode === 'demo' ? (
          <>
            <Button 
              variant="outline" 
              onClick={handleAnimate}
              className="rounded-2xl h-12 font-bold gap-2 border-2"
            >
              <Play className="h-4 w-4" /> Xem lại
            </Button>
            <Button 
              onClick={startQuiz}
              className="rounded-2xl h-12 font-bold gap-2 shadow-lg shadow-primary/20"
            >
              <PenTool className="h-4 w-4" /> Luyện viết
            </Button>
          </>
        ) : (
          <Button 
            variant="outline" 
            onClick={reset}
            className="col-span-2 rounded-2xl h-12 font-bold gap-2 border-2"
          >
            <RotateCcw className="h-4 w-4" /> Hủy & Xem lại
          </Button>
        )}
      </div>

      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <HelpCircle className="h-3 w-3" />
          {mode === 'demo' ? "Xem thứ tự nét trước khi bắt đầu luyện tập" : "Viết theo thứ tự nét đã học"}
        </p>
      </div>
    </div>
  );
};
