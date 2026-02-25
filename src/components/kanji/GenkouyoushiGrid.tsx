import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Eraser, RotateCcw, Pen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────── Types ─────────────────────────────── */
interface GenkouyoushiGridProps {
  character: string;
  hanviet?: string;
  meaning?: string;
  practiceCount?: number;
  traceCount?: number;
  className?: string;
  printMode?: boolean;
  /** Show drawing controls (eraser, clear). Default true in non-print mode */
  showControls?: boolean;
}

/* ──────────────────────── Interactive Draw Cell ────────────────────── */
const DrawCell: React.FC<{ size?: number; strokeColor?: string }> = ({
  size = 80,
  strokeColor = '#e87ca0',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasContent, setHasContent] = useState(false);

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e);

    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3.5 * (e.pressure > 0 ? e.pressure * 2 + 0.5 : 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos.current = pos;
    setHasContent(true);
  };

  const onPointerUp = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasContent(false);
  };

  return (
    <div className="relative aspect-square group/cell select-none">
      <canvas
        ref={canvasRef}
        width={160}
        height={160}
        className="absolute inset-0 w-full h-full touch-none cursor-crosshair z-10"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      {hasContent && (
        <button
          onClick={clear}
          className="absolute top-0.5 right-0.5 z-20 opacity-0 group-hover/cell:opacity-100 transition-opacity bg-white/90 rounded-full p-0.5 shadow-sm"
          title="Xóa ô này"
        >
          <Eraser className="h-2.5 w-2.5 text-rose-400" />
        </button>
      )}
    </div>
  );
};

/* ────────────────────────── Ghost Trace Cell ───────────────────────── */
const GhostCell: React.FC<{
  character: string;
  opacity: number;
  printMode: boolean;
}> = ({ character, opacity, printMode }) => (
  <div
    className={cn(
      'relative aspect-square flex items-center justify-center overflow-hidden',
      !printMode && 'bg-indigo-50/40 dark:bg-slate-800/30'
    )}
  >
    {/* Cross-hair guides */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: printMode ? 0.2 : 0.12 }}
    >
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-slate-400" />
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px border-t border-dashed border-slate-400" />
    </div>
    {/* Ghost character */}
    <span
      className="text-[82%] leading-none select-none font-jp font-bold"
      style={{
        opacity,
        color: printMode ? '#94a3b8' : '#818cf8',
      }}
    >
      {character}
    </span>
  </div>
);

/* ─────────────────────────── Empty Practice Cell ───────────────────── */
const EmptyCell: React.FC<{ printMode: boolean }> = ({ printMode }) => (
  <div className="relative aspect-square overflow-hidden">
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: printMode ? 0.15 : 0.08 }}
    >
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-slate-400" />
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px border-t border-dashed border-slate-400" />
    </div>
  </div>
);

/* ─────────────────────────── Main Component ────────────────────────── */
export const GenkouyoushiGrid: React.FC<GenkouyoushiGridProps> = ({
  character,
  hanviet,
  meaning,
  traceCount = 3,
  practiceCount = 7,
  className,
  printMode = false,
  showControls,
}) => {
  const totalCells = traceCount + practiceCount;
  const canShowControls = showControls ?? !printMode;
  const [drawMode, setDrawMode] = useState(true);
  const [clearKey, setClearKey] = useState(0); // bump to remount all draw cells

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'font-jp font-black leading-none',
              printMode ? 'text-4xl text-slate-900' : 'text-4xl text-slate-800 dark:text-slate-100'
            )}
          >
            {character}
          </span>
          <div className="flex flex-col gap-0.5">
            {hanviet && (
              <span
                className={cn(
                  'text-[11px] font-black uppercase tracking-widest',
                  printMode ? 'text-rose-500' : 'text-sakura'
                )}
              >
                {hanviet}
              </span>
            )}
            {meaning && (
              <span
                className={cn(
                  'text-[11px] italic',
                  printMode ? 'text-slate-500' : 'text-muted-foreground'
                )}
              >
                {meaning}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        {canShowControls && (
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setDrawMode(!drawMode)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all',
                drawMode
                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
              )}
              title={drawMode ? 'Tắt chế độ vẽ' : 'Bật chế độ vẽ'}
            >
              <Pen className="h-3 w-3" />
              Vẽ
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setClearKey(k => k + 1)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all"
              title="Xóa tất cả"
            >
              <RotateCcw className="h-3 w-3" />
              Xóa
            </motion.button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div
        className={cn(
          'grid',
          printMode
            ? 'border border-slate-300'
            : 'border rounded-xl overflow-hidden border-slate-200 dark:border-slate-700 shadow-sm'
        )}
        style={{ gridTemplateColumns: `repeat(${totalCells}, minmax(0, 1fr))` }}
      >
        {/* Trace cells (ghost characters, fading) */}
        {Array.from({ length: traceCount }).map((_, i) => {
          // Fade: 1st = full ghost, last = nearly invisible
          const opacity = 1 - (i / traceCount) * 0.82;
          return (
            <GhostCell
              key={`trace-${i}`}
              character={character}
              opacity={opacity}
              printMode={printMode}
            />
          );
        })}

        {/* Practice cells */}
        {Array.from({ length: practiceCount }).map((_, i) =>
          printMode ? (
            <EmptyCell key={`empty-${i}`} printMode={printMode} />
          ) : drawMode ? (
            <DrawCell key={`draw-${clearKey}-${i}`} />
          ) : (
            <EmptyCell key={`empty-${i}`} printMode={false} />
          )
        )}
      </div>

      {/* Progress dots when in draw mode */}
      {canShowControls && drawMode && (
        <div className="flex justify-end gap-1 pt-0.5">
          <span className="text-[9px] text-muted-foreground italic">
            Vẽ trực tiếp vào các ô trống →
          </span>
          {Array.from({ length: practiceCount }).map((_, i) => (
            <div
              key={i}
              className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
      )}
    </div>
  );
};
