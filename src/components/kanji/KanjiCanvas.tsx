import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Eraser, 
  RotateCcw, 
  Check, 
  PenTool,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface KanjiCanvasProps {
  kanji: string;
  meaning: string;
  onComplete?: () => void;
  showGuide?: boolean;
}

export const KanjiCanvas = ({ kanji, meaning, onComplete, showGuide = true }: KanjiCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 12;
        ctx.strokeStyle = '#3b82f6'; // Indigo 500
        setContext(ctx);
      }
    }
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    context?.beginPath();
    context?.moveTo(pos.x, pos.y);
  }, [context]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    context?.lineTo(pos.x, pos.y);
    context?.stroke();
  }, [isDrawing, context]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    context?.closePath();
  }, [context]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Luyện viết</h4>
          <p className="text-2xl font-jp font-bold flex items-center gap-3">
            {kanji}
            <span className="text-sm font-medium text-muted-foreground">({meaning})</span>
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-2">
             <RotateCcw className="h-4 w-4" />
             Làm lại
           </Button>
           <Button variant="outline" size="sm" className="gap-2">
             <Info className="h-4 w-4" />
             Thứ tự nét
           </Button>
        </div>
      </div>

      <div className="relative group">
        {/* Transparent Placeholder Background Kanji */}
        {showGuide && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-10">
            <span className="text-[200px] font-jp font-bold leading-none">{kanji}</span>
          </div>
        )}
        
        <div className="absolute inset-0 border-2 border-dashed border-muted-foreground/20 rounded-2xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-muted-foreground/10 pointer-events-none" />
        <div className="absolute top-0 left-1/2 h-full border-l border-dashed border-muted-foreground/10 pointer-events-none" />

        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="relative z-10 w-full aspect-square bg-transparent cursor-crosshair rounded-2xl touch-none"
        />
        
        <div className="absolute bottom-4 right-4 z-20 flex gap-2">
           <Button className="rounded-full h-12 w-12 bg-matcha hover:bg-matcha/90 shadow-matcha" size="icon" onClick={onComplete}>
             <Check className="h-6 w-6" />
           </Button>
        </div>
      </div>
      
      <div className="bg-muted/50 p-3 rounded-lg flex items-start gap-3 text-xs text-muted-foreground">
        <PenTool className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          {showGuide 
            ? "Vẽ đè lên khung mờ theo các ô vuông hướng dẫn để rèn luyện độ chính xác của nét chữ."
            : "Viết chữ Kanji này từ trí nhớ của bạn. Hãy chú ý đến cấu trúc và sự cân đối!"}
        </p>
      </div>
    </div>
  );
};
