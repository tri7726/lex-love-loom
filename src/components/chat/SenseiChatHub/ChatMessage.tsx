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

const VocabCard: React.FC<{ 
  kanji: string; 
  reading: string; 
  meaning: string; 
  jlpt?: string; 
  example?: string;
  onSave?: () => void; 
  onSpeak?: () => void 
}> = ({ kanji, reading, meaning, jlpt, example, onSave, onSpeak }) => (
  <div className="my-6 bg-white/60 backdrop-blur-xl border-2 border-sakura/10 rounded-[2.5rem] p-6 shadow-xl hover:shadow-2xl transition-all group/card overflow-hidden relative border-l-[6px] border-l-sakura">
    <div className="absolute top-0 right-0 p-4 flex gap-2">
      <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl bg-white/80 border-sakura/20 hover:bg-sakura/5" onClick={onSpeak}>
        <Volume2 className="h-5 w-5 text-sakura" />
      </Button>
      <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl bg-white/80 border-sakura/20 hover:bg-sakura/5" onClick={onSave}>
        <Save className="h-5 w-5 text-sakura" />
      </Button>
    </div>
    
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {jlpt && (
          <Badge className="bg-sakura/10 text-sakura border-0 text-[10px] font-black px-2.5 py-1 rounded-lg">
            {jlpt}
          </Badge>
        )}
        <span className="text-sm font-jp text-sakura/60 font-black tracking-widest uppercase">Teachable Moment</span>
      </div>

      <div className="flex flex-col">
        <h3 className="text-4xl font-jp font-black text-slate-800 tracking-tight">{kanji}</h3>
        <p className="text-base font-jp text-sakura font-bold mt-1 tracking-wide">{reading}</p>
      </div>

      <div className="h-1 w-12 bg-sakura/20 rounded-full my-1" />
      
      <p className="text-lg text-slate-700 font-bold leading-relaxed">{meaning}</p>
      
      {example && (
        <div className="mt-4 p-4 bg-sakura/5 rounded-2xl border border-sakura/10 relative group/ex">
           <div className="absolute -left-2 top-4 h-8 w-1 bg-sakura rounded-full" />
           <p className="text-sm font-jp font-medium text-slate-600 leading-relaxed italic">
             "{example}"
           </p>
        </div>
      )}
    </div>
  </div>
);

const QuizWidget: React.FC<{ data: WidgetData; onMistake?: (content: string) => void }> = ({ data, onMistake }) => {
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);
  const [showFeedback, setShowFeedback] = React.useState(false);

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    setShowFeedback(true);
    
    const option = data.options![idx];
    if (!option.isCorrect && onMistake) {
      onMistake(`Câu hỏi: ${data.question}. Chọn sai: ${option.text}. Phản hồi: ${option.feedback}`);
    }
  };

  return (
    <div className="my-6 p-6 bg-white/60 backdrop-blur-xl border-2 border-sakura/10 rounded-[2.5rem] shadow-xl space-y-4 overflow-hidden relative group/quiz">
      <div className="absolute top-0 right-0 p-4">
        <Sparkles className="h-5 w-5 text-sakura/20 group-hover/quiz:text-sakura group-hover/quiz:animate-pulse transition-all" />
      </div>
      <Badge className="bg-sakura/10 text-sakura border-0 text-[10px] font-black uppercase tracking-widest px-3">Thử thách Sensei</Badge>
      <h3 className="text-lg font-black text-slate-800 leading-snug">{data.question}</h3>
      
      <div className="grid grid-cols-1 gap-3">
        {data.options?.map((opt, i) => (
          <Button
            key={i}
            variant="outline"
            disabled={showFeedback}
            onClick={() => handleSelect(i)}
            className={cn(
              "h-auto py-4 px-6 justify-between text-left font-bold rounded-2xl transition-all border-sakura/10",
              selectedIdx === i && (opt.isCorrect ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-500 text-red-700"),
              showFeedback && !opt.isCorrect && selectedIdx !== i && "opacity-40"
            )}
          >
            <span>{opt.text}</span>
            {selectedIdx === i && (opt.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />)}
          </Button>
        ))}
      </div>

      <AnimatePresence>
        {showFeedback && selectedIdx !== null && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className={cn(
              "p-4 rounded-2xl text-xs font-medium leading-relaxed",
              data.options![selectedIdx].isCorrect ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"
            )}
          >
            <p className="font-black mb-1">{data.options![selectedIdx].isCorrect ? "Tuyệt vời!" : "Gần đúng rồi..."}</p>
            {data.options![selectedIdx].feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
      if (onMistake) {
        onMistake(`Điền vào chỗ trống: ${data.sentence}. Người dùng điền: ${value}. Đáp án đúng là: ${data.answer}`);
      }
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="my-6 p-6 bg-white/60 backdrop-blur-xl border-2 border-indigo-500/10 rounded-[2.5rem] shadow-xl space-y-4 overflow-hidden relative group/fill">
      <div className="absolute top-0 right-0 p-4">
        <Languages className="h-5 w-5 text-indigo-500/20 group-hover/fill:text-indigo-500 transition-all" />
      </div>
      <Badge className="bg-indigo-500/10 text-indigo-500 border-0 text-[10px] font-black uppercase tracking-widest px-3">Điền vào chỗ trống</Badge>
      <div className="text-xl font-jp font-black text-slate-800 leading-loose flex flex-wrap items-center gap-2">
        {data.sentence?.split('___').map((part, i, arr) => (
          <React.Fragment key={i}>
            {part}
            {i < arr.length - 1 && (
              <input
                disabled={status === 'correct'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className={cn(
                  "mx-1 w-24 h-10 bg-white/50 border-b-2 border-indigo-500/20 rounded-md px-2 text-center text-lg focus:outline-none focus:border-indigo-500 transition-all",
                  status === 'correct' && "border-green-500 text-green-600 font-bold",
                  status === 'wrong' && "border-red-500 text-red-600 animate-shake"
                )}
                placeholder="..."
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex gap-2">
        {status !== 'correct' && (
          <>
            <Button size="sm" onClick={handleSubmit} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest px-4">Kiểm tra</Button>
            {data.hint && !showHint && (
              <Button variant="ghost" size="sm" onClick={() => setShowHint(true)} className="text-indigo-500/60 hover:text-indigo-500 font-bold text-[10px] uppercase">Gợi ý</Button>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {(showHint || status === 'correct') && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100/50"
          >
            {status === 'correct' ? (
              <div className="space-y-1">
                <p className="text-green-700 font-black text-xs uppercase tracking-widest mb-1">Chính xác!</p>
                <p className="text-sm text-slate-700 font-medium">{data.explanation}</p>
              </div>
            ) : (
              <div className="flex gap-2 items-center text-indigo-600">
                <Info className="h-3.5 w-3.5" />
                <p className="text-xs font-bold italic tracking-wide">
                   Gợi ý của Sensei: <span className="text-indigo-500 font-black">{data.hint}</span>
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, onSaveWord, onMistake, onSpeak 
}) => {
  const isAssistant = message.role === 'assistant';

  const renderContent = () => {
    const rawContent = message.content;
    
    // Separate vocab cards from main text
    const vocabRegex = /:::vocab{(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)}:::/g;
    const widgetRegex = /:::widget{(.*?)}:::/g;
    
    const vocabCards: React.ReactNode[] = [];
    const widgets: React.ReactNode[] = [];
    
    let processedText = rawContent
      .replace(vocabRegex, (match, kanji, reading, meaning, jlpt, example) => {
        vocabCards.push(
          <VocabCard 
            key={match}
            kanji={kanji}
            reading={reading}
            meaning={meaning}
            jlpt={jlpt}
            example={example}
            onSave={() => onSaveWord?.(kanji)}
            onSpeak={() => onSpeak?.(kanji)}
          />
        );
        return '';
      })
      .replace(widgetRegex, (match, dataStr) => {
        try {
          const data = JSON.parse(dataStr);
          if (data.type === 'quiz') {
            widgets.push(<QuizWidget key={match} data={data} onMistake={onMistake} />);
          } else if (data.type === 'fill_blank') {
            widgets.push(<FillBlankWidget key={match} data={data} onMistake={onMistake} />);
          } else if (data.type === 'cultural_fact') {
            widgets.push(
              <div key={match} className="my-6 p-6 bg-sakura/5 border border-sakura/10 rounded-[2.5rem] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-all">
                    <Sparkles className="h-12 w-12 text-sakura" />
                 </div>
                 <Badge className="bg-sakura/10 text-sakura border-0 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Góc tri thức</Badge>
                 <p className="text-slate-700 italic font-medium leading-relaxed">"{data.fact}"</p>
              </div>
            );
          }
          return '';
        } catch (e) {
          return match;
        }
      });

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
          <div className="self-start w-full max-w-[85%] mt-4">
             {vocabCards}
          </div>
        )}
        
        {widgets.length > 0 && (
          <div className="self-start w-full max-w-[85%] mt-4">
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
