import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Languages, CheckCircle2, Info, Volume2, Save } from 'lucide-react';
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
        return (
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest">
                <Sparkles className="h-3 w-3" />
                Phân tích chuyên sâu
             </div>
             <div className="prose prose-sm prose-sakura max-w-none dark:prose-invert leading-normal font-sans">
               <ReactMarkdown components={components}>{message.content}</ReactMarkdown>
             </div>
             {/* We can add buttons here for specific words detected in the analysis */}
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
      case 'correction':
        return (
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest">
                <Languages className="h-3 w-3" />
                Sửa lỗi ngữ pháp
             </div>
             <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 text-sm">
                {message.content}
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
