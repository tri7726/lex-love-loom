import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getKanaStrokes, hasKanaStrokeData, KanaStrokeData } from '@/utils/kanaStrokeData';

interface KanaStrokeCanvasProps {
  kana: string;
  size?: number;
  onSuccess?: (score: number) => void;
}

export const KanaStrokeCanvas: React.FC<KanaStrokeCanvasProps> = ({
  kana,
  size = 300,
  onSuccess,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [strokeData, setStrokeData] = useState<KanaStrokeData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const lastPos = useRef<{ x: number; y: number } | null>(null);
  // Store user stroke paths for scoring
  const userPaths = useRef<{ x: number; y: number }[][]>([]);
  const currentPath = useRef<{ x: number; y: number }[]>([]);

  // Scale factor from KanjiVG viewBox to canvas size
  const scale = strokeData ? size / strokeData.viewBox.width : 1;

  // Load stroke data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setStrokeData(null);
    setScore(null);
    setDone(false);
    setHasDrawn(false);
    userPaths.current = [];
    currentPath.current = [];

    if (!hasKanaStrokeData(kana)) {
      setError(true);
      setLoading(false);
      return;
    }

    getKanaStrokes(kana)
      .then(data => {
        if (!cancelled) {
          setStrokeData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [kana]);

  // Clear canvas on new kana
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [kana]);

  const getCanvasPos = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (done) return;
    const pos = getCanvasPos(e);
    if (!pos) return;
    setIsDrawing(true);
    setHasDrawn(true);
    lastPos.current = pos;
    currentPath.current = [pos];
  }, [done, getCanvasPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || done) return;
    const pos = getCanvasPos(e);
    if (!pos || !lastPos.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = pos;
    currentPath.current.push(pos);
  }, [isDrawing, done, getCanvasPos]);

  const handlePointerUp = useCallback(() => {
    if (isDrawing && currentPath.current.length > 0) {
      userPaths.current.push([...currentPath.current]);
    }
    setIsDrawing(false);
    lastPos.current = null;
    currentPath.current = [];
  }, [isDrawing]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
    setScore(null);
    setDone(false);
    userPaths.current = [];
    currentPath.current = [];
  }, []);

  const computeScore = useCallback((): number => {
    const canvas = canvasRef.current;
    if (!canvas || !strokeData) return 0;

    const w = canvas.width;
    const h = canvas.height;

    // Canvas A: reference strokes (transparent background — no fillRect)
    const refCanvas = document.createElement('canvas');
    refCanvas.width = w;
    refCanvas.height = h;
    const refCtx = refCanvas.getContext('2d');
    if (!refCtx) return 0;

    refCtx.strokeStyle = '#000000';
    refCtx.lineWidth = 8;
    refCtx.lineCap = 'round';
    refCtx.lineJoin = 'round';

    strokeData.strokes.forEach(d => {
      try {
        const path = new Path2D(d);
        refCtx.stroke(path);
      } catch {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', String(w));
        svg.setAttribute('height', String(h));
        svg.setAttribute('viewBox', `0 0 ${strokeData.viewBox.width} ${strokeData.viewBox.height}`);
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', d);
        pathEl.setAttribute('stroke', '#000000');
        pathEl.setAttribute('stroke-width', '1.5');
        pathEl.setAttribute('fill', 'none');
        svg.appendChild(pathEl);
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        refCtx.drawImage(img, 0, 0);
      }
    });

    // Canvas B: user drawing (transparent background)
    const userCanvas = document.createElement('canvas');
    userCanvas.width = w;
    userCanvas.height = h;
    const userCtx = userCanvas.getContext('2d');
    if (!userCtx) return 0;

    userCtx.drawImage(canvas, 0, 0);

    // Compare pixel data via alpha channel (no white fill — transparent bg = alpha 0 where no ink)
    const refData = refCtx.getImageData(0, 0, w, h).data;
    const userData = userCtx.getImageData(0, 0, w, h).data;

    let refInk = 0;
    let overlap = 0;
    let userInk = 0;

    for (let i = 3; i < refData.length; i += 4) {
      if (refData[i] > 0) refInk++;
      if (userData[i] > 0) userInk++;
      if (refData[i] > 0 && userData[i] > 0) overlap++;
    }

    // F1 score combining recall (did user cover the ref?) and precision (did user draw extra?)
    if (refInk === 0 && userInk === 0) return 100;
    if (refInk === 0 || userInk === 0) return 0;

    const recall = overlap / refInk;
    const precision = overlap / userInk;
    if (recall === 0 || precision === 0) return 0;

    const f1 = 2 * (precision * recall) / (precision + recall);
    return Math.round(f1 * 100);
  }, [strokeData]);

  const handleFinish = useCallback(() => {
    if (!hasDrawn) {
      setScore(0);
      setDone(true);
      if (onSuccess) onSuccess(0);
      return;
    }
    const s = computeScore();
    setScore(s);
    setDone(true);
    if (onSuccess) onSuccess(s);
  }, [hasDrawn, computeScore, onSuccess]);

  // Stroke number labels
  const strokeLabels = strokeData?.strokes.map((d, i) => (
    <text
      key={i}
      x={10}
      y={18 + i * 18}
      fontSize={11}
      fill="#f43f5e"
      fontWeight="bold"
      fontFamily="sans-serif"
    >
      {i + 1}
    </text>
  ));

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Character label */}
      <div className="text-center">
        <span className="text-4xl font-jp font-black text-foreground/80">{kana}</span>
        <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-0.5">
          Tập viết theo nét
        </p>
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-[2rem]">
            <Loader2 className="h-8 w-8 animate-spin text-sakura/60" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-[2rem]">
            <p className="text-sm text-muted-foreground">Không có dữ liệu nét cho ký tự này</p>
          </div>
        )}

        {/* SVG stroke guidelines */}
        {strokeData && !loading && (
          <svg
            viewBox={`0 0 ${strokeData.viewBox.width} ${strokeData.viewBox.height}`}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ filter: 'url(#kana-blur)' }}
          >
            {/* Background */}
            <rect width="100%" height="100%" fill="white" rx="24" />
            <g opacity="0.2">
              {strokeData.strokes.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="#f43f5e" strokeWidth="1.8" />
              ))}
            </g>
            {strokeLabels && (
              <g opacity="0.5">
                {strokeLabels}
              </g>
            )}
          </svg>
        )}

        {/* Drawing canvas */}
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={cn(
            'absolute inset-0 z-10 rounded-[2rem] cursor-crosshair touch-none',
            done && 'pointer-events-none opacity-60'
          )}
          style={{ background: 'transparent' }}
        />
      </div>

      {/* Score result */}
      <AnimatePresence>
        {done && score !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2"
          >
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold',
              score >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            )}>
              <CheckCircle2 className="h-4 w-4" />
              Độ chính xác: {score}%
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-3">
        {!done && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!hasDrawn}
              className="gap-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border-sakura/20"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Xóa
            </Button>
            <Button
              onClick={handleFinish}
              disabled={!hasDrawn}
              className="gap-1.5 rounded-xl bg-gradient-to-r from-rose-400 to-pink-400 text-white text-[10px] font-bold uppercase tracking-wider shadow-md"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn thành
            </Button>
          </>
        )}
        {done && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-sakura" />
            Tự động chuyển nét tiếp theo...
          </div>
        )}
      </div>
    </div>
  );
};
