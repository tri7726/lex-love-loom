import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Save, Upload, Image as ImageIcon, HelpCircle,
  Loader2, FileUp, GripVertical, Eye, Send, ChevronUp, ChevronDown,
  Layout, BookOpen, Sparkles, X, CheckCircle2, AlertCircle, PenTool
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { convertPdfToSlides, uploadSlideImage } from '@/lib/pdfToSlides';

interface Slide {
  id: string;           // temp ID for UI
  dbId?: string;        // real DB id after save
  slide_type: 'content' | 'question';
  order_index: number;
  // content fields
  title?: string;
  body?: string;
  image_url?: string;
  image_caption?: string;
  // question fields
  question_text?: string;
  options?: string[];
  correct_index?: number;
  explanation?: string;
}

const makeId = () => Math.random().toString(36).slice(2, 9);

const emptyContent = (): Slide => ({
  id: makeId(), slide_type: 'content', order_index: 0,
  title: '', body: '', image_url: '', image_caption: '',
});

const emptyQuestion = (): Slide => ({
  id: makeId(), slide_type: 'question', order_index: 0,
  question_text: '', options: ['', '', '', ''], correct_index: 0, explanation: '',
});

export const LessonBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId');
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slides, setSlides] = useState<Slide[]>([emptyContent()]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(null);

  // PDF import state
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const selected = slides[selectedIdx];

  // ── Slide helpers ─────────────────────────────────────────────
  const updateSlide = (patch: Partial<Slide>) =>
    setSlides(prev => prev.map((s, i) => i === selectedIdx ? { ...s, ...patch } : s));

  const addSlide = (type: 'content' | 'question') => {
    const s = type === 'content' ? emptyContent() : emptyQuestion();
    const next = [...slides];
    next.splice(selectedIdx + 1, 0, s);
    setSlides(next.map((s, i) => ({ ...s, order_index: i })));
    setSelectedIdx(selectedIdx + 1);
  };

  const removeSlide = (idx: number) => {
    if (slides.length === 1) return;
    const next = slides.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order_index: i }));
    setSlides(next);
    setSelectedIdx(Math.min(idx, next.length - 1));
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const next = [...slides];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSlides(next.map((s, i) => ({ ...s, order_index: i })));
    setSelectedIdx(swap);
  };

  // ── PDF Import ───────────────────────────────────────────────
  const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title.trim()) {
      toast({ title: 'Nhập tiêu đề bài giảng trước', variant: 'destructive' });
      return;
    }

    let lid = lessonId;
    if (!lid) {
      lid = await saveDraft();
      if (!lid) return;
    }

    setPdfProgress({ current: 0, total: 1 });
    try {
      const pages = await convertPdfToSlides(file, {
        lessonId: lid,
        scale: 1.5,
        maxPages: 50,
        onProgress: (c, t) => setPdfProgress({ current: c, total: t }),
      });

      const newSlides: Slide[] = pages.map((p, i) => ({
        id: makeId(),
        slide_type: 'content',
        order_index: i,
        title: `Trang ${p.pageNumber}`,
        image_url: p.imageUrl,
        body: '',
      }));

      setSlides(prev => {
        const merged = [...prev.filter(s => s.image_url || s.body || s.title), ...newSlides];
        return merged.map((s, i) => ({ ...s, order_index: i }));
      });
      toast({ title: `Đã import ${pages.length} trang từ PDF ✅` });
    } catch (err: any) {
      toast({ title: 'Lỗi import PDF', description: err.message, variant: 'destructive' });
    } finally {
      setPdfProgress(null);
      e.target.value = '';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;

    let lid = lessonId;
    if (!lid) { lid = await saveDraft(); if (!lid) return; }

    setUploadingImg(true);
    try {
      const url = await uploadSlideImage(file, lid, selected.id);
      if (url) updateSlide({ image_url: url });
      else toast({ title: 'Upload ảnh thất bại.', variant: 'destructive' });
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  const saveDraft = async (): Promise<string | null> => {
    if (!title.trim() || !user) {
      toast({ title: 'Nhập tiêu đề bài giảng', variant: 'destructive' });
      return null;
    }
    if (lessonId) return lessonId;

    const { data, error } = await (supabase as any)
      .from('lessons')
      .insert({ teacher_id: user.id, title: title.trim(), description: description.trim() || null })
      .select('id').single();

    if (error) { toast({ title: 'Lỗi tạo bài giảng', description: error.message, variant: 'destructive' }); return null; }
    setLessonId(data.id);
    return data.id;
  };

  const handleSave = async (publish = false) => {
    if (!title.trim()) { toast({ title: 'Nhập tiêu đề bài giảng', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      let lid = lessonId ?? await saveDraft();
      if (!lid) return;

      await (supabase as any).from('lessons').update({
        title: title.trim(), description: description.trim() || null,
        status: publish ? 'published' : 'draft',
      }).eq('id', lid);

      await (supabase as any).from('lesson_slides').delete().eq('lesson_id', lid);

      const rows = slides.map((s, i) => ({
        lesson_id: lid,
        order_index: i,
        slide_type: s.slide_type,
        title: s.title || null,
        body: s.body || null,
        image_url: s.image_url || null,
        image_caption: s.image_caption || null,
        question_text: s.question_text || null,
        options: s.options || null,
        correct_index: s.correct_index ?? null,
        explanation: s.explanation || null,
        settings: {}
      }));

      await (supabase as any).from('lesson_slides').insert(rows);

      toast({ title: publish ? 'Đã publish bài giảng! 🎉' : 'Đã lưu bản nháp ✅' });
      if (publish) navigate('/teacher');
    } catch (err: any) {
      toast({ title: 'Lỗi lưu', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderEditor = () => {
    if (!selected) return null;

    if (selected.slide_type === 'content') {
      return (
        <div className="space-y-10">
          <div className="space-y-3">
            <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Tiêu đề slide</Label>
            <Input 
              value={selected.title || ''} 
              onChange={e => updateSlide({ title: e.target.value })} 
              placeholder="Nhập tiêu đề slide..." 
              className="h-14 rounded-2xl border-2 focus-visible:ring-sakura/30 transition-all text-lg font-bold" 
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Hình ảnh (tuỳ chọn)</Label>
            {selected.image_url ? (
              <div className="relative rounded-[2rem] overflow-hidden border-2 border-sakura-light/20 group">
                <img src={selected.image_url} alt="slide" className="w-full object-contain max-h-[300px] bg-slate-50" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                   <Button variant="secondary" className="rounded-xl font-bold" onClick={() => imgRef.current?.click()}>Thay đổi</Button>
                   <Button variant="destructive" className="rounded-xl font-bold" onClick={() => updateSlide({ image_url: '' })}>Xóa ảnh</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => imgRef.current?.click()}
                disabled={uploadingImg}
                className="w-full h-48 border-2 border-dashed border-sakura-light/30 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-muted-foreground hover:border-sakura/40 hover:bg-sakura/5 transition-all group"
              >
                <div className="h-16 w-16 bg-sakura-light/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   {uploadingImg ? <Loader2 className="h-8 w-8 animate-spin text-sakura" /> : <ImageIcon className="h-8 w-8 text-sakura" />}
                </div>
                <div className="text-center">
                   <span className="text-sm font-bold block text-sumi">Click để upload ảnh</span>
                   <span className="text-[10px] uppercase tracking-widest font-black opacity-50">Hỗ trợ JPG, PNG, WEBP</span>
                </div>
              </button>
            )}
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Nội dung</Label>
            <Textarea 
              value={selected.body || ''} 
              onChange={e => updateSlide({ body: e.target.value })}
              placeholder="Nội dung văn bản của slide..." 
              rows={8} 
              className="rounded-[2rem] border-2 focus-visible:ring-sakura/30 transition-all resize-none text-base leading-relaxed p-6" 
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-10">
        <div className="space-y-3">
          <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Nội dung câu hỏi</Label>
          <Textarea 
            value={selected.question_text || ''} 
            onChange={e => updateSlide({ question_text: e.target.value })}
            placeholder="Nhập nội dung câu hỏi..." 
            rows={4} 
            className="rounded-[2rem] border-2 focus-visible:ring-sakura/30 transition-all resize-none text-lg font-bold p-6" 
          />
        </div>
        
        <div className="space-y-4">
          <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Các đáp án</Label>
          <div className="grid grid-cols-1 gap-3">
            {(selected.options || ['', '', '', '']).map((opt, oi) => (
              <div key={oi} className="flex items-center gap-4 group">
                <button
                  onClick={() => updateSlide({ correct_index: oi })}
                  className={cn(
                    'w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-sm font-black shrink-0 transition-all shadow-sm',
                    selected.correct_index === oi
                      ? 'bg-sakura border-sakura text-white scale-110 shadow-sakura/20'
                      : 'bg-white border-sakura-light/20 text-muted-foreground hover:border-sakura-light hover:text-sakura'
                  )}
                >
                  {String.fromCharCode(65 + oi)}
                </button>
                <Input
                  value={opt}
                  onChange={e => {
                    const opts = [...(selected.options || ['', '', '', ''])];
                    opts[oi] = e.target.value;
                    updateSlide({ options: opts });
                  }}
                  placeholder={`Đáp án ${String.fromCharCode(65 + oi)}...`}
                  className={cn(
                    'h-12 rounded-xl border-2 transition-all', 
                    selected.correct_index === oi ? 'border-sakura bg-sakura/5 font-bold' : 'focus-visible:ring-sakura/20'
                  )}
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">Click vào chữ cái A, B, C, D để chọn đáp án đúng</p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Giải thích (tuỳ chọn)</Label>
          <Input 
            value={selected.explanation || ''} 
            onChange={e => updateSlide({ explanation: e.target.value })}
            placeholder="Giải thích tại sao đáp án này đúng..." 
            className="h-14 rounded-2xl border-2 focus-visible:ring-sakura/30 transition-all" 
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col font-sans">
      {/* --- Top bar --- */}
      <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-sakura-light/20 sticky top-0 z-40 flex items-center px-6 gap-6 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-sakura/10 text-sumi">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 flex items-center gap-4 min-w-0">
          <div className="h-10 w-10 bg-sakura-light/10 rounded-xl flex items-center justify-center shrink-0">
             <BookOpen className="h-5 w-5 text-sakura" />
          </div>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Tên bài giảng..."
            className="border-0 shadow-none text-2xl font-black bg-transparent focus-visible:ring-0 px-0 h-auto placeholder:text-slate-300 truncate"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button 
            variant="outline" 
            className="h-11 px-6 rounded-2xl border-2 border-sakura-light/30 gap-2 font-black uppercase text-[10px] tracking-widest hover:bg-sakura/5 hover:border-sakura/30 transition-all" 
            onClick={() => pdfRef.current?.click()}
          >
            <FileUp className="h-4 w-4 text-sakura" /> Import PDF
          </Button>
          <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={handlePdf} />

          <Button 
            variant="outline" 
            className="h-11 px-6 rounded-2xl border-2 border-slate-200 gap-2 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all" 
            onClick={() => handleSave(false)} 
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu nháp
          </Button>

          <Button 
            className="h-11 px-8 rounded-2xl bg-sakura hover:bg-sakura-dark text-white shadow-elevated gap-2 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95" 
            onClick={() => handleSave(true)} 
            disabled={saving}
          >
            <Send className="h-4 w-4" /> Publish
          </Button>
        </div>
      </header>

      {pdfProgress && (
        <div className="h-1 bg-sakura-light/20 w-full overflow-hidden">
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${(pdfProgress.current / pdfProgress.total) * 100}%` }}
             className="h-full bg-sakura shadow-[0_0_10px_rgba(255,183,197,0.8)]"
           />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* --- Sidebar: Slide List --- */}
        <aside className="w-80 bg-white border-r border-sakura-light/20 flex flex-col shrink-0">
          <div className="p-6 border-b border-sakura-light/10 space-y-3">
            <Button 
              className="w-full h-12 gap-2 rounded-xl bg-sakura text-white font-black uppercase text-[10px] tracking-widest shadow-soft hover:bg-sakura-dark transition-all" 
              onClick={() => addSlide('content')}
            >
              <Plus className="h-4 w-4" /> Slide nội dung
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 gap-2 rounded-xl border-2 border-sakura-light/20 text-sumi font-black uppercase text-[10px] tracking-widest hover:bg-sakura/5 transition-all" 
              onClick={() => addSlide('question')}
            >
              <HelpCircle className="h-4 w-4 text-sakura" /> Thêm câu hỏi
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {slides.map((s, i) => (
              <motion.div
                key={s.id}
                layout
                onClick={() => setSelectedIdx(i)}
                className={cn(
                  'group relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2',
                  i === selectedIdx 
                    ? 'bg-sakura/5 border-sakura shadow-sm' 
                    : 'bg-white border-transparent hover:border-sakura-light/30 hover:bg-slate-50'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors',
                  i === selectedIdx ? 'bg-sakura text-white' : 'bg-slate-100 text-slate-400'
                )}>
                  {i + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={cn('font-bold text-sm truncate', i === selectedIdx ? 'text-sakura' : 'text-sumi')}>
                    {s.slide_type === 'question' ? 'Câu hỏi trắc nghiệm' : (s.title || 'Slide mới')}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest font-black opacity-40">
                    {s.slide_type === 'question' ? 'Quiz Slide' : 'Content Slide'}
                  </p>
                </div>

                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={e => { e.stopPropagation(); moveSlide(i, -1); }} className="hover:text-sakura"><ChevronUp className="h-4 w-4" /></button>
                   <button onClick={e => { e.stopPropagation(); moveSlide(i, 1); }} className="hover:text-sakura"><ChevronDown className="h-4 w-4" /></button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="p-4 border-t border-sakura-light/10 flex items-center justify-between bg-slate-50/50">
             <div className="flex items-center gap-2">
                <Layout className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{slides.length} Slides</span>
             </div>
             <Badge variant="outline" className="text-[9px] font-black uppercase border-sakura-light/30 text-sakura">Premium Editor</Badge>
          </div>
        </aside>

        {/* --- Main Editor Area --- */}
        <main className="flex-1 overflow-y-auto p-12 bg-[#faf9f6] custom-scrollbar">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected?.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Badge className={cn('h-8 px-4 rounded-full gap-2 border-0 shadow-sm font-black text-[10px] uppercase tracking-widest', 
                        selected?.slide_type === 'question' ? 'bg-amber-400 text-white' : 'bg-sakura text-white')}>
                        {selected?.slide_type === 'question' ? <HelpCircle className="h-3 w-3" /> : <Layout className="h-3 w-3" />}
                        Slide {selectedIdx + 1}
                      </Badge>
                      <h2 className="text-xl font-bold text-sumi">
                        {selected?.slide_type === 'question' ? 'Biên tập câu hỏi' : 'Nội dung trang giảng'}
                      </h2>
                   </div>
                   
                   <Button 
                     variant="ghost" 
                     className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 gap-2 font-bold"
                     onClick={() => removeSlide(selectedIdx)}
                     disabled={slides.length === 1}
                   >
                     <Trash2 className="h-4 w-4" /> Xóa Slide
                   </Button>
                </div>

                <Card className="rounded-[3rem] border-2 border-sakura-light/10 shadow-card bg-white overflow-hidden">
                  <CardContent className="p-12">
                    {renderEditor()}
                  </CardContent>
                </Card>

                {/* Quick Add Buttons at bottom */}
                <div className="flex items-center justify-center gap-4 py-8">
                   <Button 
                     variant="outline" 
                     className="rounded-2xl h-14 px-8 border-2 border-sakura-light/20 gap-3 font-bold hover:bg-sakura/5 hover:border-sakura transition-all"
                     onClick={() => addSlide('content')}
                   >
                     <Plus className="h-5 w-5 text-sakura" /> Thêm slide nội dung
                   </Button>
                   <Button 
                     variant="outline" 
                     className="rounded-2xl h-14 px-8 border-2 border-sakura-light/20 gap-3 font-bold hover:bg-sakura/5 hover:border-sakura transition-all"
                     onClick={() => addSlide('question')}
                   >
                     <HelpCircle className="h-5 w-5 text-sakura" /> Thêm slide câu hỏi
                   </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LessonBuilder;
