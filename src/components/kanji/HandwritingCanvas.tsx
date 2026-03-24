import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { recognizeHandwriting } from '@/utils/kanjiRecognition';
import { toast } from 'sonner';

interface HandwritingCanvasProps {
  targetKanji: string;
  onSuccess?: () => void;
  width?: number;
  height?: number;
}

export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({
  targetKanji,
  onSuccess,
  width = 300,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<number[][][]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentStroke([coords]);
    setIsCorrect(null);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a1a';

    const lastPoint = currentStroke[currentStroke.length - 1];
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    setCurrentStroke((prev) => [...prev, coords]);
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 0) {
      // Format for Google Input Tools: [[x1, x2, ...], [y1, y2, ...], [t1, t2, ...]]
      const newStroke = [
        currentStroke.map(p => Math.round(p.x)),
        currentStroke.map(p => Math.round(p.y)),
        currentStroke.map((_, i) => i * 10)
      ];
      setStrokes(prev => [...prev, newStroke]);
      setCurrentStroke([]);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
    setCurrentStroke([]);
    setIsCorrect(null);
    setResults([]);
  };

  const handleRecognize = async () => {
    if (strokes.length === 0) return;
    
    setIsRecognizing(true);
    try {
      const candidates = await recognizeHandwriting(strokes);
      setResults(candidates);
      
      const matched = candidates.includes(targetKanji);
      setIsCorrect(matched);
      
      if (matched) {
        toast.success('Xuất sắc! Bạn đã viết đúng.', {
          icon: <Sparkles className="h-4 w-4 text-yellow-500" />
        });
        if (onSuccess) onSuccess();
      } else if (candidates.length > 0) {
        toast.error(`Chưa chính xác. Có vẻ bạn đang viết: ${candidates.slice(0, 3).join(', ')}`, {
          icon: <AlertCircle className="h-4 w-4 text-red-500" />
        });
      }
    } catch (error) {
      toast.error('Lỗi nhận diện. Vui lòng thử lại.');
    } finally {
      setIsRecognizing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-full aspect-square max-w-[320px]">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn(
            "w-full h-full border-4 rounded-3xl bg-white shadow-xl cursor-crosshair touch-none transition-all duration-300",
            isCorrect === true && "border-green-400 bg-green-50/20",
            isCorrect === false && "border-red-400 bg-red-50/20",
            isCorrect === null && "border-slate-200"
          )}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
        
        {/* Helper Grid */}
        <div className="absolute inset-0 pointer-events-none border-slate-100 border-dashed border-2 m-6 rounded-2xl opacity-30">
          <div className="absolute top-1/2 left-0 w-full h-px border-t border-dashed border-slate-300 -translate-y-1/2" />
          <div className="absolute top-0 left-1/2 w-px h-full border-l border-dashed border-slate-300 -translate-x-1/2" />
        </div>

        {/* Target Kanji Ghost */}
        {isCorrect === null && strokes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5">
            <span className="text-[180px] font-jp font-bold">{targetKanji}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 w-full max-w-[320px]">
        <Button 
          variant="outline" 
          onClick={clearCanvas} 
          className="flex-1 gap-2 rounded-2xl h-12 border-2 hover:bg-slate-50 transition-all font-bold"
        >
          <RotateCcw className="h-4 w-4" />
          Làm lại
        </Button>
        <Button 
          onClick={handleRecognize} 
          className="flex-[2] gap-2 rounded-2xl h-12 shadow-lg shadow-primary/20 transition-all font-bold"
          disabled={strokes.length === 0 || isRecognizing}
        >
          {isRecognizing ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang kiểm tra...
            </span>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Kiểm tra
            </>
          )}
        </Button>
      </div>
      
      {results.length > 0 && !isCorrect && (
        <div className="text-center animate-fade-in">
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Gợi ý gần đúng</p>
          <div className="flex gap-1 justify-center">
            {results.slice(0, 5).map((r, i) => (
              <span key={i} className="h-8 w-8 flex items-center justify-center rounded-lg bg-muted text-lg font-jp">{r}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
