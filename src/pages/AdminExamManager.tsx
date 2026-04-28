import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Upload, Link2, Trash2, Save, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, FileJson, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuestionDraft {
  section: string;
  question: string;
  options: [string, string, string, string];
  correct_index: number;
  explanation: string;
}

interface ExamDraft {
  title: string;
  level: string;
  duration: number;
  difficulty: string;
  description: string;
  questions: QuestionDraft[];
}

const EMPTY_QUESTION = (): QuestionDraft => ({
  section: 'Kiến thức ngôn ngữ',
  question: '',
  options: ['', '', '', ''],
  correct_index: 0,
  explanation: '',
});

const EMPTY_EXAM = (): ExamDraft => ({
  title: '',
  level: 'N5',
  duration: 120,
  difficulty: 'Cơ bản',
  description: '',
  questions: [EMPTY_QUESTION()],
});

const SECTIONS = ['Kiến thức ngôn ngữ', 'Đọc hiểu', 'Nghe hiểu', 'Ngữ pháp'];
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

// ─── Save to Supabase ─────────────────────────────────────────────────────────
async function saveExam(draft: ExamDraft, userId: string): Promise<string> {
  const { data: exam, error: examErr } = await (supabase as any)
    .from('mock_exams')
    .insert({
      title: draft.title,
      level: draft.level,
      duration: draft.duration,
      difficulty: draft.difficulty,
      description: draft.description || null,
      created_by: userId,
      is_published: true,
    })
    .select('id')
    .single();

  if (examErr) throw examErr;

  const questions = draft.questions.map((q, i) => ({
    exam_id: exam.id,
    section: q.section,
    question: q.question,
    options: q.options,
    correct_index: q.correct_index,
    explanation: q.explanation || null,
    order_index: i,
  }));

  const { error: qErr } = await (supabase as any)
    .from('exam_questions')
    .insert(questions);

  if (qErr) throw qErr;
  return exam.id;
}

// ─── Manual Tab ───────────────────────────────────────────────────────────────
function ManualTab({ onSaved }: { onSaved: () => void }) {
  const { profile } = useProfile();
  const [exam, setExam] = useState<ExamDraft>(EMPTY_EXAM());
  const [saving, setSaving] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number>(0);

  const updateExam = (key: keyof ExamDraft, val: any) =>
    setExam(prev => ({ ...prev, [key]: val }));

  const updateQuestion = (idx: number, key: keyof QuestionDraft, val: any) =>
    setExam(prev => {
      const qs = [...prev.questions];
      qs[idx] = { ...qs[idx], [key]: val };
      return { ...prev, questions: qs };
    });

  const updateOption = (qIdx: number, oIdx: number, val: string) =>
    setExam(prev => {
      const qs = [...prev.questions];
      const opts = [...qs[qIdx].options] as [string, string, string, string];
      opts[oIdx] = val;
      qs[qIdx] = { ...qs[qIdx], options: opts };
      return { ...prev, questions: qs };
    });

  const addQuestion = () => {
    setExam(prev => ({ ...prev, questions: [...prev.questions, EMPTY_QUESTION()] }));
    setExpandedIdx(exam.questions.length);
  };

  const removeQuestion = (idx: number) =>
    setExam(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!exam.title.trim()) return toast.error('Vui lòng nhập tiêu đề đề thi');
    if (exam.questions.some(q => !q.question.trim())) return toast.error('Có câu hỏi chưa điền nội dung');
    if (!profile?.user_id) return toast.error('Không tìm thấy user');
    setSaving(true);
    try {
      await saveExam(exam, profile.user_id);
      toast.success(`Đã lưu đề "${exam.title}" với ${exam.questions.length} câu!`);
      setExam(EMPTY_EXAM());
      onSaved();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi khi lưu đề thi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Exam info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Thông tin đề thi</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Tiêu đề *</Label>
            <Input placeholder="VD: Đề thi thử N5 - Số 4" value={exam.title} onChange={e => updateExam('title', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cấp độ</Label>
            <Select value={exam.level} onValueChange={v => updateExam('level', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Thời gian (phút)</Label>
            <Input type="number" value={exam.duration} onChange={e => updateExam('duration', Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Độ khó</Label>
            <Select value={exam.difficulty} onValueChange={v => updateExam('difficulty', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Cơ bản', 'Trung bình', 'Nâng cao'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Input placeholder="Mô tả ngắn..." value={exam.description} onChange={e => updateExam('description', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Câu hỏi ({exam.questions.length})</h3>
          <Button size="sm" variant="outline" onClick={addQuestion} className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm câu
          </Button>
        </div>

        {exam.questions.map((q, idx) => (
          <Card key={idx} className={cn('border-2', expandedIdx === idx ? 'border-primary/30' : 'border-border')}>
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setExpandedIdx(expandedIdx === idx ? -1 : idx)}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                <span className="text-sm font-medium truncate max-w-xs">{q.question || 'Câu hỏi chưa điền...'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{q.section}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={e => { e.stopPropagation(); removeQuestion(idx); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                {expandedIdx === idx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>

            {expandedIdx === idx && (
              <CardContent className="pt-0 space-y-4 border-t">
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phần thi</Label>
                    <Select value={q.section} onValueChange={v => updateQuestion(idx, 'section', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Đáp án đúng</Label>
                    <Select value={String(q.correct_index)} onValueChange={v => updateQuestion(idx, 'correct_index', Number(v))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['A (1)', 'B (2)', 'C (3)', 'D (4)'].map((l, i) => <SelectItem key={i} value={String(i)}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nội dung câu hỏi *</Label>
                  <Textarea rows={2} placeholder="Nhập câu hỏi..." value={q.question} onChange={e => updateQuestion(idx, 'question', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="space-y-1">
                      <Label className={cn('text-xs', q.correct_index === oIdx ? 'text-green-600 font-bold' : '')}>
                        {String.fromCharCode(65 + oIdx)} {q.correct_index === oIdx ? '✓' : ''}
                      </Label>
                      <Input
                        placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}`}
                        value={opt}
                        onChange={e => updateOption(idx, oIdx, e.target.value)}
                        className={cn(q.correct_index === oIdx ? 'border-green-400 bg-green-50' : '')}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Giải thích (tuỳ chọn)</Label>
                  <Input placeholder="Giải thích đáp án..." value={q.explanation} onChange={e => updateQuestion(idx, 'explanation', e.target.value)} />
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full h-12 gap-2 font-bold">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Lưu đề thi ({exam.questions.length} câu)
      </Button>
    </div>
  );
}

// ─── JSON Tab ─────────────────────────────────────────────────────────────────
function JsonTab({ onSaved }: { onSaved: () => void }) {
  const { profile } = useProfile();
  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState<ExamDraft | null>(null);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    try {
      const data = JSON.parse(jsonText);
      // Validate minimal structure
      if (!data.title || !Array.isArray(data.questions)) throw new Error('Thiếu "title" hoặc "questions"');
      setParsed(data as ExamDraft);
      setParseError('');
    } catch (e: any) {
      setParseError(e.message);
      setParsed(null);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setJsonText(ev.target?.result as string); };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!parsed || !profile?.user_id) return;
    setSaving(true);
    try {
      await saveExam(parsed, profile.user_id);
      toast.success(`Đã import "${parsed.title}" — ${parsed.questions.length} câu!`);
      setJsonText(''); setParsed(null);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const SAMPLE = JSON.stringify({
    title: "Đề thi thử N5 - Số 2",
    level: "N5",
    duration: 120,
    difficulty: "Trung bình",
    questions: [
      {
        section: "Kiến thức ngôn ngữ",
        question: "この___の名前は何ですか。",
        options: ["花", "鼻", "話", "放"],
        correct_index: 0,
        explanation: "Hana = Hoa"
      }
    ]
  }, null, 2);

  return (
    <div className="space-y-5">
      <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-bold flex items-center gap-2"><FileJson className="h-4 w-4 text-primary" /> Cấu trúc JSON chuẩn</p>
          <pre className="text-xs bg-background rounded-lg p-3 overflow-x-auto border">{SAMPLE}</pre>
          <p className="text-xs text-muted-foreground">💡 Dùng ChatGPT để convert đề PDF/Word sang JSON theo cấu trúc trên.</p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Upload file .json
        </Button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
      </div>

      <div className="space-y-1.5">
        <Label>Hoặc dán JSON trực tiếp</Label>
        <Textarea
          rows={12}
          placeholder="Dán JSON vào đây..."
          value={jsonText}
          onChange={e => { setJsonText(e.target.value); setParsed(null); setParseError(''); }}
          className="font-mono text-xs"
        />
      </div>

      {parseError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" /> {parseError}
        </div>
      )}

      {parsed && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Parse thành công: <strong>{parsed.title}</strong> — {parsed.questions.length} câu hỏi — {parsed.level}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleParse} disabled={!jsonText.trim()} className="gap-2">
          Parse JSON
        </Button>
        <Button onClick={handleSave} disabled={!parsed || saving} className="gap-2 flex-1 font-bold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Import vào DB
        </Button>
      </div>
    </div>
  );
}

// ─── Google Sheets Tab ────────────────────────────────────────────────────────
function SheetsTab({ onSaved }: { onSaved: () => void }) {
  const { profile } = useProfile();
  const [sheetUrl, setSheetUrl] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [examLevel, setExamLevel] = useState('N5');
  const [examDuration, setExamDuration] = useState(120);
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState<QuestionDraft[]>([]);
  const [saving, setSaving] = useState(false);

  // Convert Sheets URL → CSV export URL
  const toCsvUrl = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return null;
    const id = match[1];
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  };

  const handleFetch = async () => {
    const csvUrl = toCsvUrl(sheetUrl);
    if (!csvUrl) return toast.error('URL Google Sheets không hợp lệ');
    setFetching(true);
    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error('Không thể fetch sheet. Hãy đảm bảo sheet đã được publish public.');
      const text = await res.text();
      const rows = text.trim().split('\n').map(r => r.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
      // Skip header row: section, question, option_a, option_b, option_c, option_d, correct (A/B/C/D), explanation
      const questions: QuestionDraft[] = rows.slice(1).filter(r => r.length >= 7 && r[1]).map(r => ({
        section: r[0] || 'Kiến thức ngôn ngữ',
        question: r[1],
        options: [r[2] || '', r[3] || '', r[4] || '', r[5] || ''] as [string,string,string,string],
        correct_index: Math.max(0, ['A','B','C','D'].indexOf((r[6] || 'A').toUpperCase())),
        explanation: r[7] || '',
      }));
      setPreview(questions);
      toast.success(`Đọc được ${questions.length} câu từ sheet`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!examTitle.trim()) return toast.error('Nhập tiêu đề đề thi');
    if (!profile?.user_id) return;
    setSaving(true);
    try {
      await saveExam({ title: examTitle, level: examLevel, duration: examDuration, difficulty: 'Cơ bản', description: '', questions: preview }, profile.user_id);
      toast.success(`Đã import "${examTitle}" — ${preview.length} câu!`);
      setPreview([]); setSheetUrl(''); setExamTitle('');
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-dashed border-2 border-green-200 bg-green-50">
        <CardContent className="p-5 space-y-2">
          <p className="text-sm font-bold text-green-700">📋 Cách chuẩn bị Google Sheets</p>
          <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
            <li>Tạo sheet với header: <code className="bg-white px-1 rounded">section, question, option_a, option_b, option_c, option_d, correct, explanation</code></li>
            <li>Cột <code className="bg-white px-1 rounded">correct</code> điền A, B, C hoặc D</li>
            <li>File → Share → Publish to web → CSV → Copy link</li>
            <li>Dán link vào ô bên dưới</li>
          </ol>
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label>URL Google Sheets (đã publish)</Label>
        <div className="flex gap-2">
          <Input placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} />
          <Button variant="outline" onClick={handleFetch} disabled={fetching || !sheetUrl} className="gap-2 shrink-0">
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Fetch
          </Button>
        </div>
      </div>

      {preview.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
            <CheckCircle2 className="h-4 w-4" /> Đọc được {preview.length} câu hỏi
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5 md:col-span-1">
              <Label>Tiêu đề đề thi *</Label>
              <Input placeholder="VD: Đề N5 từ Sheet" value={examTitle} onChange={e => setExamTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cấp độ</Label>
              <Select value={examLevel} onValueChange={setExamLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Thời gian (phút)</Label>
              <Input type="number" value={examDuration} onChange={e => setExamDuration(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !examTitle} className="w-full h-12 gap-2 font-bold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Import {preview.length} câu vào DB
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Exam List ────────────────────────────────────────────────────────────────
function ExamList({ refresh }: { refresh: number }) {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from('mock_exams').select('id, title, level, duration, difficulty, created_at').order('created_at', { ascending: false });
      setExams(data || []);
      setLoading(false);
    })();
  }, [refresh]);

  const deleteExam = async (id: string, title: string) => {
    if (!confirm(`Xóa đề "${title}"?`)) return;
    await (supabase as any).from('mock_exams').delete().eq('id', id);
    setExams(prev => prev.filter(e => e.id !== id));
    toast.success('Đã xóa đề thi');
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (exams.length === 0) return <p className="text-center text-muted-foreground py-8">Chưa có đề thi nào.</p>;

  return (
    <div className="space-y-3">
      {exams.map(e => (
        <div key={e.id} className="flex items-center justify-between p-4 bg-card rounded-xl border">
          <div className="flex items-center gap-3">
            <Badge>{e.level}</Badge>
            <div>
              <p className="font-bold text-sm">{e.title}</p>
              <p className="text-xs text-muted-foreground">{e.duration} phút · {e.difficulty}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"
            onClick={() => deleteExam(e.id, e.title)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AdminExamManager = () => {
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const onSaved = () => setRefresh(r => r + 1);

  useEffect(() => {
    if (!loading && profile?.role !== 'admin') navigate('/');
  }, [profile, loading, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container py-8 max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Quản lý đề thi</h1>
          <p className="text-muted-foreground mt-1">Thêm đề thi bằng tay, JSON hoặc Google Sheets</p>
        </div>

        <Tabs defaultValue="manual">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="manual" className="gap-2"><Plus className="h-4 w-4" />Nhập tay</TabsTrigger>
            <TabsTrigger value="json" className="gap-2"><FileJson className="h-4 w-4" />JSON</TabsTrigger>
            <TabsTrigger value="sheets" className="gap-2"><Link2 className="h-4 w-4" />Sheets</TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="mt-6"><ManualTab onSaved={onSaved} /></TabsContent>
          <TabsContent value="json" className="mt-6"><JsonTab onSaved={onSaved} /></TabsContent>
          <TabsContent value="sheets" className="mt-6"><SheetsTab onSaved={onSaved} /></TabsContent>
        </Tabs>

        <div>
          <h2 className="text-xl font-bold mb-4">Đề thi hiện có</h2>
          <ExamList refresh={refresh} />
        </div>
      </main>
    </div>
  );
};
export default AdminExamManager;
