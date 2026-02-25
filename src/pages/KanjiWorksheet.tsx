import React, { useState, useRef } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Download, FileText, Loader2, Sparkles, Trash2,
  Settings2, BookOpen, RefreshCw, LayoutTemplate,
  Palette, Eye, Printer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getStrokeOrder } from '@/data/strokeOrder';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────── Types ────────────────────────────── */
type PaperSize = 'a4' | 'a5' | 'letter';
type GhostColor = 'gray' | 'indigo' | 'sakura' | 'olive';
type BorderStyle = 'solid' | 'dashed';

interface SheetSettings {
  // Layout
  ghostCells: number;
  practiceCells: number;
  cellSize: number;
  paperSize: PaperSize;
  // Style
  ghostOpacityMax: number;   // 0..1 — first ghost cell opacity
  ghostOpacityMin: number;   // 0..1 — last ghost cell opacity
  ghostColor: GhostColor;
  borderWeight: number;      // 1..3 px
  borderStyle: BorderStyle;
  // Display
  showStrokeOrder: boolean;
  showHanViet: boolean;
  showMeaning: boolean;
  showStrokeCount: boolean;
  showPageFooter: boolean;
}

/* ──────────────────── Settings helper ─────────────────────────── */
const GHOST_COLORS: Record<GhostColor, string> = {
  gray:   '#555555',
  indigo: '#4f46e5',
  sakura: '#e87ca0',
  olive:  '#6b7a3e',
};

const PAPER_WIDTHS: Record<PaperSize, number> = { a4: 210, a5: 148, letter: 216 };
const PAPER_HEIGHTS: Record<PaperSize, number> = { a4: 297, a5: 210, letter: 279 };

/* ──────────────── Preset packs ────────────────────────────────── */
const PRESETS = [
  { label: 'N5 Số đếm',    icon: '🔢', chars: '一二三四五六七八九十百千万円' },
  { label: 'N5 Thiên nhiên',icon: '🌿', chars: '山川木林森花草空海雨雪風火水土' },
  { label: 'N5 Thời gian', icon: '🕐', chars: '日月年時分今午朝夜前後週' },
  { label: 'N5 Con người',  icon: '👤', chars: '人男女子母父友先生学' },
  { label: 'Ví dụ mẫu',    icon: '✏️', chars: '今玉交合歩茶弓雲算小' },
  { label: 'N5 Địa điểm',  icon: '🏠', chars: '家国会社校店駅門道中外上下' },
];

/* ──────────────── Input parser ─────────────────────────────────── */
const isKanjiChar = (ch: string): boolean => {
  const code = ch.codePointAt(0) ?? 0;
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) || (code >= 0xf900 && code <= 0xfaff);
};
const parseKanjiChars = (text: string): string[] => {
  const seen = new Set<string>(); const result: string[] = [];
  const segs = text.includes(',') ? text.split(',') : [text];
  for (const s of segs) for (const ch of s.trim()) if (isKanjiChar(ch) && !seen.has(ch)) { seen.add(ch); result.push(ch); }
  return result;
};

/* ──────────────── Font helpers ─────────────────────────────────── */
const NOTO_FONT_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap';
const ensureFontsLoaded = async () => {
  if (!document.querySelector(`link[href="${NOTO_FONT_URL}"]`)) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = NOTO_FONT_URL; document.head.appendChild(l);
  }
  try { await document.fonts.load('700 48px "Noto Sans JP"'); await document.fonts.ready; }
  catch { await new Promise(r => setTimeout(r, 1500)); }
};

/* ──────────────── Grid cell constants ──────────────────────────── */
const KANJI_FONT = '"Noto Sans JP", "Yu Gothic", "MS Gothic", sans-serif';

const Crosshair: React.FC<{ settings: SheetSettings }> = ({ settings }) => {
  const d = settings.borderStyle === 'dashed' ? '1px dashed #e0e0e0' : '1px solid #ebebeb';
  return <>
    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: d }} />
    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: d }} />
  </>;
};

/* ──────────────── WorksheetRow ─────────────────────────────────── */
interface KanjiEntry { character: string; hanviet: string; meaning: string; strokeCount?: number; }

const WorksheetRow: React.FC<{ entry: KanjiEntry; s: SheetSettings }> = ({ entry, s }) => {
  const strokeSteps = getStrokeOrder(entry.character);
  const totalCells = 1 + s.ghostCells + s.practiceCells;
  const ghostCol = GHOST_COLORS[s.ghostColor];

  const cellBase: React.CSSProperties = {
    position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: `${s.cellSize}px`, height: `${s.cellSize}px`, flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box',
  };
  const outerBorder = `${s.borderWeight}px solid #222`;
  const innerBorder = s.borderStyle === 'dashed' ? `1px dashed #ccc` : `1px solid #d0d0d0`;

  return (
    <div style={{ marginBottom: '20px', breakInside: 'avoid' }}>
      {/* Header info */}
      {(s.showHanViet || s.showMeaning || s.showStrokeCount) && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontFamily: 'Arial, sans-serif', marginBottom: '2px' }}>
          {s.showHanViet && <span style={{ fontWeight: 900, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{entry.hanviet || entry.character}</span>}
          {s.showMeaning && entry.meaning && <span style={{ fontSize: '11px', color: '#555' }}>({entry.meaning})</span>}
          {s.showStrokeCount && !strokeSteps && entry.strokeCount && <span style={{ fontSize: '9px', color: '#aaa' }}>{entry.strokeCount} nét</span>}
        </div>
      )}

      {/* Stroke order guide */}
      {s.showStrokeOrder && strokeSteps && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', fontFamily: KANJI_FONT, fontSize: '14px', color: '#333', lineHeight: 1 }}>
          {strokeSteps.map((step, i) => <span key={i}>{step}</span>)}
          {s.showStrokeCount && entry.strokeCount && <span style={{ fontSize: '9px', color: '#bbb', marginLeft: '2px', fontFamily: 'Arial' }}>{entry.strokeCount} nét</span>}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'flex', border: outerBorder, width: `${s.cellSize * totalCells}px`, boxSizing: 'border-box', backgroundColor: '#fff' }}>
        {/* Reference cell */}
        <div style={{ ...cellBase, borderRight: outerBorder }}>
          <Crosshair settings={s} />
          <span style={{ fontFamily: KANJI_FONT, fontSize: `${s.cellSize * 0.44}px`, fontWeight: 900, color: '#111', lineHeight: 1, position: 'relative' }}>
            {entry.character}
          </span>
        </div>

        {/* Ghost cells */}
        {Array.from({ length: s.ghostCells }).map((_, i) => {
          const t = s.ghostCells === 1 ? 1 : i / (s.ghostCells - 1);
          const opacity = s.ghostOpacityMax - t * (s.ghostOpacityMax - s.ghostOpacityMin);
          return (
            <div key={`g${i}`} style={{ ...cellBase, borderRight: i === s.ghostCells - 1 ? outerBorder : innerBorder, backgroundColor: '#fafafa' }}>
              <Crosshair settings={s} />
              <span style={{ fontFamily: KANJI_FONT, fontSize: `${s.cellSize * 0.37}px`, fontWeight: 400, color: ghostCol, opacity, lineHeight: 1, position: 'relative' }}>
                {entry.character}
              </span>
            </div>
          );
        })}

        {/* Empty cells */}
        {Array.from({ length: s.practiceCells }).map((_, i) => (
          <div key={`e${i}`} style={{ ...cellBase, borderLeft: i > 0 ? innerBorder : undefined }}>
            <Crosshair settings={s} />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ────────────── WorksheetPrintSheet ───────────────────────────── */
const WorksheetPrintSheet = React.forwardRef<HTMLDivElement, { entries: KanjiEntry[]; s: SheetSettings; title?: string }>(
  ({ entries, s, title }, ref) => {
    const sheetWidth = s.cellSize * (1 + s.ghostCells + s.practiceCells) + 100;
    return (
      <div ref={ref} style={{ width: `${sheetWidth}px`, backgroundColor: '#fff', padding: '36px 50px', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }}>
        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '22px', borderBottom: '2px solid #111', paddingBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.15em' }}>{title || 'KANJI WRITING PRACTICE'}</div>
            <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>Tập viết Kanji · LexLoveLoom</div>
          </div>
          <div style={{ fontSize: '10px', color: '#888', textAlign: 'right', lineHeight: 1.8 }}>
            <div>Họ tên: ______________________</div>
            <div>Ngày: {new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>
        {entries.map(entry => <WorksheetRow key={entry.character} entry={entry} s={s} />)}
        {s.showPageFooter && (
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #eee', fontSize: '9px', color: '#ccc', textAlign: 'center' }}>
            Kaizen Kanji Coach · LexLoveLoom · {new Date().getFullYear()}
          </div>
        )}
      </div>
    );
  }
);
WorksheetPrintSheet.displayName = 'WorksheetPrintSheet';

/* ──────────────── Settings panel sub-tabs ─────────────────────── */
type SettingsTab = 'layout' | 'style' | 'display' | 'export';

const TAB_META: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'layout', label: 'Bố cục', icon: <LayoutTemplate className="h-3 w-3" /> },
  { id: 'style', label: 'Kiểu dáng', icon: <Palette className="h-3 w-3" /> },
  { id: 'display', label: 'Hiển thị', icon: <Eye className="h-3 w-3" /> },
  { id: 'export', label: 'Xuất file', icon: <Printer className="h-3 w-3" /> },
];

/* ──────────────── Helper UI atoms ─────────────────────────────── */
const Row: React.FC<{ label: string; value: string; children: React.ReactNode }> = ({ label, value, children }) => (
  <div className="space-y-2">
    <div className="flex justify-between">
      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</Label>
      <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md">{value}</span>
    </div>
    {children}
  </div>
);

const Toggle: React.FC<{ label: string; desc?: string; checked: boolean; onChecked: (v: boolean) => void }> = ({ label, desc, checked, onChecked }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
    <div>
      <p className="text-xs font-semibold">{label}</p>
      {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChecked} />
  </div>
);

const ChipGroup: React.FC<{ options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)}
        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all
          ${value === o.value ? 'bg-indigo-500 text-white border-indigo-500' : 'border-slate-200 dark:border-slate-700 text-muted-foreground hover:border-indigo-300'}`}
      >{o.label}</button>
    ))}
  </div>
);

/* ──────────────── Default settings ────────────────────────────── */
const DEFAULT_SETTINGS: SheetSettings = {
  ghostCells: 9, practiceCells: 3, cellSize: 58, paperSize: 'a4',
  ghostOpacityMax: 0.75, ghostOpacityMin: 0.08,
  ghostColor: 'gray', borderWeight: 1.5, borderStyle: 'solid',
  showStrokeOrder: true, showHanViet: true, showMeaning: true,
  showStrokeCount: true, showPageFooter: true,
};

/* ──────────────── MAIN PAGE ────────────────────────────────────── */
export const KanjiWorksheet = () => {
  const [inputText, setInputText] = useState('今玉交合歩茶弓雲算小');
  const [kanjiList, setKanjiList] = useState<KanjiEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('layout');
  const [settings, setSettings] = useState<SheetSettings>(DEFAULT_SETTINGS);
  const [worksheetTitle, setWorksheetTitle] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const setSetting = <K extends keyof SheetSettings>(k: K, v: SheetSettings[K]) =>
    setSettings(s => ({ ...s, [k]: v }));

  const handleGenerate = async () => {
    const chars = parseKanjiChars(inputText);
    if (!chars.length) { toast({ title: 'Vui lòng nhập ký tự Kanji', variant: 'destructive' }); return; }
    setIsLoading(true); setKanjiList([]);
    try {
      const results = await Promise.all(chars.map(async (ch): Promise<KanjiEntry> => {
        try {
          const { data } = await supabase.functions.invoke('kanji-details', { body: { character: ch } });
          const k = data?.kanji;
          return { character: ch, hanviet: k?.hanviet || ch, meaning: k?.meaning_vi || k?.meaning || '', strokeCount: k?.stroke_count };
        } catch { return { character: ch, hanviet: ch, meaning: '' }; }
      }));
      setKanjiList(results);
    } finally { setIsLoading(false); }
  };

  const handleExportPDF = async () => {
    if (!printRef.current || !kanjiList.length) return;
    setIsExporting(true);
    try {
      toast({ title: '⏳ Đang chuẩn bị...', description: 'Đang tải font' });
      await ensureFontsLoaded();
      const el = printRef.current;
      el.style.cssText = 'position:fixed;top:-99999px;left:0;z-index:-1;display:block;';
      await new Promise(r => setTimeout(r, 400));

      const canvas = await html2canvas(el, {
        useCORS: true, allowTaint: false, backgroundColor: '#ffffff', logging: false,
        onclone: (doc) => { const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = NOTO_FONT_URL; doc.head.appendChild(l); },
      } as Parameters<typeof html2canvas>[1]);

      el.style.cssText = '';
      const pw = PAPER_WIDTHS[settings.paperSize];
      const ph = PAPER_HEIGHTS[settings.paperSize];
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pw, ph] });
      const imgW = pw, imgH = (canvas.height * pw) / canvas.width;
      let oy = 0, pg = 0;
      while (oy < imgH) {
        if (pg > 0) pdf.addPage([pw, ph]);
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -oy, imgW, imgH);
        oy += ph; pg++;
      }
      pdf.save(`kanji-ws-${Date.now()}.pdf`);
      toast({ title: '✅ PDF đã tải về!', description: `${kanjiList.length} Kanji · ${settings.paperSize.toUpperCase()}` });
    } catch (e) {
      console.error(e);
      toast({ title: 'Lỗi xuất PDF', variant: 'destructive' });
    } finally { setIsExporting(false); }
  };

  const totalCells = 1 + settings.ghostCells + settings.practiceCells;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sakura/5 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-24 md:pb-8">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-5">

        {/* Hero */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sakura/30 to-indigo-500/20 flex items-center justify-center shadow-sm">
            <FileText className="h-7 w-7 text-sakura" />
          </div>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-sakura to-indigo-500 bg-clip-text text-transparent">Kanji Worksheet Generator</h1>
            <p className="text-sm text-muted-foreground">Nhập Kanji → Hướng dẫn nét viết → Xuất PDF in được</p>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <motion.button key={p.label} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}
              onClick={() => setInputText(p.chars)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-sakura/50 hover:bg-sakura/5 transition-all shadow-sm backdrop-blur-sm"
            >
              <span>{p.icon}</span>{p.label}
            </motion.button>
          ))}
        </div>

        {/* Input card */}
        <Card className="border-0 shadow-soft bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-sakura uppercase tracking-widest">Nhập Kanji</Label>
                <span className="text-xs text-muted-foreground">{parseKanjiChars(inputText).length} ký tự</span>
              </div>
              <Textarea value={inputText} onChange={e => setInputText(e.target.value)}
                placeholder="今玉交合歩茶弓雲算小"
                className="font-jp text-2xl tracking-widest h-20 resize-none rounded-2xl border-sakura/20 focus:border-sakura" />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={handleGenerate} disabled={isLoading || !inputText.trim()}
                className="bg-gradient-to-r from-sakura to-pink-500 hover:opacity-90 text-white font-bold rounded-xl px-6">
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang tải...</> : <><Sparkles className="h-4 w-4 mr-2" />Tạo Worksheet</>}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}
                className={`gap-1.5 rounded-xl text-xs font-bold ${showSettings ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : ''}`}>
                <Settings2 className="h-3.5 w-3.5" />Nâng cao
              </Button>
              {kanjiList.length > 0 && <>
                <Button onClick={handleExportPDF} disabled={isExporting} variant="outline"
                  className="border-indigo-500/30 text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl px-5">
                  {isExporting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang xuất...</> : <><Download className="h-4 w-4 mr-2" />Tải PDF</>}
                </Button>
                <Button onClick={() => { setKanjiList([]); setInputText(''); }} variant="ghost" size="sm" className="text-muted-foreground gap-1">
                  <RefreshCw className="h-3 w-3" />Làm lại
                </Button>
                <Badge variant="secondary" className="ml-auto bg-sakura/10 text-sakura border-0 font-bold">{kanjiList.length} Kanji</Badge>
              </>}
            </div>

            {/* ── Advanced settings ── */}
            <AnimatePresence>
              {showSettings && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">

                    {/* Tab bar */}
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                      {TAB_META.map(t => (
                        <button key={t.id} onClick={() => setSettingsTab(t.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                            ${settingsTab === t.id ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-muted-foreground hover:text-slate-700'}`}>
                          {t.icon}{t.label}
                        </button>
                      ))}
                    </div>

                    {/* Tab: Layout */}
                    {settingsTab === 'layout' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Row label="Ô nét mờ (ghost)" value={`${settings.ghostCells} ô`}>
                          <Slider min={3} max={14} step={1} value={[settings.ghostCells]} onValueChange={([v]) => setSetting('ghostCells', v)} />
                        </Row>
                        <Row label="Ô trống luyện tập" value={`${settings.practiceCells} ô`}>
                          <Slider min={1} max={8} step={1} value={[settings.practiceCells]} onValueChange={([v]) => setSetting('practiceCells', v)} />
                        </Row>
                        <Row label="Kích thước ô" value={`${settings.cellSize}px`}>
                          <Slider min={44} max={80} step={2} value={[settings.cellSize]} onValueChange={([v]) => setSetting('cellSize', v)} />
                          <p className="text-[10px] text-muted-foreground">Tổng: {totalCells} ô/hàng</p>
                        </Row>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Khổ giấy</Label>
                          <ChipGroup value={settings.paperSize} onChange={v => setSetting('paperSize', v as PaperSize)}
                            options={[{ value: 'a4', label: 'A4' }, { value: 'a5', label: 'A5' }, { value: 'letter', label: 'Letter' }]} />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Tiêu đề trang</Label>
                          <input value={worksheetTitle} onChange={e => setWorksheetTitle(e.target.value)}
                            placeholder="Kanji Writing Practice"
                            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sakura/30" />
                        </div>
                      </div>
                    )}

                    {/* Tab: Style */}
                    {settingsTab === 'style' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Row label="Độ đậm chữ mờ đầu" value={`${Math.round(settings.ghostOpacityMax * 100)}%`}>
                          <Slider min={30} max={100} step={5} value={[Math.round(settings.ghostOpacityMax * 100)]}
                            onValueChange={([v]) => setSetting('ghostOpacityMax', v / 100)} />
                        </Row>
                        <Row label="Độ đậm chữ mờ cuối" value={`${Math.round(settings.ghostOpacityMin * 100)}%`}>
                          <Slider min={2} max={30} step={1} value={[Math.round(settings.ghostOpacityMin * 100)]}
                            onValueChange={([v]) => setSetting('ghostOpacityMin', v / 100)} />
                        </Row>
                        <Row label="Độ dày đường khung" value={`${settings.borderWeight}px`}>
                          <Slider min={1} max={3} step={0.5} value={[settings.borderWeight]}
                            onValueChange={([v]) => setSetting('borderWeight', v)} />
                        </Row>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Kiểu đường kẻ ô</Label>
                          <ChipGroup value={settings.borderStyle} onChange={v => setSetting('borderStyle', v as BorderStyle)}
                            options={[{ value: 'solid', label: 'Nét liền' }, { value: 'dashed', label: 'Nét đứt' }]} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Màu chữ mờ</Label>
                          <div className="flex gap-2">
                            {(Object.entries(GHOST_COLORS) as [GhostColor, string][]).map(([key, hex]) => (
                              <button key={key} onClick={() => setSetting('ghostColor', key)}
                                className={`h-7 w-7 rounded-full border-2 ${settings.ghostColor === key ? 'border-indigo-500 scale-110' : 'border-transparent'} transition-all`}
                                style={{ backgroundColor: hex, opacity: 0.6 }} title={key} />
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground capitalize">{settings.ghostColor}</p>
                        </div>
                      </div>
                    )}

                    {/* Tab: Display */}
                    {settingsTab === 'display' && (
                      <div className="space-y-0">
                        <Toggle label="Hướng dẫn thứ tự nét" desc="Hiện các ký tự mẫu nhỏ ở trên grid" checked={settings.showStrokeOrder} onChecked={v => setSetting('showStrokeOrder', v)} />
                        <Toggle label="Tên Hán Việt" desc="Hiện tên đọc Hán Việt in đậm" checked={settings.showHanViet} onChecked={v => setSetting('showHanViet', v)} />
                        <Toggle label="Nghĩa tiếng Việt" desc="Hiện nghĩa của từ trong ngoặc" checked={settings.showMeaning} onChecked={v => setSetting('showMeaning', v)} />
                        <Toggle label="Số nét" desc="Hiện số nét viết bên cạnh tên" checked={settings.showStrokeCount} onChecked={v => setSetting('showStrokeCount', v)} />
                        <Toggle label="Footer trang" desc="Hiện dòng chú thích cuối trang" checked={settings.showPageFooter} onChecked={v => setSetting('showPageFooter', v)} />
                      </div>
                    )}

                    {/* Tab: Export */}
                    {settingsTab === 'export' && (
                      <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-2 text-sm">
                          <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Thông số xuất file hiện tại</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {[
                              ['Khổ giấy', settings.paperSize.toUpperCase()],
                              ['Số Kanji', `${kanjiList.length} ký tự`],
                              ['Tổng ô/hàng', `${totalCells} ô`],
                              ['Kích thước ô', `${settings.cellSize}px`],
                              ['Ghost', `${settings.ghostCells} ô (${Math.round(settings.ghostOpacityMax * 100)}%→${Math.round(settings.ghostOpacityMin * 100)}%)`],
                              ['Màu ghost', settings.ghostColor],
                            ].map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-2">
                                <span className="text-muted-foreground">{k}</span>
                                <span className="font-bold">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button onClick={handleExportPDF} disabled={isExporting || !kanjiList.length}
                          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:opacity-90 text-white font-bold rounded-xl">
                          {isExporting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang xuất...</> : <><Download className="h-4 w-4 mr-2" />Xuất PDF ngay</>}
                        </Button>
                        {!kanjiList.length && <p className="text-xs text-center text-muted-foreground">Tạo worksheet trước để xuất PDF</p>}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Preview */}
        {kanjiList.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-soft bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-sakura" />
                    <CardTitle className="text-base">Xem trước</CardTitle>
                    <Badge variant="outline" className="text-xs">{kanjiList.length} Kanji · {totalCells} ô · {settings.paperSize.toUpperCase()}</Badge>
                  </div>
                  <Button onClick={handleExportPDF} disabled={isExporting} size="sm"
                    className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:opacity-90 text-white font-bold rounded-xl gap-1.5">
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4" />Tải PDF</>}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 overflow-x-auto bg-slate-50/50 dark:bg-slate-950/50">
                <div style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133%' }}>
                  <WorksheetPrintSheet ref={printRef} entries={kanjiList} s={settings} title={worksheetTitle} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {kanjiList.length === 0 && (
          <div style={{ position: 'absolute', left: '-99999px', top: 0 }}>
            <WorksheetPrintSheet ref={printRef} entries={[]} s={settings} />
          </div>
        )}
      </main>
    </div>
  );
};
