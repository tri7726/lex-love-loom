
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, Trophy, X, Menu, Loader2, AlertCircle, BookOpen, Headphones, Play, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSRS } from '@/hooks/useSRS';
import { cn } from '@/lib/utils';
import { toast as sonnerToast } from 'sonner';
import { QuickSelectionLookup } from '@/components/lexicon/QuickSelectionLookup';

interface ExamQuestion {
  id: string;
  section: string;
  section_type: 'vocabulary_grammar' | 'reading' | 'listening';
  question: string;
  options: string[];
  correct: number;
  explanation: string | null;
  image_url: string | null;
  passage: string | null;
  audio_url: string | null;
  point_weight: number;
  order_index: number;
}

interface ExamMeta {
  id: string;
  title: string;
  level: string;
  duration: number; // total fallback
  durations: Record<string, number>; // section durations
  passing_total: number;
  section_benchmarks: Record<string, number>;
}

export const JLPTMockExam = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { syncQuizResult } = useSRS();

  const [meta, setMeta] = useState<ExamMeta | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingExam, setLoadingExam] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [playedAudios, setPlayedAudios] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentSection, setCurrentSection] = useState<'vocabulary_grammar' | 'reading' | 'listening'>('vocabulary_grammar');
  const [sectionTimeLeft, setSectionTimeLeft] = useState<Record<string, number>>({});
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const savedRef = useRef(false);

  // Load exam from DB
  useEffect(() => {
    if (!examId) return;
    (async () => {
      setLoadingExam(true);
      const { data: examData, error: examErr } = await (supabase as any)
        .from('mock_exams')
        .select('id, title, level, duration, passing_total, section_benchmarks')
        .eq('id', examId)
        .single();

      if (examErr || !examData) {
        setLoadError('Không tìm thấy đề thi.');
        setLoadingExam(false);
        return;
      }

      // Hardcode logic for N-levels if durations not in DB yet
      const durations: Record<string, number> = {
        vocabulary_grammar: Math.floor(examData.duration * 0.4) * 60,
        reading: Math.floor(examData.duration * 0.35) * 60,
        listening: Math.floor(examData.duration * 0.25) * 60
      };

      setMeta({ ...examData, durations });
      setTimeLeft(examData.duration * 60);
      setSectionTimeLeft(durations);

      // Load questions
      const { data: qData, error: qErr } = await (supabase as any)
        .from('mock_exam_questions')
        .select('id, section, section_type, question, options, correct, explanation, image_url, passage, audio_url, point_weight')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true });

      if (qErr) {
        setLoadError(`Lỗi hệ thống: ${qErr.message} (Mã: ${qErr.code})`);
      } else {
        setQuestions((qData as any) || []);
      }
      setLoadingExam(false);
    })();
  }, [examId]);

  // Timer & Section Logic
  useEffect(() => {
    if (loadingExam || isFinished || !meta) return;

    const t = setInterval(() => {
      setSectionTimeLeft(prev => {
        const current = prev[currentSection];
        if (current <= 1) {
          handleSectionTimeout();
          return { ...prev, [currentSection]: 0 };
        }
        return { ...prev, [currentSection]: current - 1 };
      });

      setTimeLeft(p => Math.max(0, p - 1));
    }, 1000);

    return () => clearInterval(t);
  }, [loadingExam, isFinished, currentSection, meta]);

  const handleSectionTimeout = () => {
    if (currentSection === 'vocabulary_grammar') {
      setCurrentSection('reading');
      // Find first reading question
      const firstReadingIdx = questions.findIndex(q => q.section_type === 'reading');
      if (firstReadingIdx !== -1) setCurrentIdx(firstReadingIdx);
    } else if (currentSection === 'reading') {
      setCurrentSection('listening');
      const firstListeningIdx = questions.findIndex(q => q.section_type === 'listening');
      if (firstListeningIdx !== -1) setCurrentIdx(firstListeningIdx);
    } else {
      handleFinish();
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const calculateScoresBySection = () => {
    const sectionResults: Record<string, { score: number; max: number; passed: boolean }> = {
      vocabulary_grammar: { score: 0, max: 60, passed: false },
      reading: { score: 0, max: 60, passed: false },
      listening: { score: 0, max: 60, passed: false }
    };

    questions.forEach((q, i) => {
      const isCorrect = answers[i] === q.correct;
      if (isCorrect) {
        sectionResults[q.section_type].score += q.point_weight || 2; // Default to 2 points if not set
      }
    });

    // Apply benchmarks
    if (meta) {
      Object.keys(sectionResults).forEach(section => {
        const minRequired = meta.section_benchmarks?.[section] || 19;
        sectionResults[section].passed = sectionResults[section].score >= minRequired;
      });
    }

    const total = Object.values(sectionResults).reduce((sum, s) => sum + s.score, 0);
    const overallPassed = total >= (meta?.passing_total || 90) && Object.values(sectionResults).every(s => s.passed);

    return { total, sectionResults, overallPassed };
  };

  const handleFinish = async () => {
    if (savedRef.current) return;
    savedRef.current = true;
    setIsFinished(true);
    setShowSubmitDialog(false);
    
    if (!user || !meta) return;
    const { total, sectionResults, overallPassed } = calculateScoresBySection();
    const timeTaken = (meta.duration * 60) - timeLeft;
    
    setSaving(true);
    await (supabase as any).from('mock_exam_results').insert({
      user_id: user.id,
      exam_id: meta.id,
      score: total,
      max_score: 180,
      time_taken: timeTaken,
      completed_at: new Date().toISOString(),
      level: meta.level,
      section_scores: sectionResults,
      passed: overallPassed
    });

    // --- Phase 8: Sync Vocabulary results with SRS ---
    // We only sync vocabulary questions (section_type: vocabulary_grammar)
    const vocabQuestions = questions.filter(q => q.section_type === 'vocabulary_grammar');
    for (const q of vocabQuestions) {
      const idx = questions.indexOf(q);
      const isCorrect = answers[idx] === q.correct;
      
      // Extract word from question (look for Japanese brackets 「」 or parentheses （）)
      const match = q.question.match(/[「（(]([^」）)]+)[」）)]/);
      const word = match ? match[1] : q.question.trim().split(' ').pop() || q.question;
      
      if (word) {
        // Asynchronously sync to avoid blocking UI (non-awaited)
        syncQuizResult(word, isCorrect).catch(console.error);
      }
    }

    setSaving(false);
  };

  // Anti-Cheat & Global Events
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isFinished) {
        sonnerToast.warning("CẢNH BÁO: Chuyển tab trong quá trình thi có thể bị đánh dấu gian lận!");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isFinished]);

  const handleSelectOption = (idx: number) => {
    setAnswers(prev => ({ ...prev, [currentIdx]: idx }));
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setShowSubmitDialog(true);
    }
  };

  const prevQuestion = () => {
    setCurrentIdx(prev => Math.max(0, prev - 1));
  };


  const toggleFlag = (idx: number) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ── Loading ──
  if (loadingExam) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  if (loadError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-sakura-light/30">
      <div className="p-8 bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-crimson/10 shadow-soft text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-crimson mx-auto" />
        <p className="text-crimson font-bold text-lg">{loadError}</p>
        <Button onClick={() => navigate('/mock-tests')} className="bg-crimson hover:bg-crimson/90 text-white rounded-2xl h-12 px-8">Quay lại</Button>
      </div>
    </div>
  );

  // ── Professional Results Screen ──
  if (isFinished && !isReviewMode) {
    const { total, sectionResults, overallPassed } = calculateScoresBySection();
    const timeTaken = meta ? (meta.duration * 60) - timeLeft : 0;

    return (
      <div className="min-h-screen bg-sakura-light/20 flex flex-col">
        {/* Navigation Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-sakura/10 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/mock-tests')} className="rounded-xl gap-2 text-sakura font-bold hover:bg-sakura/5">
              <ArrowLeft className="h-4 w-4" /> Danh sách
            </Button>
            <div className="h-8 w-px bg-sakura/10 hidden sm:block" />
            <div className="hidden sm:block text-left">
              <p className="text-[10px] font-black text-sakura uppercase tracking-widest">{meta?.level} Mock Results</p>
              <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{meta?.title}</h4>
            </div>
          </div>
          <Button onClick={() => navigate('/mock-tests')} variant="outline" className="rounded-xl border-sakura/20 text-sakura hover:bg-sakura/5 gap-2 px-6 font-bold h-11">
            <BookOpen className="h-4 w-4" /> Đề khác
          </Button>
        </header>

        {/* Results Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto custom-scrollbar bg-sakura-light/5">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full space-y-6 py-8">
            <div className="w-20 h-20 rounded-[2rem] bg-white border-[3px] border-sakura shadow-xl flex items-center justify-center mx-auto rotate-12">
              <Trophy className="h-10 w-10 text-sakura" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black font-display text-slate-800 tracking-tight">Kết quả bài thi</h1>
              <div className="flex items-center justify-center gap-2">
                <Badge className="bg-sakura text-white px-2.5 h-5 rounded-lg font-black text-[10px]">{meta?.level}</Badge>
                <div className="h-1 w-1 rounded-full bg-sakura/30" />
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px]">{meta?.title}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(sectionResults).map(([key, res]) => (
                <Card key={key} className={cn("p-4 rounded-[1.5rem] border shadow-sm", res.passed ? "border-emerald-100 bg-emerald-50/20" : "border-rose-100 bg-rose-50/20")}>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{key.replace('_', ' & ')}</p>
                  <div className="text-lg font-black text-slate-800">{res.score}<span className="text-[10px] text-slate-400">/{res.max}</span></div>
                  <Badge variant="outline" className={cn("mt-2 border-none font-bold text-[8px] px-2 h-4 uppercase", res.passed ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                    {res.passed ? 'ĐẠT' : 'LIỆT'}
                  </Badge>
                </Card>
              ))}
            </div>

            <Card className="border-[3px] border-sakura rounded-[2.5rem] shadow-lg overflow-hidden bg-white">
              <CardContent className="p-8 space-y-6">
                <div className="flex flex-col items-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">TỔNG ĐIỂM CHUẨN HÓA</p>
                  <h2 className="text-5xl font-black text-crimson leading-none">{total}<span className="text-sm text-slate-300 ml-1">/180</span></h2>
                </div>
                
                <div className="py-4 px-8 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-around">
                  <div className="text-center">
                    <p className="text-lg font-black text-slate-800">{Math.round((total / 180) * 100)}%</p>
                    <p className="text-[8px] text-slate-400 font-black uppercase">Tỉ lệ đúng</p>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="text-center">
                    <p className="text-lg font-black text-slate-800">{formatTime(timeTaken)}</p>
                    <p className="text-[8px] text-slate-400 font-black uppercase">Thời gian</p>
                  </div>
                </div>

                <div className={cn(
                  "py-4 rounded-xl font-black text-base tracking-widest shadow-lg",
                  overallPassed ? "bg-emerald-500 text-white shadow-emerald-100" : "bg-rose-500 text-white shadow-rose-100"
                )}>
                  {overallPassed ? 'PASS (ĐẠT)' : 'FAIL (CHƯA ĐẠT)'}
                </div>
                
                {!overallPassed && total >= (meta?.passing_total || 90) && (
                  <p className="text-[10px] text-rose-500 font-bold uppercase bg-rose-50 p-3 rounded-xl">
                    Lưu ý: Bạn trượt do bị điểm liệt (Sankuten) ở ít nhất một phần thi.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="flex-1 h-14 rounded-2xl bg-sakura text-white hover:bg-sakura/90 font-black uppercase tracking-widest gap-2" onClick={() => setIsReviewMode(true)}>
                <BookOpen className="h-5 w-5" /> Xem lại bài
              </Button>
              <Button variant="outline" className="flex-1 h-14 rounded-2xl border-2 border-sakura text-sakura font-black uppercase tracking-widest" onClick={() => navigate('/mock-tests')}>Về danh sách đề</Button>
              <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-slate-400" onClick={() => navigate('/learning-path')}>Trang chủ học tập</Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) return (
    <div className="min-h-screen bg-sakura-light/20 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-lg p-10 rounded-[3rem] border border-sakura shadow-soft text-center space-y-6">
        <div className="w-20 h-20 bg-sakura/10 rounded-3xl flex items-center justify-center mx-auto text-sakura">
          <BookOpen className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-display text-slate-800">Đề thi đang trống</h2>
          <p className="text-muted-foreground">Hiện chưa có câu hỏi nào trong đề thi này. Vui lòng quay lại sau.</p>
        </div>
        <Button onClick={() => navigate('/mock-tests')} variant="ghost" className="text-sakura hover:bg-sakura/5 rounded-2xl h-12 w-full font-bold">
          Quay lại danh sách
        </Button>
      </div>
    </div>
  );

  const currentQ = questions[currentIdx];
  const hasVisualContent = !!(currentQ.image_url || currentQ.passage);

  return (
    <QuickSelectionLookup enabled={isReviewMode}>
      <div className="min-h-screen bg-[#FDFCFB] flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-sakura/20 px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {isReviewMode ? (
              <Button variant="ghost" size="sm" onClick={() => setIsReviewMode(false)} className="rounded-xl gap-2 text-sakura font-bold hover:bg-sakura/5 shrink-0">
                <ChevronLeft className="h-4 w-4" /> Kết quả
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setShowExitConfirm(true)} className="rounded-2xl hover:bg-sakura/5 shrink-0 text-crimson">
                <X className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-800 tracking-tight truncate">{meta?.title || 'JLPT Mock Exam'}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={cn(
                  "border-none font-bold text-[10px] uppercase tracking-wider h-5 px-2",
                  currentSection === 'vocabulary_grammar' ? "bg-amber-100 text-amber-600" :
                  currentSection === 'reading' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                )}>
                  {currentSection === 'vocabulary_grammar' ? 'Từ vựng & Ngữ pháp' : currentSection === 'reading' ? 'Đọc hiểu' : 'Nghe hiểu'}
                </Badge>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Câu {currentIdx + 1} / {questions.length}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
             {!isReviewMode && (
               <>
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => toggleFlag(currentIdx)} 
                    className={cn("rounded-xl h-9 w-9 transition-all", flagged.has(currentIdx) ? "bg-amber-100 text-amber-600 shadow-inner" : "bg-slate-50 text-slate-400")}
                 >
                   <BookOpen className={cn("h-4 w-4", flagged.has(currentIdx) && "fill-amber-600")} />
                 </Button>
                 <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                   <Clock className="h-3 w-3" /> {formatTime(timeLeft)}
                 </div>
               </>
             )}
            {!isReviewMode && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500 font-mono font-black text-xs",
                (sectionTimeLeft[currentSection] || 0) < 300 
                  ? "bg-red-50 border-red-200 text-red-600 shadow-sm shadow-red-100 animate-pulse" 
                  : "bg-sakura/5 border-sakura/10 text-sakura"
              )}>
                <span className="text-[9px] opacity-50 uppercase mr-1">Sec:</span>
                <span>{formatTime(sectionTimeLeft[currentSection] || 0)}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="xl:hidden rounded-xl bg-sakura/5 text-sakura hover:bg-sakura/10 h-9 w-9">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-144px)] overflow-hidden relative">
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Pane (Visuals & Passage) */}
          {hasVisualContent && (
          <div className="lg:w-1/2 w-full h-[40vh] lg:h-full overflow-y-auto border-r border-sakura/10 bg-sakura-light/10 p-4 sm:p-8 custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-6">
              {currentQ.audio_url && (
                <div className="bg-white p-8 rounded-[2.5rem] border-4 border-purple-100 shadow-2xl space-y-6 text-center">
                  <div className="h-20 w-20 bg-purple-500 rounded-3xl flex items-center justify-center mx-auto text-white shadow-lg shadow-purple-200">
                    <Headphones className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-800 italic uppercase">Listening Track</h4>
                    <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Chỉ được nghe duy nhất 01 lần</p>
                  </div>
                  
                  {playedAudios.has(currentQ.id) ? (
                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-jp font-bold flex items-center justify-center gap-3">
                      <X className="h-5 w-5" /> Audio đã kết thúc
                    </div>
                  ) : (
                    <Button 
                      className="w-full h-16 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest gap-3 shadow-xl shadow-purple-200 transition-all"
                      onClick={(e) => {
                        const audio = e.currentTarget.parentElement?.querySelector('audio');
                        if (audio) {
                            audio.play();
                            setPlayedAudios(prev => new Set(prev).add(currentQ.id));
                        }
                      }}
                    >
                      <Play className="h-5 w-5 fill-current" /> BẮT ĐẦU NGHE
                    </Button>
                  )}
                  
                  <audio 
                    src={currentQ.audio_url} 
                    className="hidden"
                    onEnded={() => sonnerToast.success("Hoàn thành đoạn nghe!")}
                  />
                </div>
              )}

              {currentQ.image_url && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative group">
                  <div className="absolute inset-0 bg-sakura/10 blur-3xl rounded-full scale-75 group-hover:scale-100 transition-transform duration-700" />
                  <img 
                    src={currentQ.image_url} 
                    alt="Question context" 
                    className="relative w-full rounded-[2.5rem] shadow-2xl border-4 border-white object-contain bg-white"
                  />
                </motion.div>
              )}
              
              {currentQ.passage && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="bg-white p-8 sm:p-12 rounded-[3.5rem] shadow-xl border border-sakura/10 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5">
                    <BookOpen className="h-24 w-24 text-sakura" />
                  </div>
                  <div className="relative z-10 whitespace-pre-wrap font-jp text-[1.35rem] leading-[2.2] text-slate-700 font-medium">
                    {currentQ.passage}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Right Pane (Question & Options) */}
        <div className={cn(
          "flex-1 overflow-y-auto p-4 sm:p-8 bg-white flex flex-col items-center",
          !hasVisualContent && "max-w-4xl mx-auto w-full"
        )}>
          <div className="max-w-xl w-full space-y-6 py-2">
            {/* Question Card */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-sakura text-white flex items-center justify-center font-black italic shadow-lg shadow-sakura/20 text-xs">
                  #{currentIdx + 1}
                </span>
                <span className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em]">CÂU HỎI HIỆN TẠI</span>
              </div>
              <h2 className={cn(
                "font-jp font-black text-slate-800 leading-tight",
                hasVisualContent ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
              )}>
                {currentQ.question.replace(/\s*\(#[0-9]+\)\s*$/, '')}
              </h2>
            </div>

            {/* Options Grid */}
            <div className="grid gap-3 w-full">
              {currentQ.options.map((option, idx) => {
                const isSelected = answers[currentIdx] === idx;
                const isCorrect = currentQ.correct === idx;
                
                let variantClass = "bg-white border-slate-100 hover:border-sakura/20 text-slate-600 hover:bg-sakura/5";
                let iconClass = "bg-slate-50 border-transparent text-slate-400 group-hover:bg-sakura/10 group-hover:text-sakura";

                if (isReviewMode) {
                  if (isCorrect) {
                    variantClass = "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200/50";
                    iconClass = "bg-white/20 border-white/40 text-white rotate-12";
                  } else if (isSelected && !isCorrect) {
                    variantClass = "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200/50";
                    iconClass = "bg-white/20 border-white/40 text-white -rotate-12";
                  } else {
                    variantClass = "bg-white border-slate-100 text-slate-300 opacity-50";
                    iconClass = "bg-slate-50 border-transparent text-slate-200";
                  }
                } else if (isSelected) {
                  variantClass = "bg-sakura border-sakura text-white shadow-xl shadow-sakura/30";
                  iconClass = "bg-white/20 border-white/40 text-white rotate-12";
                }

                return (
                  <motion.button
                    key={idx}
                    whileHover={!isReviewMode ? { x: 5 } : {}}
                    whileTap={!isReviewMode ? { scale: 0.98 } : {}}
                    onClick={() => !isReviewMode && handleSelectOption(idx)}
                    disabled={isReviewMode}
                    className={cn(
                      "flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 text-left transition-all duration-300 group relative overflow-hidden",
                      variantClass,
                      isReviewMode && "cursor-default"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center font-jp font-black text-base transition-all shrink-0 border-2",
                      iconClass
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-jp font-bold text-base sm:text-lg flex-1">{option}</span>
                    {isSelected && !isReviewMode && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-5">
                        <CheckCircle2 className="h-5 w-5 text-white/90" />
                      </motion.div>
                    )}
                    {isReviewMode && isCorrect && (
                       <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-5">
                        <div className="h-7 w-7 bg-white/20 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      </motion.div>
                    )}
                     {isReviewMode && isSelected && !isCorrect && (
                       <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-5">
                        <div className="h-7 w-7 bg-white/20 rounded-full flex items-center justify-center">
                          <X className="h-4 w-4 text-white" />
                        </div>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation Section */}
            {isReviewMode && currentQ.explanation && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-slate-50 border-2 border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">Giải thích</h4>
                </div>
                <p className="text-slate-600 font-jp leading-relaxed whitespace-pre-wrap text-[13px]">{currentQ.explanation}</p>
              </motion.div>
            )}
          </div>
          </div>
        </div>

        {/* Deskop Sidebar (Persistent) */}
        <aside className="hidden xl:flex w-80 border-l border-sakura/10 bg-white flex-col overflow-hidden shrink-0">
          <div className="p-6 border-b bg-sakura/5 shrink-0">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-sakura" /> DANH SÁCH CÂU
            </h3>
            <p className="text-[10px] text-sakura font-bold uppercase tracking-widest mt-1">
              Đã làm: {Object.keys(answers).length}/{questions.length}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => (
                <button key={idx} onClick={() => setCurrentIdx(idx)}
                  className={cn(
                    "h-10 rounded-xl text-[10px] font-black flex items-center justify-center transition-all border-2 relative",
                    currentIdx === idx ? "scale-105 shadow-md border-crimson z-10 text-crimson bg-white" : "border-transparent",
                    isReviewMode 
                      ? (answers[idx] === q.correct ? "bg-emerald-500 text-white" : answers[idx] === undefined ? "bg-slate-100 text-slate-300" : "bg-rose-500 text-white")
                      : answers[idx] !== undefined ? "bg-sakura text-white" : "bg-sakura/5 text-sakura/40 hover:bg-sakura/10"
                  )}>
                  {idx + 1}
                  {flagged.has(idx) && <div className="absolute -top-1 -right-1 h-2 w-2 bg-amber-500 rounded-full border border-white" />}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Footer Navigation */}
      <footer className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-sakura/10 px-6 py-5 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <Button 
            variant="ghost" 
            onClick={prevQuestion}
            disabled={currentIdx === 0}
            className="rounded-2xl h-14 px-8 font-black uppercase tracking-[0.1em] text-[11px] hover:bg-sakura/5 text-sakura disabled:opacity-30 border-2 border-transparent transition-all"
          >
            <ChevronLeft className="mr-2 h-5 w-5" /> Quay lại
          </Button>
 
          {/* Persistent Mini-Map (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-sm flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Tiến độ hoàn thành</span>
              <span>{Math.round(((currentIdx + 1) / questions.length) * 100)}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                className="h-full bg-gradient-to-r from-sakura to-crimson rounded-full shadow-sm"
              />
            </div>
          </div>
 
          <Button 
            onClick={nextQuestion}
            className="rounded-3xl h-16 px-12 bg-crimson hover:bg-crimson/90 text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all group overflow-hidden relative"
          >
            <span className="relative z-10">
              {currentIdx === questions.length - 1 ? 'NỘP BÀI THI' : 'CÂU TIẾP THEO'}
            </span>
            {currentIdx !== questions.length - 1 && <ChevronRight className="ml-2 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />}
            <div className="absolute inset-0 bg-gradient-to-r from-sakura to-crimson opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Button>
        </div>
      </footer>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" 
            />
            <motion.aside 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="relative w-full max-w-sm bg-white shadow-2xl flex flex-col h-full overflow-hidden"
            >
              <div className="p-8 border-b flex items-center justify-between shrink-0 bg-sakura/5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-sakura rounded-xl flex items-center justify-center text-white shadow-lg shadow-sakura/30">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800">Danh sách câu</h3>
                    <p className="text-[10px] text-sakura font-bold uppercase tracking-widest">
                      Đã làm: {Object.keys(answers).length}/{questions.length}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full h-12 w-12 border border-sakura/10">
                  <X className="h-5 w-5 text-sakura" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-5 gap-3">
                  {questions.map((q, idx) => (
                    <button key={idx} onClick={() => { setCurrentIdx(idx); setIsSidebarOpen(false); }}
                      className={cn(
                        "h-12 rounded-2xl text-xs font-black flex items-center justify-center transition-all border-2 relative",
                        currentIdx === idx ? "scale-110 shadow-lg border-crimson z-10 text-crimson" : "border-transparent",
                        isReviewMode 
                          ? (answers[idx] === q.correct ? "bg-emerald-500 text-white" : answers[idx] === undefined ? "bg-slate-200 text-slate-400" : "bg-rose-500 text-white")
                          : answers[idx] !== undefined 
                            ? "bg-sakura text-white" 
                            : "bg-sakura/5 text-sakura/50 hover:bg-sakura/10"
                      )}>
                      {idx + 1}
                      {flagged.has(idx) && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full border-2 border-white shadow-sm" />
                       )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-8 border-t bg-sakura-light/30 shrink-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {isReviewMode ? (
                    <>
                      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-emerald-100">
                        <div className="w-4 h-4 rounded-[6px] bg-emerald-500 shadow-sm" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Đúng</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-rose-100">
                        <div className="w-4 h-4 rounded-[6px] bg-rose-500 shadow-sm" />
                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Sai/Bỏ qua</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-sakura/10">
                        <div className="w-4 h-4 rounded-[6px] bg-sakura shadow-sm" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Đã trả lời</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-sakura/10">
                        <div className="w-4 h-4 rounded-[6px] bg-sakura/20" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chưa làm</span>
                      </div>
                    </>
                  )}
                </div>
                {!isReviewMode && (
                  <Button onClick={() => setShowSubmitDialog(true)} className="w-full h-14 rounded-2xl bg-crimson text-white font-black uppercase tracking-[0.15em] text-[10px] shadow-xl hover:bg-crimson/90">
                    Nộp bài thi ngay
                  </Button>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Dialogs */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="rounded-[3rem] p-12 border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)]">
          <DialogHeader className="space-y-4 text-center">
            <div className="h-20 w-20 bg-sakura rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-sakura/30">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-800">Xác nhận nộp bài?</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              Bạn vẫn còn <strong className="text-crimson">{formatTime(timeLeft)}</strong> làm bài. 
              Bạn đã hoàn thành <strong>{Object.keys(answers).length}/{questions.length}</strong> câu hỏi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-4 pt-8">
            <Button variant="ghost" onClick={() => setShowSubmitDialog(false)} className="h-14 rounded-2xl font-black uppercase text-[10px] flex-1 text-sakura">Xem lại bài</Button>
            <Button onClick={handleFinish} className="h-14 rounded-2xl font-black uppercase text-[10px] bg-crimson text-white flex-1 shadow-xl hover:bg-crimson/90">Nộp bài ngay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="rounded-[3rem] p-12 border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)]">
          <DialogHeader className="space-y-4 text-center">
            <div className="h-20 w-20 bg-red-500 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-red-500/30">
              <X className="h-10 w-10" />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-800">Thoát bài thi?</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              Nếu bạn thoát bây giờ, bài thi sẽ được nộp và bạn sẽ không thể tiếp tục.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-4 pt-8">
            <Button variant="ghost" onClick={() => setShowExitConfirm(false)} className="h-14 rounded-2xl font-black uppercase text-[10px] flex-1">Ở lại</Button>
            <Button onClick={handleFinish} className="h-14 rounded-2xl font-black uppercase text-[10px] bg-red-600 text-white flex-1 shadow-xl">Thoát và nộp bài</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </QuickSelectionLookup>
  );
};
