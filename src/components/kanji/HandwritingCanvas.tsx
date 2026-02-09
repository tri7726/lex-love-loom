import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eraser, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SimplifiedCanvasProps {
  kanji: string;
  onStrokeComplete?: (strokes: any[]) => void;
  onValidate?: () => void;
}

const SimplifiedCanvas: React.FC<SimplifiedCanvasProps> = ({
  kanji,
  onStrokeComplete,
  onValidate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<any[]>([]);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const { toast } = useToast();

  const CANVAS_SIZE = 400;

  React.useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setContext(ctx);
        
        // Draw background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        // Draw grid
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let i = 1; i < 3; i++) {
          const x = (CANVAS_SIZE / 3) * i;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_SIZE);
          ctx.stroke();
        }
        
        // Horizontal lines
        for (let i = 1; i < 3; i++) {
          const y = (CANVAS_SIZE / 3) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_SIZE, y);
          ctx.stroke();
        }
        
        // Draw guide kanji
        ctx.fillStyle = '#e8e8e8';
        ctx.font = '300px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(kanji, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        
        // Set drawing style
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [kanji]);

 const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!context || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    const newStrokes = [...strokes, Date.now()];
    setStrokes(newStrokes);
    
    if (onStrokeComplete) {
      onStrokeComplete(newStrokes);
    }
  };

  const handleClear = () => {
    if (!context || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Redraw background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Redraw grid
    context.strokeStyle = '#e0e0e0';
    context.lineWidth = 1;
    
    for (let i = 1; i < 3; i++) {
      const x = (CANVAS_SIZE / 3) * i;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, CANVAS_SIZE);
      context.stroke();
    }
    
    for (let i = 1; i < 3; i++) {
      const y = (CANVAS_SIZE / 3) * i;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(CANVAS_SIZE, y);
      context.stroke();
    }
    
    // Redraw guide
    context.fillStyle = '#e8e8e8';
    context.font = '300px "Noto Sans JP", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(kanji, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    
    // Reset drawing style
    context.strokeStyle = '#1a1a1a';
    context.lineWidth = 8;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    setStrokes([]);
    
    toast({
      title: "Canvas cleared",
      description: "Ready to practice again!",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Luyện viết Kanji</span>
          <Badge variant="outline">{strokes.length} nét</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas */}
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            className="cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            className="gap-2"
          >
            <Eraser className="h-4 w-4" />
            Clear
          </Button>

          <Button variant="outline" className="gap-2" disabled>
            <Pencil className="h-4 w-4" />
            More tools coming
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center">
          💡 Draw the kanji following the stroke order. Basic canvas (Fabric.js upgrade pending)
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplifiedCanvas;
