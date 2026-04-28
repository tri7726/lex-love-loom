import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface WritingRec {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  ease_factor?: number;
}

interface WritingRecsProps {
  writingRecs: WritingRec[];
  loadingRecs?: boolean;
  onStartWriting: (word: string) => void;
}

export const WritingRecs: React.FC<WritingRecsProps> = ({ writingRecs, loadingRecs, onStartWriting }) => {
  if (writingRecs.length === 0) return null;

  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      className="p-8 rounded-[3rem] bg-gradient-to-br from-indigo-jp/5 to-sakura-light/10 border-2 border-indigo-jp/20 shadow-soft"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h2 className="text-xl font-black flex items-center gap-2 text-indigo-jp">
            <Sparkles className="h-5 w-5" />
            Gợi ý Luyện viết AI
          </h2>
          <p className="text-xs text-muted-foreground font-medium">Bạn đang gặp khó khăn với các chữ này. Luyện viết ngay để nhớ lâu hơn!</p>
        </div>
        <Badge className="bg-indigo-jp text-white uppercase tracking-widest text-[9px] px-3">Priority</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {writingRecs.map((rec) => (
          <div
            key={rec.id}
            className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-indigo-jp/10 flex items-center justify-between group hover:border-indigo-jp/30 transition-all cursor-pointer"
            onClick={() => onStartWriting(rec.word)}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-jp/5 flex items-center justify-center font-jp text-3xl font-black text-indigo-jp">
                {rec.word[0]}
              </div>
              <div>
                <p className="font-bold text-slate-800">{rec.word}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{rec.reading}</p>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="rounded-full group-hover:bg-indigo-jp group-hover:text-white transition-all">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </motion.section>
  );
};
