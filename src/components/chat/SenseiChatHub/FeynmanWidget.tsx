import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, CheckCircle2, AlertCircle, Sparkles, ChevronDown, ChevronUp, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface FeynmanWidgetProps {
  topic: string;         // e.g. "て-form" or "旨味"
  context?: string;      // Optional context for AI grading
  onComplete?: (score: number) => void;
}

type GradeLevel = 'excellent' | 'good' | 'partial' | 'wrong' | null;

interface GradeResult {
  level: GradeLevel;
  score: number;         // 0-100
  feedback: string;
  missingConcepts: string[];
  correctConcepts: string[];
}

const GRADE_CONFIG: Record<Exclude<GradeLevel, null>, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  excellent: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle2 className="h-4 w-4" />, label: 'Xuất sắc!' },
  good:      { color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    icon: <CheckCircle2 className="h-4 w-4" />, label: 'Khá tốt!' },
  partial:   { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: <AlertCircle  className="h-4 w-4" />, label: 'Gần đúng' },
  wrong:     { color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     icon: <AlertCircle  className="h-4 w-4" />, label: 'Cần xem lại' },
};

export const FeynmanWidget: React.FC<FeynmanWidgetProps> = ({ topic, context, onComplete }) => {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const gradeExplanation = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);

    try {
      const systemPrompt = `Bạn là Sensei AI, chuyên gia chấm bài theo phương pháp Feynman.
Người học vừa giải thích về chủ đề: "${topic}".
${context ? `Ngữ cảnh bổ sung: ${context}` : ''}

Hãy đánh giá giải thích của họ và trả về JSON với cấu trúc:
{
  "level": "excellent" | "good" | "partial" | "wrong",
  "score": 0-100,
  "feedback": "Nhận xét ngắn gọn bằng tiếng Việt (1-2 câu)",
  "correctConcepts": ["Khái niệm đúng 1", ...],
  "missingConcepts": ["Điều còn thiếu 1", ...]
}

Tiêu chí:
- excellent (90-100): Giải thích rõ ràng, đúng bản chất, có ví dụ hoặc so sánh
- good (70-89): Đúng nội dung chính, thiếu vài chi tiết
- partial (40-69): Đúng một phần, hiểu nhầm hoặc còn mờ
- wrong (0-39): Sai bản chất hoặc quá mơ hồ`;

      const { data, error } = await supabase.functions.invoke('japanese-chat', {
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Giải thích của tôi: "${text}"` }
          ],
          mode: 'feynman_grade',
        }
      });

      if (error) throw error;

      // Parse JSON from response
      const rawText = data?.content || data?.message || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed: GradeResult = JSON.parse(jsonMatch[0]);
        setResult(parsed);
        onComplete?.(parsed.score);
      }
    } catch (e) {
      console.error('Feynman grading error:', e);
      // Fallback result
      setResult({
        level: 'partial',
        score: 50,
        feedback: 'Không thể kết nối Sensei. Hãy thử lại sau!',
        correctConcepts: [],
        missingConcepts: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const cfg = result?.level ? GRADE_CONFIG[result.level] : null;

  return (
    <motion.div
      layout
      className="my-3 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(79,70,229,0.04), white)',
        border: '1.5px solid rgba(79,70,229,0.18)',
        boxShadow: '0 2px 12px rgba(79,70,229,0.08)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 pt-3 pb-3"
        style={{ borderBottom: expanded ? '1px solid rgba(79,70,229,0.12)' : 'none' }}
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <PenLine className="h-3.5 w-3.5 text-indigo-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">Feynman Challenge</p>
          <p className="text-[10px] text-slate-500 leading-tight">Giải thích <strong>{topic}</strong> bằng lời của bạn</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-3">
              {/* Prompt */}
              <p className="text-xs text-slate-500 leading-relaxed">
                💡 Hãy giải thích <strong className="text-slate-700">{topic}</strong> như thể bạn đang dạy cho một người bạn chưa biết gì về tiếng Nhật.
              </p>

              {/* Textarea */}
              {!result && (
                <>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={`Ví dụ: "${topic}" có nghĩa là... Nó được dùng khi...`}
                    rows={4}
                    className="w-full text-sm text-slate-700 bg-white/80 border border-indigo-200/60 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400 resize-none leading-relaxed placeholder:text-slate-300"
                  />
                  <button
                    onClick={gradeExplanation}
                    disabled={!text.trim() || loading}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-white transition-all',
                      text.trim() && !loading
                        ? 'bg-indigo-500 hover:bg-indigo-600 active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    {loading ? 'Sensei đang chấm...' : 'Gửi cho Sensei'}
                  </button>
                </>
              )}

              {/* Result */}
              {result && cfg && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  {/* Score header */}
                  <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border', cfg.bg, cfg.border, cfg.color)}>
                    {cfg.icon}
                    <span className="font-black text-xs">{cfg.label}</span>
                    <span className="ml-auto text-xs font-bold">{result.score}/100</span>
                  </div>

                  {/* Feedback */}
                  <p className="text-xs text-slate-600 leading-relaxed">{result.feedback}</p>

                  {/* Correct concepts */}
                  {result.correctConcepts.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">✓ Bạn đã hiểu đúng:</p>
                      {result.correctConcepts.map((c, i) => (
                        <p key={i} className="text-[10px] text-emerald-700 flex items-start gap-1">
                          <span className="mt-0.5">•</span> {c}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Missing concepts */}
                  {result.missingConcepts.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">⚠ Cần bổ sung:</p>
                      {result.missingConcepts.map((c, i) => (
                        <p key={i} className="text-[10px] text-amber-700 flex items-start gap-1">
                          <span className="mt-0.5">•</span> {c}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Try again */}
                  <button
                    onClick={() => { setResult(null); setText(''); setTimeout(() => textareaRef.current?.focus(), 100); }}
                    className="text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Sparkles className="h-2.5 w-2.5" /> Thử lại
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
