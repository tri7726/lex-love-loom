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
    p: ({ children }: any) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
    strong: ({ children }: any) => <strong className="font-black text-slate-900 dark:text-white mx-0.5">{children}</strong>,
    ul: ({ children }: any) => <ul className="list-disc pl-4 mb-4 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-4 space-y-1">{children}</ol>,
    li: ({ children }: any) => <li className="text-slate-700 dark:text-slate-300">{children}</li>,
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
             <div className="prose prose-sm prose-sakura max-w-none dark:prose-invert leading-relaxed">
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
        return (
          <div className={cn(
            "prose prose-sm max-w-none dark:prose-invert leading-relaxed",
            isAssistant ? "prose-sakura" : ""
          )}>
            <ReactMarkdown components={components}>{message.content}</ReactMarkdown>
          </div>
        );
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
      
      <div className={cn(
        "max-w-[85%] md:max-w-[75%] rounded-[2.5rem] px-8 py-5 relative group transition-all duration-500",
        isAssistant 
          ? "bg-white border border-slate-50 text-slate-800 shadow-sm rounded-tl-none" 
          : "bg-sakura/5 text-slate-700 border border-sakura/10 shadow-sm rounded-tr-none"
      )}>
        <div className={cn(
          "leading-relaxed",
          isAssistant ? "font-serif text-lg" : "font-sans font-medium text-sm"
        )}>
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
          <div className="absolute -bottom-14 left-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-3 group-hover:translate-y-0">
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
