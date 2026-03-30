import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Download, Loader2, Sparkles, Settings2, RefreshCw,
  Copy, RotateCcw, Check, BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

import { getStrokeOrder } from '@/data/strokeOrder';

/* ──────── Types ──────── */
type PaperSize   = 'a4' | 'a5' | 'letter';
type GhostColor  = 'gray' | 'indigo' | 'sakura' | 'olive';
type BorderStyle = 'solid' | 'dashed';
type CellGuide   = 'cross' | 'diagonal' | 'both';
type SheetTheme  = 'white' | 'cream';
type LayoutMode  = 'compact' | 'onePerPage';
type SettingsTab = 'layout' | 'style' | 'display' | 'export';
type StrokeSource = 'kanjivg' | 'manual';

interface KanjiEntry {
  character: string; hanviet: string; meaning: string;
  strokeCount?: number; onReading?: string; kunReading?: string;
  svgData?: string | null;
}
interface SheetSettings {
  ghostCells: number; practiceCells: number; cellSize: number;
  paperSize: PaperSize; layoutMode: LayoutMode;
  ghostOpacityMax: number; ghostOpacityMin: number;
  ghostColor: GhostColor; borderWeight: number; borderStyle: BorderStyle;
  sheetTheme: SheetTheme; cellGuide: CellGuide; showCellNumbers: boolean;
  showStrokeOrder: boolean; strokeSource: StrokeSource; showHanViet: boolean; showMeaning: boolean;
  showStrokeCount: boolean; showReadings: boolean; showVocabRows: boolean; showPageFooter: boolean;
}

/* ──────── Constants ──────── */
const GHOST_COLORS: Record<GhostColor, string> = {
  gray: '#555', indigo: '#4f46e5', sakura: '#e87ca0', olive: '#6b7a3e',
};
const PAPER_WIDTHS:  Record<PaperSize, number> = { a4: 210, a5: 148, letter: 216 };
const PAPER_HEIGHTS: Record<PaperSize, number> = { a4: 297, a5: 210, letter: 279 };
const SHEET_THEMES:  Record<SheetTheme, string> = { white: '#fff', cream: '#fdf8ef' };
const KANJI_FONT   = '"Noto Sans JP","Yu Gothic","MS Gothic",sans-serif';
const NOTO_URL     = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap';
const STORAGE_KEY  = 'kanji-worksheet-v3';

const DEFAULT: SheetSettings = {
  ghostCells: 9, practiceCells: 3, cellSize: 58, paperSize: 'a4', layoutMode: 'compact',
  ghostOpacityMax: 0.75, ghostOpacityMin: 0.08,
  ghostColor: 'gray', borderWeight: 1.5, borderStyle: 'solid',
  sheetTheme: 'white', cellGuide: 'cross', showCellNumbers: false,
  showStrokeOrder: true, strokeSource: 'kanjivg' as StrokeSource, showHanViet: true, showMeaning: true,
  showStrokeCount: true, showReadings: false, showVocabRows: false, showPageFooter: true,
};

const PRESETS = [
  { label: 'Số đếm N5',   chars: '一二三四五六七八九十百千万円' },
  { label: 'Thiên nhiên', chars: '山川木林森花草空海雨雪風火水土' },
  { label: 'Thời gian',   chars: '日月年時分今午朝夜前後週春夏秋冬' },
  { label: 'Con người',   chars: '人男女子母父友先生学兄弟姉妹' },
  { label: 'Địa điểm',   chars: '家国会社校店駅門道中外上下右左' },
  { label: 'Động từ N4',  chars: '動働持使作教習送受取走泳着住切' },
  { label: 'Tính từ N4',  chars: '安高低広重軽速早若暗強弱正好' },
  { label: 'Giáo dục N4', chars: '意英音化感漢記計語字者集全題代' },
];

/* ──────── Helpers ──────── */
const isKanji = (ch: string) => { const c = ch.codePointAt(0) ?? 0; return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf); };
const parseKanji = (t: string) => { const s = new Set<string>(); const r: string[] = []; for (const ch of t) if (isKanji(ch) && !s.has(ch)) { s.add(ch); r.push(ch); } return r; };
const ensureFonts = async () => {
  if (!document.querySelector(`link[href="${NOTO_URL}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = NOTO_URL; document.head.appendChild(l); }
  try { await document.fonts.load('700 48px "Noto Sans JP"'); await document.fonts.ready; } catch { await new Promise(r => setTimeout(r, 1500)); }
};

// KanjiVG SVG Fetcher
const fetchKanjiVG = async (char: string): Promise<string | null> => {
  try {
    const code = char.charCodeAt(0).toString(16).padStart(5, '0');
    const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${code}.svg`;
    const res = await fetch(url);
    if (!res.ok) return null;
    let text = await res.text();
    
    // Strip XML definitions and DOCTYPE which causes the `]>` visual bug in browsers
    const svgStart = text.indexOf('<svg');
    if (svgStart !== -1) {
      text = text.substring(svgStart);
    }
    
    let svg = text
      .replace(/<svg[^>]*>/, '<svg viewBox="0 0 109 109" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;">')
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments safely
      .replace(/<g id="kvg:StrokeNumbers[\s\S]*?<\/g>/, '') // Remove stroke numbers group
      .replace(/<text[\s\S]*?<\/text>/g, '') // Aggressively remove any leftover text elements (stroke numbers)
      .replace(/style="[^"]*"/g, ''); // Clear inline styles on groups
      
    // Guarantee that every path explicitly carries its stroke attributes so we can easily mutate it.
    svg = svg.replace(/<path /g, '<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" ');
    
    return svg;
  } catch (error) {
    console.error(`Failed to fetch KanjiVG for ${char}:`, error);
    return null;
  }
};

/* ──────── SVG Steps Renderer ──────── */
const SVGStepsRow: React.FC<{ svgData: string, cellSize: number, showStrokeCount: boolean }> = ({ svgData, cellSize, showStrokeCount }) => {
  const pathsMatch = svgData.match(/<path[^>]*\/>/g) || [];
  if (pathsMatch.length === 0) return null;

  const maxSteps = 15;
  const stepInterval = Math.ceil(pathsMatch.length / maxSteps);
  
  const stepsToShow = [];
  for (let i = 0; i < pathsMatch.length; i += stepInterval) {
    stepsToShow.push(i + 1);
  }
  if (!stepsToShow.includes(pathsMatch.length)) {
    if (stepsToShow.length >= maxSteps) stepsToShow.pop();
    stepsToShow.push(pathsMatch.length);
  }

  const stepSize = Math.max(20, Math.min(30, cellSize * 0.45));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
      {stepsToShow.map((numPaths, idx) => {
        const currentPaths = pathsMatch.slice(0, numPaths).map((p, pIdx) => {
           if (pIdx === numPaths - 1) {
             return p.replace('currentColor', '#e11d48').replace('stroke-width="3"', 'stroke-width="4"');
           }
           return p.replace('currentColor', '#cbd5e1'); // Previous strokes are light grayish-blue
        }).join('');

        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: stepSize, height: stepSize, border: '1px dashed #e2e8f0', backgroundColor: '#f8fafc', borderRadius: 3, position: 'relative' }}
                 dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 109 109" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:10%">${currentPaths}</svg>` }}
            />
          </div>
        );
      })}
      {showStrokeCount && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4, fontFamily: 'Arial', fontWeight: 'bold' }}>({pathsMatch.length} nét)</span>}
    </div>
  );
};

/* ──────── Cell guide SVG ──────── */
const Guide: React.FC<{ guide: CellGuide; size: number }> = ({ guide, size }) => (
  <svg style={{ position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none' }} viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="none">
    {(guide==='cross'||guide==='both')&&<><line x1="0" y1={size/2} x2={size} y2={size/2} stroke="#e0e0e0" strokeWidth="0.6"/><line x1={size/2} y1="0" x2={size/2} y2={size} stroke="#e0e0e0" strokeWidth="0.6"/></>}
    {(guide==='diagonal'||guide==='both')&&<><line x1="0" y1="0" x2={size} y2={size} stroke="#e8e8e8" strokeWidth="0.6"/><line x1={size} y1="0" x2="0" y2={size} stroke="#e8e8e8" strokeWidth="0.6"/></>}
  </svg>
);

/* ──────── WorksheetRow ──────── */
const WorksheetRow: React.FC<{ entry: KanjiEntry; s: SheetSettings }> = ({ entry, s }) => {
  const manualSteps = getStrokeOrder(entry.character);
  const useSVG = s.strokeSource === 'kanjivg' && entry.svgData;
  const showTextSteps = s.showStrokeOrder && (!useSVG && manualSteps);
  const total = 1 + s.ghostCells + s.practiceCells;
  
  const gc = GHOST_COLORS[s.ghostColor];
  const bg = SHEET_THEMES[s.sheetTheme];
  const ob = `${s.borderWeight}px solid #222`;
  const ib = s.borderStyle==='dashed'?'1px dashed #ccc':'1px solid #d4d4d4';
  const cell: React.CSSProperties = { position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',width:`${s.cellSize}px`,height:`${s.cellSize}px`,flexShrink:0,overflow:'hidden',boxSizing:'border-box' };
  
  return (
    <div style={{ marginBottom:22, pageBreakAfter:s.layoutMode==='onePerPage'?'always':'auto', breakInside:'avoid' }}>
      {(s.showHanViet||s.showMeaning||(s.showStrokeCount && !s.showStrokeOrder))&&(
        <div style={{ display:'flex',gap:6,alignItems:'baseline',fontFamily:'Arial,sans-serif',marginBottom:2 }}>
          {s.showHanViet&&<span style={{ fontWeight:900,fontSize:13,letterSpacing:'0.1em',textTransform:'uppercase' }}>{entry.hanviet||entry.character}</span>}
          {s.showMeaning&&entry.meaning&&<span style={{ fontSize:11,color:'#555' }}>({entry.meaning})</span>}
          {s.showStrokeCount&&!s.showStrokeOrder&&entry.strokeCount&&<span style={{ fontSize:9,color:'#aaa' }}>{entry.strokeCount} nét</span>}
        </div>
      )}
      {s.showReadings&&(entry.onReading||entry.kunReading)&&(
        <div style={{ fontSize:11,color:'#777',fontFamily:KANJI_FONT,marginBottom:3,display:'flex',gap:8 }}>
          {entry.onReading&&<span>音: <b style={{color: '#444'}}>{entry.onReading}</b></span>}
          {entry.kunReading&&<span>訓: <b style={{color: '#444'}}>{entry.kunReading}</b></span>}
        </div>
      )}
      
      {/* Stroke Order Display */}
      {s.showStrokeOrder && (
        useSVG ? (
          <SVGStepsRow svgData={entry.svgData!} cellSize={s.cellSize} showStrokeCount={s.showStrokeCount} />
        ) : showTextSteps ? (
          <div style={{ display:'flex',alignItems:'center',gap:4,marginBottom:6,fontFamily:KANJI_FONT,fontSize:14,color:'#333',lineHeight:1 }}>
            {manualSteps.map((x,i)=><span key={i}>{x}</span>)}
            {s.showStrokeCount&&entry.strokeCount&&<span style={{ fontSize:9,color:'#aaa',marginLeft:4,fontFamily:'Arial' }}>{entry.strokeCount} nét</span>}
          </div>
        ) : (
          <div style={{ fontSize: 10, color: '#aaa', marginBottom: 6, fontFamily: 'Arial' }}>
            (Chưa có dữ liệu nét chữ cho từ này)
          </div>
        )
      )}

      {/* Grid */}
      <div style={{ display:'flex',border:ob,width:`${s.cellSize*total}px`,boxSizing:'border-box',backgroundColor:bg }}>
        {/* Main Character Cell */}
        <div style={{ ...cell,borderRight:ob,backgroundColor:bg }}>
          <Guide guide={s.cellGuide} size={s.cellSize}/>
          {useSVG ? (
            <div 
              style={{ position: 'absolute', inset: 0, padding: `${s.cellSize * 0.12}px`, color: '#111', boxSizing: 'border-box' }}
              dangerouslySetInnerHTML={{ __html: entry.svgData! }}
            />
          ) : (
            <span style={{ fontFamily:KANJI_FONT,fontSize:`${s.cellSize*.72}px`,fontWeight:900,color:'#111',lineHeight:1,position:'relative' }}>{entry.character}</span>
          )}
        </div>
        
        {/* Ghost Cells */}
        {Array.from({length:s.ghostCells}).map((_,i)=>{
          const t=s.ghostCells===1?1:i/(s.ghostCells-1);
          const op=s.ghostOpacityMax-t*(s.ghostOpacityMax-s.ghostOpacityMin);
          return(
            <div key={`g${i}`} style={{ ...cell,borderRight:i===s.ghostCells-1?ob:ib,backgroundColor:bg }}>
              <Guide guide={s.cellGuide} size={s.cellSize}/>
              {s.showCellNumbers&&<span style={{ position:'absolute',top:2,left:3,fontSize:8,color:'#bbb',fontFamily:'Arial',lineHeight:1 }}>{i+1}</span>}
              {useSVG ? (
                <div 
                  style={{ position: 'absolute', inset: 0, padding: `${s.cellSize * 0.12}px`, opacity: op, color: gc, boxSizing: 'border-box' }}
                  dangerouslySetInnerHTML={{ __html: entry.svgData! }}
                />
              ) : (
                <span style={{ fontFamily:KANJI_FONT,fontSize:`${s.cellSize*.72}px`,fontWeight:400,color:gc,opacity:op,lineHeight:1,position:'relative' }}>{entry.character}</span>
              )}
            </div>
          );
        })}
        {/* Empty Practice Cells */}
        {Array.from({length:s.practiceCells}).map((_,i)=>(
          <div key={`e${i}`} style={{ ...cell,borderLeft:i>0?ib:undefined,backgroundColor:bg }}><Guide guide={s.cellGuide} size={s.cellSize}/></div>
        ))}
      </div>
      
      {/* Vocab Rows */}
      {s.showVocabRows&&(
        <div style={{ width:`${s.cellSize*total}px`,marginTop:4 }}>
          <div style={{ fontSize:9,color:'#aaa',fontFamily:'Arial',marginBottom:2, letterSpacing: '0.05em' }}>TỪ VỰNG:</div>
          {[0,1].map(i=><div key={i} style={{ height:`${s.cellSize*.46}px`,borderBottom:'1px dashed #ccc',marginBottom:4 }}/>)}
        </div>
      )}
    </div>
  );
};

/* ──────── PrintSheet ──────── */
const PrintSheet = React.forwardRef<HTMLDivElement,{entries:KanjiEntry[];s:SheetSettings;title?:string}>(({entries,s,title},ref)=>{
  const w=s.cellSize*(1+s.ghostCells+s.practiceCells)+100;
  return(
    <div ref={ref} style={{ width:`${w}px`,backgroundColor:SHEET_THEMES[s.sheetTheme],padding:'36px 50px',fontFamily:'Arial,sans-serif',boxSizing:'border-box' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:22,borderBottom:'2px solid #111',paddingBottom:8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.15em' }}>{title || 'LUYỆN VIẾT KANJI'}</div>
          <div style={{ fontSize:9,color:'#aaa',marginTop:2 }}>Tập viết Kanji · LexLoveLoom</div>
        </div>
        <div style={{ fontSize:10,color:'#999',textAlign:'right',lineHeight:1.8 }}>
          <div>Họ tên: ______________________</div>
          <div>Ngày: {new Date().toLocaleDateString('vi-VN')}</div>
        </div>
      </div>
      {entries.map(e=><WorksheetRow key={e.character} entry={e} s={s}/>)}
      {s.showPageFooter&&<div style={{ marginTop:10,paddingTop:8,borderTop:'1px solid #eee',fontSize:9,color:'#ccc',textAlign:'center' }}>Kaizen Kanji Coach · LexLoveLoom · {new Date().getFullYear()}</div>}
    </div>
  );
});
PrintSheet.displayName='PrintSheet';

/* ──────── Setting atoms ──────── */
const SRow: React.FC<{label:string;val:string;note?:string;children:React.ReactNode}>=({label,val,note,children})=>(
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-[11px] font-bold text-sakura bg-sakura/10 px-2 py-0.5 rounded">{val}</span>
    </div>
    {children}
    {note&&<p className="text-[10px] text-muted-foreground">{note}</p>}
  </div>
);

const SToggle: React.FC<{label:string;desc?:string;checked:boolean;on:(v:boolean)=>void}>=({label,desc,checked,on})=>(
  <div className="flex items-center justify-between py-3 border-b border-sakura-light/30 last:border-0 hover:bg-sakura-light/20 px-2 rounded-lg transition-colors">
    <div className="pr-4">
      <p className="text-[12px] font-bold text-slate-700">{label}</p>
      {desc&&<p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{desc}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={on}/>
  </div>
);

const SChips: React.FC<{opts:{v:string;l:string}[];val:string;on:(v:string)=>void}>=({opts,val,on})=>(
  <div className="flex flex-wrap gap-1.5 p-1 bg-sakura-light/30 rounded-xl border border-sakura-light/50">
    {opts.map(o=>(
      <button 
        key={o.v} 
        onClick={()=>on(o.v)}
        className={cn(
          "px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all",
          val === o.v 
            ? "bg-white text-sakura shadow-sm ring-1 ring-sakura/20" 
            : "text-slate-400 hover:text-sakura"
        )}
      >{o.l}</button>
    ))}
  </div>
);

/* ──────── Main Page ──────── */
export const KanjiWorksheet = () => {
  const [input,     setInput]     = useState('今玉交合歩茶弓雲算小');
  const [list,      setList]      = useState<KanjiEntry[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAdv,   setShowAdv]   = useState(false);
  const [tab,       setTab]       = useState<SettingsTab>('layout');
  const [s,         setS]         = useState<SheetSettings>(DEFAULT);
  const [title,     setTitle]     = useState('');
  const [copied,    setCopied]    = useState(false);
  const [previewScale, setPreviewScale] = useState(0.72);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const set = useCallback(<K extends keyof SheetSettings>(k:K,v:SheetSettings[K])=>setS(p=>({...p,[k]:v})),[]);

  const TABS: {id:SettingsTab;label:string}[] = [
    {id:'layout',label:'Bố cục'},{id:'style',label:'Kiểu dáng'},{id:'display',label:'Hiển thị'},{id:'export',label:'Xuất PDF'},
  ];

  /* Responsive preview scale */
  useEffect(() => {
    const update = () => {
      if (!previewContainerRef.current) return;
      const cw = previewContainerRef.current.clientWidth - 32;
      const contentW = s.cellSize * (1 + s.ghostCells + s.practiceCells) + 100;
      setPreviewScale(Math.min(0.82, Math.max(0.3, cw / contentW)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [s.cellSize, s.ghostCells, s.practiceCells, list.length]);

  /* localStorage */
  useEffect(() => {
    try { 
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); 
      if (d.s) setS({ ...DEFAULT, ...d.s }); 
      if (d.input) setInput(d.input); 
      if (d.list) setList(d.list); 
      if (d.title) setTitle(d.title); 
    } catch {
      // Ignore initial load errors
    }
  }, []);
  useEffect(() => {
    try { 
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ s, input, list, title })); 
    } catch {
      // Ignore save errors
    }
  }, [s, input, list, title]);

  const generate = async () => {
    const chars=parseKanji(input);
    if(!chars.length){toast({title:'Vui lòng nhập Kanji',variant:'destructive'});return;}
    setLoading(true); setList([]);
    try {
      const r=await Promise.all(chars.map(async(ch):Promise<KanjiEntry>=>{
        try{
          const{data}=await supabase.functions.invoke('kanji-details',{body:{character:ch}});
          const k=data?.kanji;
          
          let svgData = null;
          if (s.strokeSource === 'kanjivg') {
            svgData = await fetchKanjiVG(ch);
          }

          return{
            character:ch,
            hanviet:k?.hanviet||ch,
            meaning:k?.meaning_vi||k?.meaning||'',
            strokeCount:k?.stroke_count,
            onReading:k?.on_reading,
            kunReading:k?.kun_reading,
            svgData
          };
        }catch{return{character:ch,hanviet:ch,meaning:''};}
      }));
      setList(r);
      
      const failedSVG = r.filter(entry => s.strokeSource === 'kanjivg' && !entry.svgData).length;
      if (failedSVG > 0) {
        toast({
          title: 'Thông báo',
          description: `Không tìm thấy nét viết tự động (KanjiVG) cho ${failedSVG} từ. Đã chuyển về chế độ chữ ký tự thủ công cho các từ này.`,
        });
      }
    } finally { setLoading(false); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(list.map(k=>k.character).join(''));
    setCopied(true); setTimeout(()=>setCopied(false),2000);
    toast({title:'Đã copy!'});
  };

  const exportPDF = async () => {
    if(!ref.current||!list.length)return;
    setExporting(true);
    try{
      const { jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      toast({title: '⏳ Đang tải font...'});
      await ensureFonts();
      const el=ref.current;
      el.style.cssText='position:fixed;top:-99999px;left:0;z-index:-1;display:block;';
      await new Promise(r=>setTimeout(r,800));
      const cv=await (html2canvas as any)(el,{useCORS:true,allowTaint:false,backgroundColor:SHEET_THEMES[s.sheetTheme],logging:false,scale: 2,
        onclone:(doc: Document)=>{const l=doc.createElement('link');l.rel='stylesheet';l.href=NOTO_URL;doc.head.appendChild(l);}
      });
      el.style.cssText='';
      const pw=PAPER_WIDTHS[s.paperSize],ph=PAPER_HEIGHTS[s.paperSize];
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[pw,ph]});
      const iw=pw,ih=(cv.height*pw)/cv.width;
      let oy=0,pg=0;
      while(oy<ih){if(pg>0)pdf.addPage([pw,ph]);pdf.addImage(cv.toDataURL('image/png'),'PNG',0,-oy,iw,ih);oy+=ph;pg++;}
      pdf.save(`kanji-ws-${Date.now()}.pdf`);
      toast({title:'✅ Đã tải PDF!',description:`${list.length} Kanji · ${s.paperSize.toUpperCase()}`});
    }catch(e){console.error(e);toast({title:'Lỗi xuất PDF',variant:'destructive'});}
    finally{setExporting(false);}
  };

  const total=1+s.ghostCells+s.practiceCells;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        
        {/* --- Hero Section --- */}
        <div className="text-center space-y-2 relative">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-sakura/5 rounded-full blur-3xl -z-10" />
          <h1 className="text-3xl sm:text-5xl font-black text-sakura-dark tracking-tight">
            Kanji Worksheet
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Tạo trang luyện viết Kanji cá nhân hóa chỉ trong giây lát.
          </p>
        </div>

        {/* --- Presets Bar --- */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
          {PRESETS.map((p) => (
            <button 
              key={p.label} 
              onClick={() => setInput(p.chars)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-sakura-light/50 text-sakura-dark hover:bg-sakura-light/30 transition-all active:scale-95 shadow-sm"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* --- Main Workspace --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input & Settings */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
              <CardContent className="p-6 space-y-6">
                
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <Label className="text-sm font-bold text-slate-700 ml-1">Nhập Kanji của bạn</Label>
                    <Badge variant="outline" className="bg-sakura-light/20 text-sakura border-sakura-light/50 text-[10px]">
                      {parseKanji(input).length} ký tự
                    </Badge>
                  </div>
                  <div className="relative group">
                    <Textarea 
                      value={input} 
                      onChange={e => setInput(e.target.value)}
                      placeholder="Nhập Kanji tại đây ( ví dụ: 今玉交合...) "
                      className="text-2xl sm:text-3xl tracking-[0.3em] h-32 resize-none rounded-2xl border-2 border-slate-100 focus:border-slate-300 font-jp bg-slate-50/50 p-6 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    onClick={generate} 
                    disabled={loading || !input.trim()}
                    className="flex-1 bg-sakura hover:bg-sakura-dark text-white font-bold rounded-xl h-12 transition-all active:scale-95 shadow-md shadow-sakura/10"
                  >
                    {loading ? (
                      <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Đang tạo...</>
                    ) : (
                      <><Sparkles className="h-5 w-5 mr-2" /> Tạo Worksheet</>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => setShowAdv(!showAdv)}
                    className={cn(
                      "w-12 h-12 rounded-xl border-2 transition-all p-0",
                      showAdv ? "bg-sakura-light border-sakura-light text-sakura-dark font-bold" : "bg-white border-sakura-light/50 text-sakura/60 hover:text-sakura hover:border-sakura"
                    )}
                  >
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </div>

                {list.length > 0 && (
                  <div className="flex items-center justify-between pt-4 border-t border-sakura-light/30">
                    <div className="flex gap-2">
                      <Button onClick={copy} variant="ghost" size="sm" className="h-8 px-3 rounded-lg text-sakura/70 hover:text-sakura hover:bg-sakura-light/20 gap-1.5">
                        {copied ? (
                          <><Check className="h-3.5 w-3.5 text-green-500" /> <span className="text-xs font-bold text-green-600">Đã lưu</span></>
                        ) : (
                          <><Copy className="h-3.5 w-3.5" /> <span className="text-xs font-bold">Copy Kanji</span></>
                        )}
                      </Button>
                      <Button onClick={() => { setList([]); setInput(''); }} variant="ghost" size="sm" className="h-8 px-3 rounded-lg text-slate-400 hover:text-sakura hover:bg-sakura-light/20 gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">Làm lại</span>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Settings Panel */}
            {showAdv && (
              <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                    <div className="flex gap-1 p-1 bg-slate-50 rounded-xl overflow-x-auto no-scrollbar border border-slate-100">
                      {TABS.map(t => (
                        <button 
                          key={t.id} 
                          onClick={() => setTab(t.id)}
                          className={cn(
                            "px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap",
                            tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                      <div className="min-h-[200px]">
                        {/* Tab Content Mapping */}
                        {tab === 'layout' && (
                          <div className="grid grid-cols-1 gap-6">
                            <div className="grid grid-cols-2 gap-4">
                              <SRow label="Ô ghost" val={`${s.ghostCells}`}>
                                <Slider min={3} max={14} step={1} value={[s.ghostCells]} onValueChange={([v]) => set('ghostCells', v)} />
                              </SRow>
                              <SRow label="Ô trống" val={`${s.practiceCells}`}>
                                <Slider min={1} max={8} step={1} value={[s.practiceCells]} onValueChange={([v]) => set('practiceCells', v)} />
                              </SRow>
                            </div>
                            <SRow label="Kích thước ô" val={`${s.cellSize}px`} note={`Một hàng có tổng cộng ${total} ô`}>
                              <Slider min={44} max={80} step={2} value={[s.cellSize]} onValueChange={([v]) => set('cellSize', v)} />
                            </SRow>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Khổ giấy</Label>
                                <SChips val={s.paperSize} on={v => set('paperSize', v as PaperSize)} opts={[{ v: 'a4', l: 'A4' }, { v: 'a5', l: 'A5' }, { v: 'letter', l: 'Letter' }]} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Bố cục PDF</Label>
                                <SChips val={s.layoutMode} on={v => set('layoutMode', v as LayoutMode)} opts={[{ v: 'compact', l: 'Gộp chung' }, { v: 'onePerPage', l: '1 Kanji/trang' }]} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tiêu đề trang</Label>
                              <input 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                placeholder="Luyện viết Kanji"
                                className="w-full text-sm font-bold border border-sakura-light/50 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:border-sakura transition-all"
                              />
                            </div>
                          </div>
                        )}

                        {tab === 'style' && (
                          <div className="grid grid-cols-1 gap-6">
                            <div className="grid grid-cols-2 gap-4">
                              <SRow label="Mờ nhất" val={`${Math.round(s.ghostOpacityMin * 100)}%`}>
                                <Slider min={2} max={30} step={1} value={[Math.round(s.ghostOpacityMin * 100)]} onValueChange={([v]) => set('ghostOpacityMin', v / 100)} />
                              </SRow>
                              <SRow label="Rõ nhất" val={`${Math.round(s.ghostOpacityMax * 100)}%`}>
                                <Slider min={30} max={100} step={5} value={[Math.round(s.ghostOpacityMax * 100)]} onValueChange={([v]) => set('ghostOpacityMax', v / 100)} />
                              </SRow>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <SRow label="Độ dày viền" val={`${s.borderWeight}px`}>
                                <Slider min={1} max={3} step={0.5} value={[s.borderWeight]} onValueChange={([v]) => set('borderWeight', v)} />
                              </SRow>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Kiểu viền</Label>
                                <SChips val={s.borderStyle} on={v => set('borderStyle', v as BorderStyle)} opts={[{ v: 'solid', l: 'Liền' }, { v: 'dashed', l: 'Đứt' }]} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Đường kẻ ô</Label>
                                <SChips val={s.cellGuide} on={v => set('cellGuide', v as CellGuide)} opts={[{ v: 'cross', l: '+' }, { v: 'diagonal', l: '×' }, { v: 'both', l: '✳' }]} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Màu giấy</Label>
                                <SChips val={s.sheetTheme} on={v => set('sheetTheme', v as SheetTheme)} opts={[{ v: 'white', l: 'Trắng' }, { v: 'cream', l: 'Kem' }]} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Màu chữ mờ (Ghost)</Label>
                              <div className="flex gap-3 pt-1">
                                {(Object.entries(GHOST_COLORS) as [GhostColor, string][]).map(([k, hex]) => (
                                  <button 
                                    key={k} 
                                    onClick={() => set('ghostColor', k)} 
                                    className={cn(
                                      "h-7 w-7 rounded-full border-2 transition-all shadow-sm",
                                      s.ghostColor === k ? "border-slate-900 scale-110" : "border-white hover:scale-105"
                                    )}
                                    style={{ backgroundColor: hex }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {tab === 'display' && (
                          <div className="grid grid-cols-1 divide-y divide-slate-50">
                            <div className="py-3 px-2 border-b border-sakura-light/30">
                              <Label className="text-[12px] font-bold text-slate-700 block mb-2">Nguồn dữ liệu nét viết</Label>
                              <SChips 
                                val={s.strokeSource} 
                                on={(v) => {
                                  set('strokeSource', v as StrokeSource);
                                  if (v === 'kanjivg' && list.some(k => !k.svgData)) toast({title: 'Vui lòng nhấn Tạo Worksheet lại để lấy nét SVG', description: 'Đã đổi sang chế độ Tự động từ KanjiVG'});
                                }} 
                                opts={[{ v: 'kanjivg', l: 'Tự động SVG (KanjiVG)' }, { v: 'manual', l: 'Ký tự Thủ công' }]} 
                              />
                            </div>
                            <SToggle label="Thứ tự nét viết" desc="Hiện các bước vẽ chữ nhỏ phía trên" checked={s.showStrokeOrder} on={v => set('showStrokeOrder', v)} />
                            <SToggle label="Đánh số ô" desc="Số thứ tự ở góc mỗi ô" checked={s.showCellNumbers} on={v => set('showCellNumbers', v)} />
                            <SToggle label="Hán Việt & Nghĩa" checked={s.showHanViet} on={v => set('showHanViet', v)} />
                            <SToggle label="Cách đọc On/Kun" checked={s.showReadings} on={v => set('showReadings', v)} />
                            <SToggle label="Dòng luyện từ vựng" desc="Thêm dòng kẻ trống bên dưới" checked={s.showVocabRows} on={v => set('showVocabRows', v)} />
                            <SToggle label="Footer chân trang" checked={s.showPageFooter} on={v => set('showPageFooter', v)} />
                          </div>
                        )}

                        {tab === 'export' && (
                          <div className="space-y-6">
                            <div className="rounded-xl bg-slate-50 p-6 space-y-4 border border-slate-100">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tóm tắt cấu hình</p>
                              <div className="grid grid-cols-2 gap-4">
                                {[
                                  { l: 'Khổ giấy', v: s.paperSize.toUpperCase() },
                                  { l: 'Kanji', v: `${list.length} từ` },
                                  { l: 'Cỡ ô', v: `${s.cellSize}px` },
                                  { l: 'Bố cục', v: s.layoutMode === 'compact' ? 'Gộp' : 'Rời' }
                                ].map(item => (
                                  <div key={item.l} className="space-y-1">
                                    <p className="text-[10px] text-slate-400">{item.l}</p>
                                    <p className="text-sm font-bold text-slate-700">{item.v}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Button 
                              onClick={exportPDF} 
                              disabled={exporting || !list.length}
                              className="w-full bg-slate-900 hover:bg-black text-white font-bold rounded-xl h-12 transition-all"
                            >
                              {exporting ? (
                                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Đang chuẩn bị...</>
                              ) : (
                                <><Download className="h-5 w-5 mr-2" /> Tải về PDF ngay</>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

          {/* Right Column: Live Preview */}
          <div className="lg:col-span-7">
            {list.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                     Bản xem trước trực tiếp
                  </h3>
                </div>

                <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                  <CardHeader className="p-4 bg-slate-50 flex flex-row items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="leading-tight">
                        <p className="text-sm font-bold text-slate-800">{title || 'Luyện viết Kanji'}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">{s.paperSize} Worksheet</p>
                      </div>
                    </div>
                    <Button 
                      onClick={exportPDF} 
                      disabled={exporting} 
                      size="sm"
                      className="bg-sakura hover:bg-sakura-dark text-white rounded-lg gap-2 h-9 px-4 font-bold transition-all shadow-sm"
                    >
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4" /> Tải PDF</>}
                    </Button>
                  </CardHeader>
                  
                  <CardContent className="p-0 bg-slate-100 relative min-h-[500px]" ref={previewContainerRef}>
                    <div style={{
                      transform: `scale(${previewScale})`,
                      transformOrigin: 'top left',
                      width: `${Math.round((1 / previewScale) * 100)}%`,
                      height: 'auto',
                    }}>
                      <PrintSheet ref={ref} entries={list} s={s} title={title} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6 bg-white border border-dashed border-slate-200 rounded-xl">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-slate-300" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-lg font-bold text-slate-800">Bắt đầu tạo Worksheet</h3>
                  <p className="text-slate-500 text-sm">
                    Nhập danh sách chữ Kanji mà bạn muốn luyện tập vào ô bên trái, sau đó nhấn "Tạo" để xem bản thiết kế tại đây.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden component for canvas capture */}
        {list.length === 0 && (
          <div style={{ position: 'absolute', left: '-99999px', top: 0 }}>
            <PrintSheet ref={ref} entries={[]} s={s} title={title} />
          </div>
        )}
      </main>
    </div>
  );
};
