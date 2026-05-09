import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Save, Upload, Image, HelpCircle,
  Loader2, FileUp, GripVertical, Eye, Send, ChevronUp, ChevronDown
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

    // Tạo lesson draft trước để có lessonId
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

  // ── Upload ảnh đơn ────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;

    let lid = lessonId;
    if (!lid) { lid = await saveDraft(); if (!lid) return; }

    setUploadingImg(true);
    try {
      const url = await uploadSlideImage(file, lid, selected.id);
      if (url) updateSlide({ image_url: url });
      else toast({ title: 'Upload ảnh thất bại. Kiểm tra Supabase Storage bucket "lesson-images"', variant: 'destructive' });
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  // ── Save helpers ──────────────────────────────────────────────
  const saveDraft = async (): Promise<string | null> => {
    if (!title.trim() || !user) {
      toast({ title: 'Nhập tiêu đề bài giảng', variant: 'destructive' });
      return null;
    }
    if (lessonId) return lessonId;

    const { data, error } = await (supabase as any)
      .from('lessons')
      .insert({ teacher_id: user.id, class_id: classId || null, title: title.trim(), description: description.trim() || null })
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

      // Update lesson meta
      await (supabase as any).from('lessons').update({
        title: title.trim(), description: description.trim() || null,
        is_published: publish,
      }).eq('id', lid);

      // Delete all slides then re-insert (simple replace strategy)
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
        options: s.options ?? null,
        correct_index: s.correct_index ?? null,
        explanation: s.explanation || null,
      }));

      await (supabase as any).from('lesson_slides').insert(rows);

      toast({ title: publish ? 'Đã publish bài giảng! 🎉' : 'Đã lưu bản nháp ✅' });
      if (publish && classId) navigate(`/teacher/classes/${classId}`);
    } catch (err: any) {
      toast({ title: 'Lỗi lưu', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Editor panel for selected slide ──────────────────────────
  const renderEditor = () => {
    if (!selected) return null;

    if (selected.slide_type === 'content') {
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tiêu đề slide</Label>
            <Input value={selected.title || ''} onChange={e => updateSlide({ title: e.target.value })} placeholder="Tiêu đề..." className="rounded-xl" />
          </div>

          {/* Image area */}
          <div className="space-y-1.5">
            <Label>Hình ảnh (tuỳ chọn)</Label>
            {selected.image_url ? (
              <div className="relative rounded-xl overflow-hidden border">
                <img src={selected.image_url} alt="slide" className="w-full object-contain max-h-48" />
                <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => updateSlide({ image_url: '' })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => imgRef.current?.click()}
                disabled={uploadingImg}
                className="w-full h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                {uploadingImg ? <Loader2 className="h-5 w-5 animate-spin" /> : <Image className="h-6 w-6" />}
                <span className="text-xs">Click để upload ảnh</span>
              </button>
            )}
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {selected.image_url && (
              <Input value={selected.image_caption || ''} onChange={e => updateSlide({ image_caption: e.target.value })}
                placeholder="Chú thích ảnh..." className="rounded-xl text-xs" />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Nội dung</Label>
            <Textarea value={selected.body || ''} onChange={e => updateSlide({ body: e.target.value })}
              placeholder="Nội dung văn bản của slide..." rows={6} className="rounded-xl resize-none" />
          </div>
        </div>
      );
    }

    // Question editor
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Câu hỏi *</Label>
          <Textarea value={selected.question_text || ''} onChange={e => updateSlide({ question_text: e.target.value })}
            placeholder="Nội dung câu hỏi..." rows={3} className="rounded-xl resize-none" />
        </div>
        <div className="space-y-2">
          <Label>Các đáp án</Label>
          {(selected.options || ['', '', '', '']).map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <button
                onClick={() => updateSlide({ correct_index: oi })}
                className={cn(
                  'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 transition-all',
                  selected.correct_index === oi
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-border text-muted-foreground hover:border-emerald-400'
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
                placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                className={cn('rounded-xl', selected.correct_index === oi ? 'border-emerald-400 bg-emerald-50' : '')}
              />
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">Click chữ cái để chọn đáp án đúng</p>
        </div>
        <div className="space-y-1.5">
          <Label>Giải thích (tuỳ chọn)</Label>
          <Input value={selected.explanation || ''} onChange={e => updateSlide({ explanation: e.target.value })}
            placeholder="Giải thích đáp án đúng..." className="rounded-xl" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center gap-3 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex-1 min-w-0">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Tên bài giảng..."
              className="border-0 shadow-none text-lg font-bold bg-transparent focus-visible:ring-0 px-0 h-auto"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* PDF import */}
            <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex" onClick={() => pdfRef.current?.click()}>
              <FileUp className="h-4 w-4" /> Import PDF
            </Button>
            <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={handlePdf} />

            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Lưu nháp
            </Button>
            <Button size="sm" className="gap-1.5 bg-primary" onClick={() => handleSave(true)} disabled={saving}>
              <Send className="h-3.5 w-3.5" /> Publish
            </Button>
          </div>
        </div>
        {pdfProgress && (
          <div className="px-4 py-2 border-t bg-primary/5">
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <span className="text-muted-foreground">Đang xử lý trang {pdfProgress.current}/{pdfProgress.total}...</span>
              <Progress value={(pdfProgress.current / pdfProgress.total) * 100} className="flex-1 h-1.5" />
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Slide list sidebar */}
        <aside className="w-52 border-r bg-muted/20 flex flex-col overflow-y-auto shrink-0">
          <div className="p-3 border-b space-y-2">
            <Button size="sm" className="w-full gap-1.5 rounded-xl" onClick={() => addSlide('content')}>
              <Plus className="h-3.5 w-3.5" /> Slide nội dung
            </Button>
            <Button size="sm" variant="outline" className="w-full gap-1.5 rounded-xl" onClick={() => addSlide('question')}>
              <HelpCircle className="h-3.5 w-3.5" /> Câu hỏi
            </Button>
          </div>

          <div className="flex-1 p-2 space-y-1 overflow-y-auto">
            {slides.map((s, i) => (
              <div
                key={s.id}
                onClick={() => setSelectedIdx(i)}
                className={cn(
                  'group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all text-sm',
                  i === selectedIdx ? 'bg-primary text-white' : 'hover:bg-muted'
                )}
              >
                <span className={cn('w-5 h-5 rounded flex items-center justify-center text-[10px] font-black shrink-0',
                  i === selectedIdx ? 'bg-white/20' : 'bg-muted-foreground/10')}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  {s.slide_type === 'question'
                    ? <Badge className="text-[9px] bg-amber-400/20 text-amber-700 border-0 px-1 h-4">Câu hỏi</Badge>
                    : <p className="truncate text-xs">{s.title || s.image_url ? '🖼 Ảnh' : 'Trống'}</p>
                  }
                </div>
                <div className={cn('hidden group-hover:flex flex-col gap-0.5', i === selectedIdx && 'flex')}>
                  <button onClick={e => { e.stopPropagation(); moveSlide(i, -1); }}
                    className="hover:bg-white/20 rounded p-0.5"><ChevronUp className="h-2.5 w-2.5" /></button>
                  <button onClick={e => { e.stopPropagation(); moveSlide(i, 1); }}
                    className="hover:bg-white/20 rounded p-0.5"><ChevronDown className="h-2.5 w-2.5" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 border-t text-center">
            <p className="text-[10px] text-muted-foreground">{slides.length} slides</p>
          </div>
        </aside>

        {/* Main editor */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Slide type badge */}
            {selected && (
              <div className="flex items-center gap-3">
                <Badge className={cn('gap-1.5', selected.slide_type === 'question' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-primary/10 text-primary border-primary/20')}>
                  {selected.slide_type === 'question' ? <HelpCircle className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                  {selected.slide_type === 'question' ? 'Slide câu hỏi' : 'Slide nội dung'}
                </Badge>
                <span className="text-xs text-muted-foreground">Slide {selectedIdx + 1} / {slides.length}</span>
                <Button size="sm" variant="ghost" className="ml-auto text-rose-400 hover:text-rose-500 hover:bg-rose-50 gap-1 text-xs"
                  onClick={() => removeSlide(selectedIdx)} disabled={slides.length === 1}>
                  <Trash2 className="h-3.5 w-3.5" /> Xóa slide
                </Button>
              </div>
            )}

            {/* Editor form */}
            <Card className="rounded-2xl border-2">
              <CardContent className="p-6">
                {renderEditor()}
              </CardContent>
            </Card>

            {/* Add slide buttons at bottom */}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => addSlide('content')}>
                <Plus className="h-3.5 w-3.5" /> Thêm slide nội dung
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => addSlide('question')}>
                <HelpCircle className="h-3.5 w-3.5" /> Thêm câu hỏi
              </Button>
            </div>
          </div>
        </main>

        {/* Mini preview */}
        <aside className="w-64 border-l bg-muted/10 hidden xl:flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <p className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Xem trước
            </p>
          </div>
          <div className="flex-1 p-3 overflow-y-auto">
            <SlidePreview slide={selected} />
          </div>
        </aside>
      </div>
    </div>
  );
};

// ── Mini preview component ────────────────────────────────────
function SlidePreview({ slide }: { slide: Slide | undefined }) {
  if (!slide) return null;

  if (slide.slide_type === 'content') {
    return (
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden aspect-video flex flex-col">
        {slide.image_url && (
          <img src={slide.image_url} alt="" className="w-full object-cover flex-1 min-h-0" />
        )}
        <div className="p-3 space-y-1 shrink-0">
          {slide.title && <p className="font-bold text-xs leading-tight">{slide.title}</p>}
          {slide.body && <p className="text-[9px] text-muted-foreground line-clamp-3">{slide.body}</p>}
          {!slide.title && !slide.body && !slide.image_url && (
            <p className="text-[9px] text-muted-foreground/50 italic">Slide trống...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden p-3 space-y-2">
      <Badge className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 h-4">Câu hỏi</Badge>
      <p className="text-[10px] font-bold leading-tight">{slide.question_text || 'Chưa có câu hỏi'}</p>
      <div className="space-y-1">
        {(slide.options || []).map((opt, i) => (
          <div key={i} className={cn(
            'text-[9px] px-2 py-1 rounded border flex items-center gap-1',
            slide.correct_index === i ? 'border-emerald-300 bg-emerald-50' : 'border-border'
          )}>
            <span className="font-black">{String.fromCharCode(65 + i)}.</span> {opt || '...'}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LessonBuilder;
