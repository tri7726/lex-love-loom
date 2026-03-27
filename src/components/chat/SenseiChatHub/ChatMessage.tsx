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
  onSpeak?: (text: string) => void;
}

const VocabCard: React.FC<{ kanji: string; reading: string; meaning: string; onSave?: () => void; onSpeak?: () => void }> = ({ kanji, reading, meaning, onSave, onSpeak }) => (
  <div className="my-4 bg-white/40 backdrop-blur-sm border border-sakura/20 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group/card overflow-hidden relative">
    <div className="absolute top-0 right-0 p-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-sakura/10" onClick={onSpeak}>
        <Volume2 className="h-4 w-4 text-sakura" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-sakura/10" onClick={onSave}>
        <Save className="h-4 w-4 text-sakura" />
      </Button>
    </div>
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-jp font-black text-slate-800">{kanji}</span>
        <span className="text-sm font-jp text-sakura/60 font-medium">{reading}</span>
      </div>
      <div className="h-px w-full bg-gradient-to-r from-sakura/20 to-transparent my-1" />
      <p className="text-sm text-slate-600 font-medium">{meaning}</p>
    </div>
  </div>
);

interface StructuredResultProps {
  data: any;
  onSaveWord?: (word: string) => void;
  onSpeak?: (text: string) => void;
}

const StructuredResult = ({ data, onSaveWord, onSpeak }: StructuredResultProps) => {
  if (!data || typeof data !== 'object') return null;
  const analysis = data.analysis || data;
  const overall = analysis.overall_analysis || analysis;
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Overall Summary Card */}
      <div className="relative group/overall">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-sakura/20 to-indigo-500/20 rounded-2xl blur opacity-20 group-hover/overall:opacity-40 transition-opacity" />
        <div className="relative p-5 bg-white/60 backdrop-blur-sm rounded-2xl border border-sakura/10 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
             <div className="h-6 w-6 rounded-lg bg-sakura/10 flex items-center justify-center">
                <Info className="h-3 w-3 text-sakura" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tóm lược từ Sensei</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 font-medium italic">
            {overall.summary || overall.text_type_explanation || "Phân tích chuyên sâu từ Sensei..."}
          </p>
        </div>
      </div>

      {/* Sentences Section */}
      <div className="space-y-6">
        {analysis.sentences?.map((s: any, idx: number) => (
          <div key={idx} className="relative group/sentence pl-4 border-l-2 border-sakura/10 hover:border-sakura transition-all">
            <div className="mb-4">
              <h3 className="text-2xl font-jp font-black text-slate-800 leading-tight mb-1 group-hover/sentence:text-sakura transition-colors cursor-pointer"
                  onClick={() => onSpeak?.(s.japanese)}>
                {s.japanese}
              </h3>
              <p className="text-xs text-sakura font-bold tracking-wide">{s.vietnamese}</p>
            </div>
            
            {s.breakdown?.words?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {s.breakdown.words.map((w: any, wIdx: number) => (
                  <div key={wIdx} className="flex flex-col p-3 bg-white/40 hover:bg-white/60 backdrop-blur-sm rounded-xl border border-sakura/5 hover:border-sakura/10 transition-all shadow-sm relative group/word">
                    <div className="flex justify-between items-baseline mb-0.5" onClick={() => onSpeak?.(w.word)}>
                      <span className="text-sm font-jp font-black text-slate-800 cursor-pointer">{w.word}</span>
                      <span className="text-[10px] text-sakura font-medium cursor-pointer">{w.reading}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium line-clamp-1">{w.meaning}</span>
                    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover/word:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full hover:bg-sakura/5"
                        onClick={() => onSpeak?.(w.word)}
                      >
                        <Volume2 className="h-3 w-3 text-sakura" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full hover:bg-sakura/5"
                        onClick={() => onSaveWord?.(w.word)}
                      >
                        <Save className="h-3.5 w-3.5 text-sakura" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {s.grammar_patterns?.length > 0 && (
              <div className="space-y-3 bg-sakura/[0.02] p-3 rounded-xl border border-sakura/[0.05]">
                {s.grammar_patterns.map((p: any, pIdx: number) => (
                  <div key={pIdx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-sakura text-white border-0 text-[9px] h-4 font-black">
                        {p.pattern}
                      </Badge>
                      <span className="text-xs font-black text-slate-700">{p.meaning}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed pl-1">{p.usage}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggested Flashcards Section */}
      {analysis.suggested_flashcards?.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
             <div className="h-6 w-6 rounded-lg bg-sakura/10 flex items-center justify-center">
                <BookOpen className="h-3 w-3 text-sakura" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thẻ học gợi ý</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
            {analysis.suggested_flashcards.map((f: any, i: number) => (
              <div key={i} className="min-w-[200px] bg-gradient-to-br from-white to-sakura/5 backdrop-blur-sm border border-sakura/20 rounded-[1.25rem] p-4 shadow-sm hover:shadow-md transition-all relative group/flashcard shrink-0">
                <div className="flex flex-col gap-1">
                  <span className="text-xl font-jp font-black text-slate-800">{f.word || f.kanji}</span>
                  <span className="text-[10px] text-sakura font-bold tracking-tight">{f.reading}</span>
                  <div className="h-px w-full bg-sakura/10 my-1" />
                  <span className="text-xs text-slate-600 font-medium leading-tight">{f.meaning}</span>
                  <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-1">"{f.example_sentence}"</p>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/flashcard:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full bg-white/80"
                    onClick={() => onSpeak?.(f.word || f.kanji)}
                  >
                    <Volume2 className="h-3.5 w-3.5 text-sakura" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full bg-white/80"
                    onClick={() => onSaveWord?.(f.word || f.kanji)}
                  >
                    <Save className="h-3.5 w-3.5 text-sakura" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cultural Notes */}
      {(analysis.cultural_notes?.length > 0 || analysis.grammar_summary?.cultural_notes?.length > 0) && (
        <div className="pt-6 border-t border-sakura/10">
          <div className="flex items-center gap-2 mb-4">
             <div className="h-7 w-7 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-indigo-500" />
             </div>
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/60">Ghi chú tinh hoa văn hóa</h4>
          </div>
          <div className="space-y-3 bg-gradient-to-br from-indigo-500/[0.02] to-sakura/[0.02] p-4 rounded-2xl border border-indigo-500/5">
            {[...(analysis.cultural_notes || []), ...(analysis.grammar_summary?.cultural_notes || [])].map((note: string, i: number) => (
              <div key={i} className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                <span className="text-sakura shrink-0 mt-0.5">🌸</span>
                <span className="font-medium">{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSaveWord, onSpeak }) => {
  const isAssistant = message.role === 'assistant';
  
  const components = {
    a: ({ href, children, ...props }: any) => {
      const isInternal = href?.startsWith('/');
      if (isInternal) {
        return (
          <Link to={href} className="text-sakura hover:underline font-bold transition-all">
            {children}
          </Link>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sakura hover:underline decoration-sakura/30" {...props}>
          {children}
        </a>
      );
    },
    p: ({ children }: any) => <p className="mb-4 last:mb-0 leading-relaxed text-slate-700 dark:text-slate-300">{children}</p>,
    strong: ({ children }: any) => <strong className="font-bold text-slate-800 dark:text-white mx-0.5 bg-sakura/5 px-1 rounded-sm border-b border-sakura/20">{children}</strong>,
    ul: ({ children }: any) => <ul className="list-disc pl-5 mb-4 space-y-2 border-l-2 border-sakura/10 ml-1 py-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 border-l-2 border-indigo-500/10 ml-1 py-1">{children}</ol>,
    li: ({ children }: any) => <li className="text-slate-700 dark:text-slate-300 leading-normal pl-1">{children}</li>,
    h1: ({ children }: any) => <h1 className="text-xl font-serif font-black text-slate-800 mb-4 mt-2">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-lg font-serif font-bold text-slate-700 mb-3 mt-4 flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-sakura animate-pulse" />
      {children}
    </h2>,
  };

  const renderContent = () => {
    switch (message.type) {
      case 'analysis':
      case 'correction':
        let structuredData = null;
        try {
          const jsonMatch = message.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            structuredData = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {}

        return (
          <div className="space-y-4">
             <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                  style={{ color: message.type === 'analysis' ? '#f43f5e' : '#3b82f6' }}>
                {message.type === 'analysis' ? <Sparkles className="h-3 w-3" /> : <Languages className="h-3 w-3" />}
                {message.type === 'analysis' ? 'Phân tích chuyên sâu' : 'Sửa lỗi ngữ pháp'}
             </div>
             {structuredData ? (
               <StructuredResult 
                 data={structuredData} 
                 onSaveWord={onSaveWord}
                 onSpeak={onSpeak}
               />
             ) : (
               <div className={cn(
                 "prose prose-sm max-w-none dark:prose-invert leading-normal font-sans",
                 isAssistant ? "prose-sakura" : ""
               )}>
                 <ReactMarkdown components={components}>{message.content}</ReactMarkdown>
               </div>
             )}
          </div>
        );
      case 'image':
        const vision = (message.metadata as any)?.visionResult;
        const imageUrl = (message.metadata as any)?.imageUrl;
        if (!vision) return <div className="text-sm">{message.content}</div>;
        
        return (
          <div className="space-y-4">
             {imageUrl && (
               <div className="relative rounded-xl overflow-hidden border border-sakura/20 shadow-sm max-w-xs">
                 <img src={imageUrl} alt="Analysis" className="w-full h-full object-cover" />
               </div>
             )}
             <div className="space-y-1">
                <Badge className="bg-sakura/10 text-sakura border-0 text-[11px] uppercase font-black px-2 py-0.5 rounded-md">Nhận diện vật thể</Badge>
                <h3 className="text-xl font-jp font-black text-sakura">{vision.object_name}</h3>
                <p className="text-sm font-bold text-muted-foreground italic">"{vision.vietnamese_meaning}"</p>
             </div>
             
             <div className="p-3 bg-sakura/5 rounded-xl border border-sakura/10 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tóm tắt của Sensei</p>
                <p className="text-xs leading-relaxed italic">{vision.description}</p>
             </div>

             <div className="grid grid-cols-1 gap-2">
                {vision.vocabulary?.slice(0, 3).map((v: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-sakura/5">
                    <div className="flex flex-col">
                      <span className="text-xs font-jp font-bold">{v.word}</span>
                      <span className="text-[9px] text-muted-foreground">{v.reading} - {v.meaning}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onSaveWord?.(v.word)}>
                      <Save className="h-3 w-3 text-sakura" />
                    </Button>
                  </div>
                ))}
             </div>
          </div>
        );
      default:
        try {
          const content = message.content || '';
          if (content.includes(':::vocab{')) {
            const parts = content.split(/(:::vocab\{[^}]+\}:::)/g);
            return (
              <div className={cn(
                "prose prose-sm max-w-none dark:prose-invert leading-normal font-sans",
                isAssistant ? "prose-sakura" : ""
              )}>
                {parts.map((part, index) => {
                  if (part.startsWith(':::vocab{')) {
                    const match = part.match(/:::vocab\{([^|]+)\|([^|]+)\|([^}]+)\}:::/);
                    if (match) {
                      const [, kanji, reading, meaning] = match;
                      return (
                        <VocabCard 
                          key={index}
                          kanji={kanji.trim()} 
                          reading={reading.trim()} 
                          meaning={meaning.trim()} 
                          onSave={() => onSaveWord?.(kanji.trim())}
                          onSpeak={() => onSpeak?.(kanji.trim())}
                        />
                      );
                    }
                  }
                  return <ReactMarkdown key={index} components={components}>{part}</ReactMarkdown>;
                })}
              </div>
            );
          }
          return (
            <div className={cn(
              "prose prose-sm max-w-none dark:prose-invert leading-normal font-sans",
              isAssistant ? "prose-sakura" : ""
            )}>
              <ReactMarkdown components={components}>{content}</ReactMarkdown>
            </div>
          );
        } catch (e) {
          return <div className="text-sm font-sans">{message.content}</div>;
        }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 400 }}
      className={cn(
        "flex w-full gap-4 mb-8",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
        <div className="h-12 w-12 rounded-[1.2rem] bg-white flex items-center justify-center text-sakura shrink-0 shadow-[0_8px_24px_-4px_rgba(255,183,197,0.3)] border border-sakura/10 translate-y-1">
          <Sparkles className="h-6 w-6" />
        </div>
      )}
      
      <div className="flex-1 relative space-y-2">
        <div 
          className={cn(
            "max-w-[85%] md:max-w-[75%] rounded-[1.75rem] px-5 py-4 transition-all duration-500 group relative",
            isAssistant 
              ? "bg-white/80 backdrop-blur-md border border-sakura/10 shadow-[0_10px_30px_-10px_rgba(255,183,197,0.15)] rounded-tl-none" 
              : "bg-sakura text-white shadow-soft rounded-tr-none ml-auto"
          )}
        >
          {isAssistant && (
            <div className="absolute -left-12 top-0">
                <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-sakura/5 animate-float-slow">
                  <span className="text-lg">🌸</span>
                </div>
            </div>
          )}
          {renderContent()}
        </div>
          
        {isAssistant && (message.metadata as any)?.source && (
          <div className="absolute -top-3.5 right-8">
            <Badge variant="secondary" className="bg-white text-sakura border-sakura/10 text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] shadow-md ring-1 ring-sakura/5">
              {(message.metadata as any).source}
            </Badge>
          </div>
        )}
        
        {isAssistant && (
          <div className="absolute -bottom-12 left-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-3 group-hover:translate-y-0">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-white shadow-lg border border-sakura/10 hover:bg-sakura/5 hover:scale-110 active:scale-90 transition-all" onClick={() => onSpeak?.(message.content)}>
              <Volume2 className="h-4 w-4 text-sakura" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-white shadow-lg border border-sakura/10 hover:bg-sakura/5 hover:scale-110 active:scale-90 transition-all">
              <Save className="h-4 w-4 text-sakura" />
            </Button>
          </div>
        )}
      </div>

      {!isAssistant && (
        <div className="h-12 w-12 rounded-[1.2rem] bg-white flex items-center justify-center text-sakura/30 font-serif font-black text-xl shrink-0 border border-slate-50 shadow-sm translate-y-1">
           {message.role === 'user' ? 'U' : 'S'}
        </div>
      )}
    </motion.div>
  );
};
