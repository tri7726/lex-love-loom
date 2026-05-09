import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { lookupPitch, lookupPitchSync, splitMora, type PitchLookup, type PitchMissReason } from '@/lib/pitchAccent';

interface PitchAccentProps {
  word?: string;
  reading?: string;
  /** AI-guessed pattern (LHHH...). Used only as fallback when NHK has no entry. */
  pattern?: string;
  className?: string;
}

const MISS_LABEL: Record<PitchMissReason, string> = {
  loading: 'Đang tải dữ liệu NHK…',
  'no-reading': 'Không có cách đọc để tra',
  'not-found': 'NHK chưa có từ này — dùng AI dự đoán',
  'load-error': 'Không tải được NHK — dùng AI dự đoán',
};

const PitchAccent: React.FC<PitchAccentProps> = ({ word, reading, pattern, className }) => {
  const initial = word || reading
    ? lookupPitchSync(word || '', reading)
    : { hit: null, miss: 'no-reading' as const };
  const [hit, setHit] = useState<PitchLookup | null>(initial.hit);
  const [miss, setMiss] = useState<PitchMissReason | undefined>(initial.miss);
  const [inferredReading, setInferredReading] = useState<string | undefined>(
    initial.inferredReading ?? initial.hit?.derivedReading,
  );

  useEffect(() => {
    let cancelled = false;
    if (!word && !reading) return;
    if (hit) return;
    lookupPitch(word || '', reading).then((r) => {
      if (cancelled) return;
      setHit(r.hit);
      setMiss(r.miss);
      setInferredReading(r.inferredReading ?? r.hit?.derivedReading);
    });
    return () => { cancelled = true; };
  }, [word, reading, hit]);

  const effectiveReading = reading || hit?.derivedReading || inferredReading || '';

  const { mora, levels, source, downstep, matchType } = useMemo(() => {
    const m = splitMora(effectiveReading);
    if (!m.length) return { mora: [], levels: [] as ('H' | 'L')[], source: '' as const, downstep: undefined as number | undefined, matchType: undefined as PitchLookup['matchType'] | undefined };
    const raw = (hit?.pattern || pattern || '').toUpperCase().replace(/[^HL]/g, '');
    if (!raw) return { mora: m, levels: [], source: '' as const, downstep: undefined, matchType: undefined };
    const fallback = raw[raw.length - 1] === 'H' ? 'H' : 'L';
    const levels: ('H' | 'L')[] = m.map((_, i) =>
      raw[i] === 'H' || raw[i] === 'L' ? (raw[i] as 'H' | 'L') : (fallback as 'H' | 'L')
    );
    return {
      mora: m,
      levels,
      source: hit ? ('nhk' as const) : ('ai' as const),
      downstep: hit?.downstep,
      matchType: hit?.matchType,
    };
  }, [effectiveReading, pattern, hit]);

  if (!mora.length || !levels.length) return null;

  const cellW = 22;
  const width = mora.length * cellW + 8;
  const height = 28;
  const yHigh = 6;
  const yLow = 20;

  const points = levels.map((l, i) => ({
    x: i * cellW + cellW / 2 + 4,
    y: l === 'H' ? yHigh : yLow,
  }));

  const pathD = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');

  const downstepLabel =
    downstep === 0 ? '平板 (heiban)' : downstep === 1 ? '頭高 (atamadaka)' : downstep != null ? `${downstep}型` : '';
  const matchSuffix =
    matchType && matchType !== 'exact' ? ` · khớp ${matchType === 'stem' ? 'gốc Hán tự' : matchType === 'normalized' ? 'thân từ' : matchType === 'word-only' ? 'từ' : 'cách đọc'}` : '';
  const tooltip =
    source === 'nhk'
      ? `NHK pitch · ${downstepLabel}${matchSuffix}`
      : miss
        ? MISS_LABEL[miss]
        : 'AI dự đoán';

  return (
    <div className={cn('inline-flex flex-col items-start gap-0.5', className)} title={tooltip}>
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={pathD}
          stroke="hsl(var(--sakura))"
          strokeWidth={1.5}
          strokeDasharray={source === 'ai' ? '3 2' : undefined}
          fill="none"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="hsl(var(--sakura))" />
        ))}
      </svg>
      <div className="flex font-jp text-[11px] text-muted-foreground/80 leading-none">
        {mora.map((m, i) => (
          <span key={i} style={{ width: cellW, textAlign: 'center' }}>
            {m}
          </span>
        ))}
      </div>
      <span
        className={cn(
          'text-[8px] uppercase tracking-wider font-bold mt-0.5',
          source === 'nhk' ? 'text-sakura/70' : 'text-muted-foreground/50',
        )}
      >
        {source === 'nhk' ? `NHK${matchType && matchType !== 'exact' ? '~' : ''}` : miss === 'loading' ? '…' : 'AI'}
      </span>
    </div>
  );
};

export default PitchAccent;
