import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Languages, CheckCircle2, Info, Volume2, Save, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SenseiMessage } from './types';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';

interface ChatMessageProps {
  message: SenseiMessage;
  onSaveWord?: (word: string) => void;
  onMistake?: (content: string, metadata?: any) => void;
  onSpeak?: (text: string) => void;
}

interface WordBreakdown {
  word: string;
  reading: string;
  meaning: string;
}

interface GrammarPattern {
  pattern: string;
  meaning: string;
  usage: string;
}

interface SentenceAnalysis {
  japanese: string;
  vietnamese: string;
  breakdown?: {
    words: WordBreakdown[];
  };
  grammar_patterns?: GrammarPattern[];
}

interface FlashcardSuggestion {
  word?: string;
  kanji?: string;
  reading: string;
  meaning: string;
  example_sentence: string;
}

interface StructuredAnalysisData {
  overall_analysis?: {
    summary?: string;
    text_type_explanation?: string;
  };
  sentences?: SentenceAnalysis[];
  suggested_flashcards?: FlashcardSuggestion[];
  cultural_notes?: string[];
  grammar_summary?: {
    cultural_notes?: string[];
  };
}

interface VisionResult {
  object_name: string;
  vietnamese_meaning: string;
  description: string;
  vocabulary?: WordBreakdown[];
}

interface WidgetData {
  type: 'quiz' | 'fill_blank' | 'cultural_fact';
  question?: string;
  options?: { text: string; isCorrect: boolean; feedback: string }[];
  sentence?: string;
  answer?: string;
  hint?: string;
  explanation?: string;
  fact?: string;
  related_vocab?: string;
}

/* ─── JLPT color palette ─── */
const JLPT_THEME: Record<string, { accent: string; bg: string; border: string; badge: string; text: string }> = {
  N1: { accent: '#be123c', bg: 'rgba(190,18,60,0.04)', border: 'rgba(190,18,60,0.25)', badge: 'bg-rose-100 text-rose-700', text: 'text-rose-600' },
  N2: { accent: '#e87c9a', bg: 'rgba(232,124,154,0.05)', border: 'rgba(232,124,154,0.25)', badge: 'bg-pink-100 text-pink-700', text: 'text-pink-500' },
  N3: { accent: '#4f46e5', bg: 'rgba(79,70,229,0.04)', border: 'rgba(79,70,229,0.20)', badge: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-500' },
  N4: { accent: '#059669', bg: 'rgba(5,150,105,0.04)', border: 'rgba(5,150,105,0.20)', badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600' },
  N5: { accent: '#6b7a3e', bg: 'rgba(107,122,62,0.04)', border: 'rgba(107,122,62,0.20)', badge: 'bg-lime-100 text-lime-700', text: 'text-lime-700' },
};
const DEFAULT_THEME = { accent: '#e87c9a', bg: 'rgba(232,124,154,0.05)', border: 'rgba(232,124,154,0.15)', badge: 'bg-pink-100 text-pink-700', text: 'text-pink-500' };

const VocabCard: React.FC<{
  kanji: string;
  reading: string;
  meaning: string;
  jlpt?: string;
  example?: string;
  onSave?: () => void;
  onSpeak?: () => void;
}> = ({ kanji, reading, meaning, jlpt, example, onSave, onSpeak }) => {
  const [revealed, setRevealed] = React.useState(false);
  const theme = (jlpt && JLPT_THEME[jlpt.toUpperCase()]) || DEFAULT_THEME;

  return (
    <motion.div
      layout
      className="my-2 overflow-hidden rounded-2xl cursor-pointer group/vocab"
      style={{
        background: `linear-gradient(135deg, ${theme.bg}, white)`,
        border: `1.5px solid ${theme.border}`,
        boxShadow: `0 2px 12px ${theme.accent}18`,
      }}
      onClick={() => setRevealed(v => !v)}
      whileHover={{ y: -2, boxShadow: `0 6px 20px ${theme.accent}28` }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3.5 pt-2 pb-1.5"
           style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-2">
          {jlpt && (
            <span className={cn('text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest', theme.badge)}>
              {jlpt.toUpperCase()}
            </span>
          )}
          <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${theme.accent}70` }}>✦ Teachable Moment</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md opacity-0 group-hover/vocab:opacity-100 transition-opacity"
            onClick={e => { e.stopPropagation(); onSpeak?.(); }}>
            <Volume2 className="h-3 w-3" style={{ color: theme.accent }} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md opacity-0 group-hover/vocab:opacity-100 transition-opacity"
            onClick={e => { e.stopPropagation(); onSave?.(); }}>
            <Save className="h-3 w-3" style={{ color: theme.accent }} />
          </Button>
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="flex items-stretch gap-0 px-3.5 py-3">
        {/* Left: Gradient Kanji box - Changed to w-fit with min-width to prevent overflow */}
        <div className="flex-shrink-0 flex items-center justify-center min-w-[70px] w-fit h-[70px] rounded-2xl mr-4 px-3"
             style={{
               background: `linear-gradient(135deg, ${theme.accent}25, ${theme.accent}08)`,
               border: `1.5px solid ${theme.accent}30)`,
               boxShadow: `inset 0 1px 3px ${theme.accent}20`,
             }}>
          <span className="font-jp font-black leading-none select-none text-center"
                style={{ 
                  color: theme.accent, 
                  fontSize: kanji.length > 5 ? '1rem' : kanji.length > 2 ? '1.35rem' : '1.85rem',
                  letterSpacing: '-0.02em'
                }}>
            {kanji}
          </span>
        </div>

        {/* Right: Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[10px] font-jp font-bold tracking-widest opacity-80 mb-0.5" style={{ color: theme.accent }}>
            {reading}
          </p>

          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.p
                key="revealed"
                initial={{ opacity: 0, y: 3, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-bold text-foreground leading-snug"
              >
                {meaning}
              </motion.p>
            ) : (
              <motion.div key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                {/* Blur placeholder bars */}
                <div className="flex flex-col gap-1.5">
                  <div className="h-2 w-24 rounded-full" style={{ background: `${theme.accent}20` }} />
                  <div className="h-2 w-16 rounded-full" style={{ background: `${theme.accent}12` }} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] animate-pulse" style={{ color: `${theme.accent}60` }}>
                  TAP
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reveal indicator dot */}
        <div className="flex-shrink-0 flex items-center ml-2">
          <motion.div
            animate={{ scale: revealed ? 1 : [1, 1.2, 1], opacity: revealed ? 0.4 : 1 }}
            transition={{ repeat: revealed ? 0 : Infinity, duration: 2, ease: 'easeInOut' }}
            className="w-2 h-2 rounded-full"
            style={{ background: theme.accent }}
          />
        </div>
      </div>

      {/* ── Example (revealed only) ── */}
      <AnimatePresence>
        {revealed && example && (
          <motion.div
            key="example"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mx-3.5 mb-2.5 px-3 py-2 rounded-xl flex items-start gap-2"
                 style={{ background: `${theme.accent}07`, border: `1px dashed ${theme.border}` }}>
              <div className="w-0.5 self-stretch rounded-full mt-0.5 flex-shrink-0" style={{ background: theme.accent }} />
              <p className="text-xs font-jp text-slate-600 leading-relaxed italic flex-1">"{example}"</p>
              <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0 rounded"
                      onClick={e => { e.stopPropagation(); onSpeak?.(); }}>
                <Volume2 className="h-2.5 w-2.5" style={{ color: theme.accent }} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

const QuizWidget: React.FC<{ data: WidgetData; onMistake?: (content: string) => void }> = ({ data, onMistake }) => {
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);
  const [showFeedback, setShowFeedback] = React.useState(false);

  const handleSelect = (idx: number) => {
    if (showFeedback) return;
    setSelectedIdx(idx);
    setShowFeedback(true);
    const option = data.options![idx];
    if (!option.isCorrect && onMistake) {
      onMistake(`Câu hỏi: ${data.question}. Chọn sai: ${option.text}. Phản hồi: ${option.feedback}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2 overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(232,124,154,0.04), white)',
        border: '1.5px solid rgba(232,124,154,0.2)',
        boxShadow: '0 2px 12px rgba(232,124,154,0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2"
           style={{ borderBottom: '1px solid rgba(232,124,154,0.15)' }}>
        <Sparkles className="h-3 w-3" style={{ color: '#e87c9a' }} />
        <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#e87c9a' }}>Thử thách Sensei</span>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {/* Question */}
        <p className="text-sm font-bold text-slate-800 leading-snug">{data.question}</p>

        {/* Options */}
        <div className="space-y-1.5">
          {data.options?.map((opt, i) => {
            const isSelected = selectedIdx === i;
            const isCorrect = opt.isCorrect;
            let bg = 'transparent';
            let border = 'rgba(232,124,154,0.15)';
            let textColor = '#374151';
            let labelBg = 'rgba(232,124,154,0.1)';
            let labelColor = '#e87c9a';

            if (showFeedback) {
              if (isSelected && isCorrect)  { bg='rgba(16,185,129,0.06)'; border='rgba(16,185,129,0.4)'; textColor='#065f46'; labelBg='rgba(16,185,129,0.15)'; labelColor='#059669'; }
              if (isSelected && !isCorrect) { bg='rgba(239,68,68,0.06)';  border='rgba(239,68,68,0.4)'; textColor='#7f1d1d'; labelBg='rgba(239,68,68,0.15)'; labelColor='#dc2626'; }
              if (!isSelected && isCorrect) { bg='rgba(16,185,129,0.04)'; border='rgba(16,185,129,0.25)'; }
              if (!isSelected && !isCorrect) { textColor='#9ca3af'; }
            }

            return (
              <motion.button
                key={i}
                disabled={showFeedback}
                onClick={() => handleSelect(i)}
                whileHover={!showFeedback ? { x: 2 } : {}}
                whileTap={!showFeedback ? { scale: 0.98 } : {}}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all"
                style={{ background: bg, border: `1.5px solid ${border}`, color: textColor }}
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-md text-[9px] font-black flex items-center justify-center"
                      style={{ background: labelBg, color: labelColor }}>
                  {OPTION_LABELS[i]}
                </span>
                <span className="text-xs font-semibold flex-1 leading-snug">{opt.text}</span>
                {isSelected && (
                  isCorrect
                    ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                    : <Info className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                )}
                {!isSelected && showFeedback && isCorrect && (
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {showFeedback && selectedIdx !== null && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(
                'px-3 py-2 rounded-xl text-xs leading-relaxed',
                data.options![selectedIdx].isCorrect
                  ? 'bg-emerald-50 border border-emerald-200/60 text-emerald-800'
                  : 'bg-red-50 border border-red-200/60 text-red-800'
              )}>
                <span className="font-black">
                  {data.options![selectedIdx].isCorrect ? '✓ Chính xác! ' : '✗ Chưa đúng. '}
                </span>
                {data.options![selectedIdx].feedback}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const FillBlankWidget: React.FC<{ data: WidgetData; onMistake?: (content: string) => void }> = ({ data, onMistake }) => {
  const [value, setValue] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showHint, setShowHint] = React.useState(false);

  const handleSubmit = () => {
    if (value.trim().toLowerCase() === data.answer?.trim().toLowerCase()) {
      setStatus('correct');
    } else {
      setStatus('wrong');
      if (onMistake) onMistake(`Điền vào chỗ trống: ${data.sentence}. Người dùng điền: ${value}. Đáp án đúng là: ${data.answer}`);
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2 overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(79,70,229,0.04), white)',
        border: '1.5px solid rgba(79,70,229,0.18)',
        boxShadow: '0 2px 12px rgba(79,70,229,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2"
           style={{ borderBottom: '1px solid rgba(79,70,229,0.12)' }}>
        <Languages className="h-3 w-3 text-indigo-500" />
        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500">Điền vào chỗ trống</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Sentence */}
        <div className="text-base font-jp font-bold text-slate-800 leading-loose flex flex-wrap items-center gap-1">
          {data.sentence?.split('___').map((part, i, arr) => (
            <React.Fragment key={i}>
              {part}
              {i < arr.length - 1 && (
                <input
                  disabled={status === 'correct'}
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className={cn(
                    'mx-1 w-20 h-8 border-b-2 border-indigo-300/60 bg-transparent px-1 text-center text-base font-jp focus:outline-none focus:border-indigo-500 transition-colors',
                    status === 'correct' && 'border-emerald-500 text-emerald-700',
                    status === 'wrong' && 'border-red-400 text-red-600'
                  )}
                  placeholder="＿＿"
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Actions */}
        {status !== 'correct' && (
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-white transition-colors"
              style={{ background: '#4f46e5' }}
            >
              Kiểm tra
            </button>
            {data.hint && !showHint && (
              <button onClick={() => setShowHint(true)}
                className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:bg-indigo-50 transition-colors">
                Gợi ý
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {(showHint || status === 'correct') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(
                'px-3 py-2 rounded-xl text-xs leading-relaxed',
                status === 'correct'
                  ? 'bg-emerald-50 border border-emerald-200/60 text-emerald-800'
                  : 'bg-indigo-50 border border-indigo-200/40 text-indigo-700'
              )}>
                {status === 'correct' ? (
                  <><span className="font-black">✓ Chính xác! </span>{data.explanation}</>
                ) : (
                  <><span className="font-black">Gợi ý: </span>{data.hint}</>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message, onSaveWord, onMistake, onSpeak
}) => {
  const isAssistant = message.role === 'assistant';

  const renderContent = () => {
    const rawContent = message.content;

    const vocabCards: React.ReactNode[] = [];
    const widgets: React.ReactNode[] = [];

    // ── Robust brace-counting extractor ──────────────────────────────────────
    // Finds all :::tag{...}::: blocks even when the JSON body contains nested {}
    function extractBlocks(text: string, tag: string): { match: string; body: string; index: number }[] {
      const results: { match: string; body: string; index: number }[] = [];
      const prefix = `:::${tag}{`;
      let i = 0;
      while (i < text.length) {
        const start = text.indexOf(prefix, i);
        if (start === -1) break;
        // Walk forward counting brace depth to find the matching closing }
        let depth = 0;
        let j = start + prefix.length - 1; // points at the opening '{'
        while (j < text.length) {
          if (text[j] === '{') depth++;
          else if (text[j] === '}') {
            depth--;
            if (depth === 0) break;
          }
          j++;
        }
        // j now points at the closing '}', check for ':::'
        if (text.slice(j + 1, j + 4) === ':::') {
          const fullMatch = text.slice(start, j + 4);
          const body = text.slice(start + prefix.length, j);
          results.push({ match: fullMatch, body, index: start });
        }
        i = j + 4;
      }
      return results;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Process vocab cards  :::vocab{漢字|よみ|意味|N3|例文}:::
    const vocabBlocks = extractBlocks(rawContent, 'vocab');
    let processedText = rawContent;

    for (const block of vocabBlocks) {
      const parts = block.body.split('|');
      if (parts.length >= 5) {
        const [kanji, reading, meaning, jlpt, ...exParts] = parts;
        const example = exParts.join('|');
        vocabCards.push(
          <VocabCard
            key={block.match}
            kanji={kanji}
            reading={reading}
            meaning={meaning}
            jlpt={jlpt}
            example={example}
            onSave={() => onSaveWord?.(kanji)}
            onSpeak={() => onSpeak?.(kanji)}
          />
        );
      }
      processedText = processedText.replace(block.match, '');
    }

    // Process widgets  :::widget{...json...}:::
    const widgetBlocks = extractBlocks(processedText, 'widget');
    for (const block of widgetBlocks) {
      try {
        const data: WidgetData = JSON.parse(`{${block.body}}`);
        if (data.type === 'quiz') {
          widgets.push(<QuizWidget key={block.match} data={data} onMistake={onMistake} />);
        } else if (data.type === 'fill_blank') {
          widgets.push(<FillBlankWidget key={block.match} data={data} onMistake={onMistake} />);
        } else if (data.type === 'cultural_fact') {
          widgets.push(
            <motion.div
              key={block.match}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-4 p-5 rounded-2xl relative overflow-hidden border"
              style={{ background: 'rgba(232,124,154,0.04)', borderColor: 'rgba(232,124,154,0.2)' }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Sparkles className="h-16 w-16 text-sakura" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest bg-pink-100 text-pink-700">
                  Góc Tri Thức
                </span>
                <BookOpen className="h-3 w-3 text-sakura/40" />
              </div>
              <p className="text-sm text-slate-700 italic font-medium leading-relaxed">"{data.fact}"</p>
              {data.related_vocab && (
                <p className="mt-2 text-[10px] font-bold text-sakura/60 uppercase tracking-widest">
                  Từ liên quan: {data.related_vocab}
                </p>
              )}
            </motion.div>
          );
        }
      } catch (e) {
        console.warn('[ChatMessage] Failed to parse widget block:', block.body, e);
      }
      processedText = processedText.replace(block.match, '');
    }

    // Clean up any leftover raw :::...::: patterns
    processedText = processedText.replace(/:::\w+\{[\s\S]*?\}:::/g, '');

    return (
      <div className="flex flex-col w-full">
        <div className={cn(
          "relative p-5 md:p-8 rounded-[2.5rem] shadow-sm max-w-[90%] md:max-w-[85%]",
          isAssistant
            ? "bg-white/80 backdrop-blur-xl border border-sakura/10 text-slate-800 rounded-tl-none self-start"
            : "bg-slate-900 text-white rounded-tr-none self-end ml-auto"
        )}>
          {isAssistant && (
            <div className="absolute -left-6 top-0 h-10 w-10 rounded-full bg-white border border-sakura/20 flex items-center justify-center shadow-lg transform -translate-x-1/2">
              <Sparkles className="h-5 w-5 text-sakura animate-pulse" />
            </div>
          )}

          <div className={cn(
            "prose prose-slate max-w-none leading-relaxed",
            isAssistant ? "prose-p:font-serif prose-p:text-lg" : "text-white prose-invert"
          )}>
            <ReactMarkdown>{processedText}</ReactMarkdown>
          </div>

          <div className="mt-4 flex items-center gap-3 opacity-30 text-[10px] font-black uppercase tracking-widest">
            <span>{new Date(message.created_at).toLocaleTimeString()}</span>
            <span>•</span>
            <span>{isAssistant ? 'Sensei Hub' : 'You'}</span>
          </div>
        </div>

        {vocabCards.length > 0 && (
          <div className="self-start w-full max-w-[85%] mt-3 space-y-1">
            {vocabCards}
          </div>
        )}

        {widgets.length > 0 && (
          <div className="self-start w-full max-w-[85%] mt-3 space-y-3">
            {widgets}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex w-full mb-8 px-4", isAssistant ? "justify-start" : "justify-end")}
    >
      {renderContent()}
    </motion.div>
  );
};

