import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FilePlus, Upload, Database, ChevronLeft, Save, Trash2, 
  Plus, AlertCircle, CheckCircle2, Loader2, Link as LinkIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface QuestionDraft {
  section: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  image_url: string;
  passage: string;
}

export const ExamManager = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Exam Details
  const [examTitle, setExamTitle] = useState('');
  const [examLevel, setExamLevel] = useState('N5');
  const [examDuration, setExamDuration] = useState('120');

  // Tab 1: Manual
  const [manualQuestions, setManualQuestions] = useState<QuestionDraft[]>([
    { section: 'Kiến thức ngôn ngữ', question: '', options: ['', '', '', ''], correct: 0, explanation: '', image_url: '', passage: '' }
  ]);

  // Tab 2: JSON
  const [jsonText, setJsonText] = useState('');

  // Tab 3: Google Sheets
  const [sheetUrl, setSheetUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const handleAddQuestion = () => {
    setManualQuestions([...manualQuestions, { 
      section: 'Kiến thức ngôn ngữ', 
      question: '', 
      options: ['', '', '', ''], 
      correct: 0, 
      explanation: '',
      image_url: '',
      passage: ''
    }]);
  };

  const handleRemoveQuestion = (index: number) => {
    setManualQuestions(manualQuestions.filter((_, i) => i !== index));
  };

  const handleManualSave = async () => {
    if (!examTitle) return toast.error("Vui lòng nhập tiêu đề đề thi");
    setIsSaving(true);
    
    try {
      const { data: exam, error: examErr } = await (supabase as any)
        .from('mock_exams')
        .insert({
          title: examTitle,
          level: examLevel,
          duration: parseInt(examDuration),
        })
        .select()
        .single();

      if (examErr) throw examErr;

      const questionsToInsert = manualQuestions.map(q => ({
        exam_id: exam.id,
        question: q.question,
        options: q.options,
        correct: q.correct,
        section: q.section,
        explanation: q.explanation,
        image_url: q.image_url,
        passage: q.passage
      }));

      const { error: qErr } = await (supabase as any)
        .from('mock_exam_questions')
        .insert(questionsToInsert);

      if (qErr) throw qErr;

      toast.success("Đã tạo đề thi thành công!");
      navigate('/mock-tests');
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu đề thi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleJsonImport = async () => {
    try {
      const data = JSON.parse(jsonText);
      if (!data.title || !data.questions) throw new Error("JSON không đúng định dạng chuẩn");
      
      setIsSaving(true);
      const { data: exam, error: examErr } = await (supabase as any)
        .from('mock_exams')
        .insert({
          title: data.title,
          level: data.level || 'N5',
          duration: data.duration || 120,
        })
        .select()
        .single();

      if (examErr) throw examErr;

      const questionsToInsert = data.questions.map((q: any) => ({
        exam_id: exam.id,
        question: q.question,
        options: q.options,
        correct: q.correct,
        section: q.section,
        explanation: q.explanation,
        image_url: q.image_url || '',
        passage: q.passage || ''
      }));

      await (supabase as any).from('mock_exam_questions').insert(questionsToInsert);
      toast.success("Import JSON thành công!");
      navigate('/mock-tests');
    } catch (err: any) {
      toast.error("Format JSON không hợp lệ: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchSheet = async () => {
    if (!sheetUrl.includes('pub?output=csv')) {
       return toast.error("Vui lòng sử dụng URL CSV từ 'Publish to web'");
    }
    
    setIsFetching(true);
    try {
      const resp = await fetch(sheetUrl);
      const csvData = await resp.text();
      
      // Basic CSV Parser (assuming simple structure)
      const rows = csvData.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '')));
      const headers = rows[0];
      const questions = rows.slice(1).filter(r => r.length > 1).map(row => ({
        section: row[0] || 'Kiến thức ngôn ngữ',
        question: row[1],
        options: [row[2], row[3], row[4], row[5]],
        correct: parseInt(row[6]) || 0,
        explanation: row[7] || '',
        image_url: row[8] || '',
        passage: row[9] || ''
      }));

      setManualQuestions(questions);
      toast.success(`Đã lấy được ${questions.length} câu từ Google Sheets!`);
    } catch (err) {
      toast.error("Không thể lấy dữ liệu từ Sheets");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-slate-950 pb-20">
      <Navigation />
      
      <main className="max-w-6xl mx-auto px-4 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 text-slate-400 mb-2">
              <ChevronLeft className="h-4 w-4" /> Quay lại
            </Button>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
              <Database className="h-8 w-8 text-sakura" />
              Quản lý Đề thi JLPT
            </h1>
          </div>
          <Button 
             onClick={handleManualSave} 
             disabled={isSaving}
             className="bg-sakura text-white px-8 h-12 rounded-2xl font-black shadow-lg shadow-sakura/20 gap-2"
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            XUẤT BẢN ĐỀ THI
          </Button>
        </div>

        <Card className="rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tiêu đề đề thi</Label>
                <Input value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="VD: Đề thi thử N5 - Số 1" className="rounded-xl border-2" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trình độ</Label>
                <Select value={examLevel} onValueChange={setExamLevel}>
                  <SelectTrigger className="rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['N5', 'N4', 'N3', 'N2', 'N1'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Thời gian (Phút)</Label>
                <Input type="number" value={examDuration} onChange={e => setExamDuration(e.target.value)} className="rounded-xl border-2" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="w-full h-16 bg-white border-b border-slate-100 rounded-none p-0">
                <TabsTrigger value="manual" className="flex-1 h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-sakura/5 data-[state=active]:text-sakura rounded-none border-b-2 border-transparent data-[state=active]:border-sakura">
                  <FilePlus className="h-4 w-4 mr-2" /> Nhập tay
                </TabsTrigger>
                <TabsTrigger value="json" className="flex-1 h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-sakura/5 data-[state=active]:text-sakura rounded-none border-b-2 border-transparent data-[state=active]:border-sakura">
                  <Upload className="h-4 w-4 mr-2" /> Upload JSON
                </TabsTrigger>
                <TabsTrigger value="sheets" className="flex-1 h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-sakura/5 data-[state=active]:text-sakura rounded-none border-b-2 border-transparent data-[state=active]:border-sakura">
                  <LinkIcon className="h-4 w-4 mr-2" /> Google Sheets
                </TabsTrigger>
              </TabsList>

              <div className="p-8">
                <TabsContent value="manual" className="m-0 space-y-8">
                  {manualQuestions.map((q, idx) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className="p-8 rounded-[2rem] border-2 border-slate-100 space-y-6 relative group">
                       <button 
                         onClick={() => handleRemoveQuestion(idx)}
                         className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                       >
                         <Trash2 className="h-5 w-5" />
                       </button>

                       <div className="grid md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Câu hỏi {idx + 1}</Label>
                            <Input value={q.question} onChange={e => {
                               const newQ = [...manualQuestions];
                               newQ[idx].question = e.target.value;
                               setManualQuestions(newQ);
                            }} placeholder="Nhập nội dung câu hỏi..." className="rounded-xl border-slate-200" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phần thi</Label>
                            <Select value={q.section} onValueChange={v => {
                               const newQ = [...manualQuestions];
                               newQ[idx].section = v;
                               setManualQuestions(newQ);
                            }}>
                              <SelectTrigger className="rounded-xl border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Kiến thức ngôn ngữ">Kiến thức ngôn ngữ</SelectItem>
                                <SelectItem value="Đọc hiểu">Đọc hiểu</SelectItem>
                                <SelectItem value="Nghe hiểu">Nghe hiểu</SelectItem>
                              </SelectContent>
                            </Select>
                         </div>
                       </div>

                       <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="space-y-2">
                               <Label className="text-[10px] font-black text-slate-400">Lựa chọn {optIdx + 1}</Label>
                               <div className="relative">
                                  <Input value={opt} onChange={e => {
                                     const newQ = [...manualQuestions];
                                     newQ[idx].options[optIdx] = e.target.value;
                                     setManualQuestions(newQ);
                                  }} className={cn("rounded-xl border-slate-200 pr-10", q.correct === optIdx && "border-sakura bg-sakura/5")} />
                                  <button 
                                    onClick={() => {
                                      const newQ = [...manualQuestions];
                                      newQ[idx].correct = optIdx;
                                      setManualQuestions(newQ);
                                    }}
                                    className={cn("absolute right-3 top-1/2 -translate-y-1/2 rounded-full h-5 w-5 flex items-center justify-center transition-all", q.correct === optIdx ? "bg-sakura text-white" : "bg-slate-100 text-slate-300")}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                  </button>
                               </div>
                            </div>
                          ))}
                       </div>

                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Giải thích (Tùy chọn)</Label>
                          <Textarea value={q.explanation} onChange={e => {
                             const newQ = [...manualQuestions];
                             newQ[idx].explanation = e.target.value;
                             setManualQuestions(newQ);
                          }} placeholder="Giải thích đáp án đúng..." className="rounded-xl border-slate-200 min-h-[80px]" />
                       </div>

                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Link ảnh minh họa (Tùy chọn)</Label>
                           <Input value={q.image_url} onChange={e => {
                              const newQ = [...manualQuestions];
                              newQ[idx].image_url = e.target.value;
                              setManualQuestions(newQ);
                           }} placeholder="https://image-url.com/photo.jpg" className="rounded-xl border-slate-200" />
                        </div>

                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Đoạn văn đọc hiểu (Dùng cho bài đọc dài)</Label>
                           <Textarea value={q.passage} onChange={e => {
                              const newQ = [...manualQuestions];
                              newQ[idx].passage = e.target.value;
                              setManualQuestions(newQ);
                           }} placeholder="Dán nội dung bài đọc tại đây..." className="rounded-xl border-slate-200 min-h-[120px] font-jp text-lg" />
                        </div>
                    </motion.div>
                  ))}
                  
                  <Button variant="outline" onClick={handleAddQuestion} className="w-full h-16 rounded-[1.5rem] border-dashed border-2 border-slate-200 hover:border-sakura hover:text-sakura gap-2 font-black">
                    <Plus className="h-5 w-5" /> THÊM CÂU HỎI MỚI
                  </Button>
                </TabsContent>

                <TabsContent value="json" className="m-0 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-black text-slate-700">Dán dữ liệu JSON vào đây</Label>
                    <Textarea 
                      value={jsonText} 
                      onChange={e => setJsonText(e.target.value)}
                      placeholder='{ "title": "Đề thi N5...", "questions": [...] }'
                      className="min-h-[400px] font-mono text-sm rounded-3xl border-2 p-6"
                    />
                  </div>
                  <Button onClick={handleJsonImport} disabled={!jsonText || isSaving} className="w-full h-14 rounded-2xl bg-slate-800 text-white font-black uppercase tracking-widest">
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Phân tích và Import"}
                  </Button>
                </TabsContent>

                <TabsContent value="sheets" className="m-0 space-y-8">
                  <div className="p-8 rounded-[2.5rem] bg-indigo-50 border-2 border-indigo-100 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                        <LinkIcon className="h-6 w-6 text-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-800">Kết nối Google Sheets</h4>
                        <p className="text-xs text-indigo-400 font-medium italic">Yêu cầu Sheet được Publish to web dạng CSV</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                       <Input 
                         value={sheetUrl} 
                         onChange={e => setSheetUrl(e.target.value)}
                         placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                         className="rounded-xl border-2 h-12 bg-white"
                       />
                       <Button onClick={handleFetchSheet} disabled={isFetching} className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black">
                         {isFetching ? <Loader2 className="h-5 w-5 animate-spin" /> : "LẤY DỮ LIỆU"}
                       </Button>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border-2 border-slate-100 space-y-4">
                    <div className="flex items-center gap-2">
                       <AlertCircle className="h-4 w-4 text-amber-500" />
                       <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Thứ tự cột CSV chuẩn</h5>
                    </div>
                     <div className="flex gap-2 text-[9px] font-bold">
                        {['Phần thi', 'Câu hỏi', 'Đáp án 1-4', 'Chỉ số đúng (0-3)', 'Giải thích', 'Link ảnh', 'Đoạn văn'].map(h => (
                          <span key={h} className="px-3 py-1 bg-slate-100 rounded-full">{h}</span>
                        ))}
                     </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ExamManager;
