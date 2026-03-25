
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Volume2, X, Loader2, ExternalLink, BookOpen, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Reuse Jisho fetch logic
const fetchJisho = async (keyword: string) => {
  if (!keyword.trim()) return [];
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://jisho.org/api/v1/search/words?keyword=${keyword}`)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error('Jisho search failed');
  const json = await res.json();
  const jishoRes = JSON.parse(json.contents);
  return jishoRes.data || [];
};

interface QuickSelectionLookupProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export const QuickSelectionLookup: React.FC<QuickSelectionLookupProps> = ({ children, enabled = true }) => {
  const [selection, setSelection] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = () => {
    if (!enabled) return;
    
    // Small delay to let selection settle
    setTimeout(() => {
      const selected = window.getSelection();
      const text = selected?.toString().trim();

      if (text && text.length > 0 && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text)) {
        const range = selected?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        
        if (rect) {
          setSelection(text);
          setPosition({
            x: rect.left + window.scrollX + rect.width / 2,
            y: rect.top + window.scrollY - 10
          });
          setIsOpen(true);
        }
      }
    }, 10);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['jisho-quick', selection],
    queryFn: () => fetchJisho(selection),
    enabled: isOpen && selection.length > 0,
  });

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div onMouseUp={handleMouseUp} className="relative">
      {children}

      <AnimatePresence>
        {isOpen && (
          <div className="absolute inset-0 pointer-events-none z-[9999]">
             <motion.div
                ref={containerRef}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                style={{ 
                  left: position.x, 
                  top: position.y,
                  transform: 'translate(-50%, -100%)'
                }}
                className="fixed pointer-events-auto w-[320px] bg-white dark:bg-slate-900 rounded-[2rem] border border-sakura/10 shadow-elevated p-6 space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-sakura/10 rounded-xl flex items-center justify-center text-sakura">
                      <Search className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tra từ nhanh</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-full text-slate-300 hover:text-slate-600 transition-colors">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 text-sakura">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Đang tìm kiếm...</p>
                  </div>
                ) : error || !data || data.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs font-bold">
                    Không tìm thấy kết quả cho "{selection}"
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {data.slice(0, 1).map((word: any, i: number) => {
                       const primary = word.japanese?.[0];
                       const w = primary?.word || primary?.reading || '';
                       const r = primary?.word ? primary?.reading : '';
                       return (
                         <div key={i} className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-3xl font-black text-slate-800 tracking-tight">{w}</h4>
                                <p className="text-sm font-jp text-sakura/60 font-bold">{r}</p>
                              </div>
                              <Button variant="outline" size="icon" onClick={() => speak(w)} className="rounded-xl border-sakura/10 text-sakura hover:bg-sakura/5 shadow-soft">
                                <Volume2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                               {word.senses.slice(0, 2).map((sense: any, sIdx: number) => (
                                 <div key={sIdx} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                   <p className="text-[9px] font-black text-sakura uppercase mb-1 opacity-70">
                                      {sense.parts_of_speech?.[0] || 'Từ loại'}
                                   </p>
                                   <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                      {sense.english_definitions.join(', ')}
                                   </p>
                                 </div>
                               ))}
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                               <a href={`https://jisho.org/search/${w}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                                  <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sakura hover:bg-sakura/5 gap-2">
                                    Chi tiết <ExternalLink className="h-3 w-3" />
                                  </Button>
                               </a>
                            </div>
                         </div>
                       );
                    })}
                  </div>
                )}
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
