import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, SkipForward, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Slide {
  id: string;
  slide_type: 'content' | 'question';
  order_index: number;
  title?: string | null;
  body?: string | null;
  image_url?: string | null;
  image_caption?: string | null;
  question_text?: string | null;
  options?: string[] | null;
  correct_index?: number | null;
  explanation?: string | null;
}

type AnswerState = 'idle' | 'correct' | 'wrong' | 'skipped';

export const PresentationViewer = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [slides, setSlides] = useState<Slide[]>([]);
  const [lessonTitle, setLessonTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);

  // Per-slide answer tracking
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch lesson ──────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      if (!lessonId) return;
      const { data: lesson } = await (supabase as any)
        .from('lessons').select('title').eq('id', lessonId).single();
      setLessonTitle(lesson?.title || 'Bài giảng');

      const { data: slideData } = await (supabase as any)
        .from('lesson_slides').select('*').eq('lesson_id', lessonId).order('order_index');
      setSlides(slideData || []);

      // Load progress
      if (user) {
        const { data: prog } = await (supabase as any)
          .from('lesson_progress')
          .select('last_slide_index, answers')
          .eq('lesson_id', lessonId).eq('user_id', user.id).maybeSingle();
        if (prog) {
          setCurrent(prog.last_slide_index || 0);
          setAnswers(prog.answers || {});
        }
      }
      setLoading(false);
    };
    fetch();
  }, [lessonId, user]);

  // Reset answer UI khi đổi slide
  useEffect(() => {
    const s = slides[current];
    if (!s || s.slide_type !== 'question') { setAnswerState('idle'); setSelectedOption(null); return; }
    const prev = answers[s.id];
    if (prev === null) { setAnswerState('skipped'); setSelectedOption(null); }
    else if (prev !== undefined) {
      setSelectedOption(prev);
      setAnswerState(prev === s.correct_index ? 'correct' : 'wrong');
    } else {
      setAnswerState('idle'); setSelectedOption(null);
    }
  }, [current, slides]);

  // ── Save progress (debounced) ─────────────────────────────────
  const saveProgress = useCallback((slideIdx: number, newAnswers: Record<string, number | null>) => {
    if (!user || !lessonId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const isLast = slideIdx >= slides.length - 1;
      await (supabase as any).from('lesson_progress').upsert({
        lesson_id: lessonId, user_id: user.id,
        last_slide_index: slideIdx,
        answers: newAnswers,
        ...(isLast ? { completed_at: new Date().toISOString() } : {}),
      }, { onConflict: 'lesson_id,user_id' });
    }, 1000);
  }, [user, lessonId, slides.length]);

  // ── Navigation ────────────────────────────────────────────────
  const goNext = useCallback(() => {
    const next = Math.min(current + 1, slides.length);
    setCurrent(next);
    saveProgress(next, answers);
  }, [current, slides.length, answers, saveProgress]);

  const goPrev = () => setCurrent(c => Math.max(0, c - 1));

  // ── Answer a question ─────────────────────────────────────────
  const handleAnswer = (optIdx: number) => {
    if (answerState !== 'idle') return;
    const slide = slides[current];
    setSelectedOption(optIdx);
    const isCorrect = optIdx === slide.correct_index;
    setAnswerState(isCorrect ? 'correct' : 'wrong');
    const newAnswers = { ...answers, [slide.id]: optIdx };
    setAnswers(newAnswers);
    saveProgress(current, newAnswers);
  };

  const handleSkip = () => {
    const slide = slides[current];
    setAnswerState('skipped');
    const newAnswers = { ...answers, [slide.id]: null };
    setAnswers(newAnswers);
    saveProgress(current, newAnswers);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        const slide = slides[current];
        if (!slide) return;
        if (slide.slide_type === 'question' && answerState === 'idle') return;
        goNext();
      }
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') navigate(-1);
      // 1-4 for answers
      if (['1','2','3','4'].includes(e.key)) {
        const slide = slides[current];
        if (slide?.slide_type === 'question' && answerState === 'idle') {
          handleAnswer(parseInt(e.key) - 1);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, slides, answerState, goNext]);

  if (loading) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  );

  // ── End screen ────────────────────────────────────────────────
  const isEnd = current >= slides.length;
  if (isEnd) {
    const questionSlides = slides.filter(s => s.slide_type === 'question');
    const answered = questionSlides.filter(s => answers[s.id] !== undefined && answers[s.id] !== null).length;
    const correct = questionSlides.filter(s => answers[s.id] === s.correct_index).length;

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center text-white p-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 max-w-md">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-display font-bold">Hoàn thành!</h1>
          <p className="text-white/70">{lessonTitle}</p>
          {questionSlides.length > 0 && (
            <div className="bg-white/10 rounded-2xl p-6 space-y-3">
              <p className="text-4xl font-black text-emerald-400">{correct}/{questionSlides.length}</p>
              <p className="text-sm text-white/70">câu trả lời đúng</p>
              <p className="text-xs text-white/50">
                {questionSlides.length - answered} câu đã bỏ qua
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => { setCurrent(0); }}>
              Xem lại từ đầu
            </Button>
            <Button className="bg-white text-slate-900 hover:bg-white/90" onClick={() => navigate(-1)}>
              Quay lại lớp học
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const slide = slides[current];
  if (!slide) return null;

  const progress = ((current) / slides.length) * 100;
  const canProceed = slide.slide_type === 'content' || answerState !== 'idle';

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col text-white">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 shrink-0">
        <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-white/40 text-sm font-mono shrink-0">{current + 1} / {slides.length}</span>
      </div>

      {/* Slide area */}
      <div className="flex-1 flex items-center justify-center px-6 py-4 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-3xl"
          >
            {slide.slide_type === 'content' ? (
              <ContentSlide slide={slide} />
            ) : (
              <QuestionSlide
                slide={slide}
                answerState={answerState}
                selectedOption={selectedOption}
                onAnswer={handleAnswer}
                onSkip={handleSkip}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-8 py-4 shrink-0">
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="flex items-center gap-2 text-white/40 hover:text-white disabled:opacity-20 transition-colors text-sm"
        >
          <ChevronLeft className="h-5 w-5" /> Trước
        </button>

        {slide.slide_type === 'content' ? (
          <Button
            onClick={goNext}
            className="gap-2 px-8 py-6 rounded-2xl bg-primary text-white shadow-lg hover:bg-primary/90 text-base"
          >
            {current === slides.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
            <ChevronRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={!canProceed}
            className="gap-2 px-8 py-6 rounded-2xl bg-primary disabled:opacity-30 text-base"
          >
            Tiếp theo <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        <div className="w-20 text-right">
          <span className="text-xs text-white/30">← → Space</span>
        </div>
      </div>
    </div>
  );
};

// ── Content Slide ─────────────────────────────────────────────
function ContentSlide({ slide }: { slide: Slide }) {
  return (
    <div className="space-y-6">
      {slide.image_url && (
        <div className="rounded-2xl overflow-hidden max-h-[50vh]">
          <img src={slide.image_url} alt={slide.image_caption || ''} className="w-full h-full object-contain" />
          {slide.image_caption && (
            <p className="text-center text-xs text-white/50 mt-2">{slide.image_caption}</p>
          )}
        </div>
      )}
      {slide.title && (
        <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight text-center">{slide.title}</h1>
      )}
      {slide.body && (
        <p className="text-lg text-white/80 leading-relaxed text-center whitespace-pre-wrap">{slide.body}</p>
      )}
    </div>
  );
}

// ── Question Slide ────────────────────────────────────────────
function QuestionSlide({ slide, answerState, selectedOption, onAnswer, onSkip }: {
  slide: Slide;
  answerState: AnswerState;
  selectedOption: number | null;
  onAnswer: (i: number) => void;
  onSkip: () => void;
}) {
  const options = slide.options || [];

  return (
    <div className="space-y-8">
      {/* Question */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 border border-amber-400/20 rounded-full px-4 py-1 text-sm font-bold">
          💬 Câu hỏi kiểm tra
        </div>
        <h2 className="text-2xl md:text-3xl font-bold leading-tight">{slide.question_text}</h2>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto w-full">
        {options.map((opt, i) => {
          const isSelected = selectedOption === i;
          const isCorrect = slide.correct_index === i;
          const revealed = answerState !== 'idle';

          let cls = 'border-white/20 hover:border-white/50 hover:bg-white/10 cursor-pointer';
          if (revealed) {
            if (isCorrect) cls = 'border-emerald-400 bg-emerald-400/20 text-emerald-200 cursor-default';
            else if (isSelected) cls = 'border-rose-400 bg-rose-400/20 text-rose-200 cursor-default';
            else cls = 'border-white/10 opacity-40 cursor-default';
          }

          return (
            <motion.button
              key={i}
              whileHover={!revealed ? { scale: 1.01 } : {}}
              whileTap={!revealed ? { scale: 0.99 } : {}}
              onClick={() => !revealed && onAnswer(i)}
              className={cn(
                'flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all w-full',
                cls
              )}
            >
              <span className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center text-sm font-black shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-base font-medium flex-1">{opt}</span>
              {revealed && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
              {revealed && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-rose-400 shrink-0" />}
            </motion.button>
          );
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {answerState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto w-full"
          >
            {answerState === 'correct' && (
              <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-xl p-4 text-emerald-300 text-sm text-center">
                ✅ Chính xác!
                {slide.explanation && <p className="mt-1 text-emerald-300/80">{slide.explanation}</p>}
              </div>
            )}
            {answerState === 'wrong' && (
              <div className="bg-rose-400/10 border border-rose-400/30 rounded-xl p-4 text-rose-300 text-sm text-center">
                ❌ Chưa đúng. Đáp án đúng là <strong>{String.fromCharCode(65 + (slide.correct_index ?? 0))}</strong>.
                {slide.explanation && <p className="mt-1 text-rose-300/80">{slide.explanation}</p>}
              </div>
            )}
            {answerState === 'skipped' && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-white/50 text-sm text-center">
                Đã bỏ qua câu hỏi này.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button — chỉ hiện khi chưa trả lời */}
      {answerState === 'idle' && (
        <div className="text-center">
          <button onClick={onSkip} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm mx-auto">
            <SkipForward className="h-4 w-4" /> Bỏ qua câu hỏi
          </button>
        </div>
      )}
    </div>
  );
}

export default PresentationViewer;
