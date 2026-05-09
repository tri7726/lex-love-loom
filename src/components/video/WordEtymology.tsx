import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, BookOpen, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Radical { radical: string; meaning: string }
interface KanjiBreakdown {
  kanji: string;
  onyomi?: string[];
  kunyomi?: string[];
  hanviet?: string;
  meaning?: string;
  radicals?: Radical[];
}
interface SynAnt { word: string; reading?: string; meaning?: string }
interface EtymologyResult {
  word: string;
  reading?: string;
  meaning?: string;
  kanji_breakdown?: KanjiBreakdown[];
  etymology?: string;
  synonyms?: SynAnt[];
  antonyms?: SynAnt[];
  collocations?: string[];
}

interface Props {
  word: string;
  contextSentence?: string;
}

const cache = new Map<string, EtymologyResult>();

const WordEtymology: React.FC<Props> = ({ word, contextSentence }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EtymologyResult | null>(cache.get(word) || null);
  const { toast } = useToast();

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !data && !loading) {
      setLoading(true);
      try {
        const { data: res, error } = await supabase.functions.invoke('japanese-analysis', {
          body: {
            task: 'etymology',
            target_word: word,
            content: contextSentence || word,
          },
        });
        if (error) throw error;
        const result: EtymologyResult | undefined = res?.result;
        if (result) {
          cache.set(word, result);
          setData(result);
        } else {
          throw new Error('Empty response');
        }
      } catch (e: any) {
        toast({
          title: 'Không tải được nguồn gốc',
          description: e?.message ?? 'Hãy thử lại',
          variant: 'destructive',
        });
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sakura hover:text-sakura-dark transition-colors"
      >
        <BookOpen className="h-3 w-3" />
        Nguồn gốc 漢字
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 rounded-xl bg-white/70 dark:bg-muted/40 border border-sakura-light/30 space-y-3">
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang phân tích…
                </div>
              )}

              {data?.kanji_breakdown?.length ? (
                <div className="space-y-2">
                  {data.kanji_breakdown.map((k, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="font-jp text-2xl font-bold text-sakura-dark leading-none">
                        {k.kanji}
                      </div>
                      <div className="flex-1 text-[11px] space-y-1">
                        {k.hanviet && (
                          <div className="font-bold text-sakura-dark/80 uppercase">
                            {k.hanviet}
                          </div>
                        )}
                        {k.meaning && <div className="text-foreground/80">{k.meaning}</div>}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {k.onyomi?.map((o, j) => (
                            <Badge key={`o${j}`} variant="outline" className="text-[9px] font-jp">
                              音 {o}
                            </Badge>
                          ))}
                          {k.kunyomi?.map((o, j) => (
                            <Badge key={`k${j}`} variant="outline" className="text-[9px] font-jp">
                              訓 {o}
                            </Badge>
                          ))}
                        </div>
                        {k.radicals?.length ? (
                          <div className="text-[10px] text-muted-foreground pt-1">
                            Bộ thủ:{' '}
                            {k.radicals.map((r, j) => (
                              <span key={j} className="mr-2">
                                <span className="font-jp">{r.radical}</span>
                                <span className="text-muted-foreground/70"> ({r.meaning})</span>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {data?.etymology && (
                <p className="text-[11px] text-foreground/70 leading-relaxed border-l-2 border-sakura-light pl-2">
                  {data.etymology}
                </p>
              )}

              {data?.synonyms?.length ? (
                <div className="text-[11px]">
                  <span className="font-bold text-muted-foreground">Đồng nghĩa: </span>
                  {data.synonyms.map((s, i) => (
                    <span key={i} className="font-jp mr-2">
                      {s.word}
                      {s.meaning && <span className="text-muted-foreground/70"> ({s.meaning})</span>}
                    </span>
                  ))}
                </div>
              ) : null}

              {data?.antonyms?.length ? (
                <div className="text-[11px]">
                  <span className="font-bold text-muted-foreground">Trái nghĩa: </span>
                  {data.antonyms.map((s, i) => (
                    <span key={i} className="font-jp mr-2">
                      {s.word}
                      {s.meaning && <span className="text-muted-foreground/70"> ({s.meaning})</span>}
                    </span>
                  ))}
                </div>
              ) : null}

              {data?.collocations?.length ? (
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-bold">Cụm thường gặp: </span>
                  <span className="font-jp">{data.collocations.join('、')}</span>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WordEtymology;
