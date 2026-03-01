import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ExternalLink, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface JishoWord {
  slug: string;
  is_common: boolean;
  tags: string[];
  jlpt: string[];
  japanese: Array<{
    word?: string;
    reading?: string;
  }>;
  senses: Array<{
    english_definitions: string[];
    parts_of_speech: string[];
    tags: string[];
  }>;
}

interface JishoResponse {
  data: JishoWord[];
}

// Function to fetch from Jisho using a reliable CORS proxy mechanism
// We use allorigins.win as a reliable fallback for public APIs without CORS
const fetchJisho = async (keyword: string): Promise<JishoWord[]> => {
  if (!keyword.trim()) return [];
  
  // Directly fetching Jisho blocked by CORS in browsers. Using allorigins.
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://jisho.org/api/v1/search/words?keyword=${keyword}`)}`;
  
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error('Jisho search failed');
  
  const json = await res.json();
  const jishoRes: JishoResponse = JSON.parse(json.contents);
  
  return jishoRes.data || [];
};

export const JishoSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 500);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['jisho', debouncedQuery],
    queryFn: () => fetchJisho(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-[300px] z-[100]" ref={containerRef}>
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border-2",
        isOpen ? "bg-white border-sakura shadow-md" : "bg-muted/50 border-transparent hover:bg-muted"
      )}>
        <Search className={cn("h-4 w-4", isOpen ? "text-sakura" : "text-muted-foreground")} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Tra từ điển Jisho..."
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground w-full py-0.5"
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="p-0.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && query.trim() !== '' && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 w-[400px] md:w-[480px] -translate-x-[50px] md:-translate-x-[200px] lg:translate-x-0 lg:w-[450px] max-h-[70vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-elevated animate-in fade-in slide-in-from-top-2 p-2 hidden-scrollbar">
          
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-sakura">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-xs font-medium">Đang tra từ điển Jisho...</p>
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Lỗi khi tải từ điển. Vui lòng thử lại.
            </div>
          )}

          {!isLoading && !error && data?.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Không tìm thấy kết quả nào cho "{debouncedQuery}"
            </div>
          )}

          {!isLoading && !error && data && data.length > 0 && (
            <div className="flex flex-col gap-1">
              {data.slice(0, 8).map((word, idx) => {
                const primaryStr = word.japanese?.[0];
                const w = primaryStr?.word || primaryStr?.reading || '';
                const r = primaryStr?.word ? primaryStr.reading : '';
                
                return (
                  <div key={`${word.slug}-${idx}`} className="p-3 hover:bg-sakura-light/10 rounded-xl transition-colors group relative border border-transparent hover:border-sakura-light/30">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-500 mb-0.5">{r}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-slate-800 leading-none">{w}</span>
                          {word.is_common && <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 text-[9px] px-1.5 py-0 h-4">Common</Badge>}
                          {word.jlpt && word.jlpt[0] && <Badge variant="outline" className="text-slate-500 border-slate-200 text-[9px] px-1.5 py-0 h-4">{word.jlpt[0].toUpperCase()}</Badge>}
                        </div>
                      </div>
                      <a href={`https://jisho.org/search/${encodeURIComponent(w)}`} target="_blank" rel="noopener noreferrer" 
                         className="p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors absolute top-3 right-3 opacity-0 group-hover:opacity-100">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    
                    <div className="mt-2 space-y-1.5">
                      {word.senses.slice(0, 3).map((sense, sIdx) => (
                        <div key={sIdx} className="text-sm">
                          <span className="text-[10px] font-bold text-sakura uppercase mr-2.5 opacity-80">
                            {sense.parts_of_speech.map(p => {
                              if (p.includes('Noun')) return 'N';
                              if (p.includes('Verb')) return 'V';
                              if (p.includes('Adjective')) return 'Adj';
                              if (p.includes('Adverb')) return 'Adv';
                              return p.substring(0, 3);
                            }).join(',')}
                          </span>
                          <span className="text-slate-700 font-medium">
                            {sense.english_definitions.join('; ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              <a href={`https://jisho.org/search/${debouncedQuery}`} target="_blank" rel="noopener noreferrer"
                 className="mt-2 text-center text-xs font-bold text-sakura hover:text-sakura-dark hover:underline p-2 bg-sakura/5 rounded-lg transition-colors">
                Xem trên Jisho.org ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
