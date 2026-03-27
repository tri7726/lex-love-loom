import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Info, BookOpen, Layers, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWritingLab } from '@/contexts/WritingLabContext';

interface KanjiDetailCardProps {
  kanji: {
    character: string;
    hanviet: string;
    meaning_vi: string;
    on_reading?: string;
    kun_reading?: string;
    lesson?: number;
    level?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onStartStudy: () => void;
}

export const KanjiDetailCard: React.FC<KanjiDetailCardProps> = ({
  kanji,
  isOpen,
  onClose,
  onStartStudy,
}) => {
  const { openWritingLab } = useWritingLab();
  if (!kanji) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-cream border-2 border-sakura/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative p-8 text-center bg-gradient-to-b from-sakura/10 to-transparent">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-sakura/20"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </Button>

                <div className="flex flex-col items-center">
                  <motion.div 
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center border-2 border-sakura/30 shadow-xl mb-4"
                  >
                    <span className="text-6xl font-jp text-sumi">{kanji.character}</span>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-sumi uppercase tracking-widest">{kanji.hanviet}</h2>
                  <p className="text-lg text-sakura font-medium mt-1">{kanji.meaning_vi}</p>
                </div>
              </div>

              {/* Body */}
              <CardContent className="p-6 space-y-6 bg-white/50 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-3 rounded-2xl bg-sakura/5 border border-sakura/10">
                    <span className="text-[10px] font-bold text-sakura/70 uppercase">On-yomi</span>
                    <p className="text-sm font-jp font-semibold text-sumi">{kanji.on_reading || '---'}</p>
                  </div>
                  <div className="space-y-1.5 p-3 rounded-2xl bg-matcha/5 border border-matcha/10">
                    <span className="text-[10px] font-bold text-matcha uppercase">Kun-yomi</span>
                    <p className="text-sm font-jp font-semibold text-sumi">{kanji.kun_reading || '---'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase">Thông tin bài học</span>
                      <p className="text-sm font-medium">JLPT {kanji.level || '?' } — Bài {kanji.lesson || '?'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <Button 
                    className="w-full h-12 rounded-xl bg-sakura hover:bg-sakura-dark text-white font-bold gap-2 shadow-lg shadow-sakura/20 transition-all hover:scale-[1.02]"
                    onClick={onStartStudy}
                  >
                    <Play className="h-4 w-4" />
                    Học Unit này
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl border-2 border-sakura/20 bg-white/50 text-sakura hover:bg-sakura/5 font-bold gap-2 transition-all hover:scale-[1.02]"
                    onClick={() => {
                      onClose();
                      openWritingLab(kanji.character);
                    }}
                  >
                    <PenTool className="h-4 w-4" />
                    Luyện viết (Lab)
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="w-full h-12 rounded-xl text-muted-foreground hover:bg-sakura/5 font-bold gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Xem thêm ví dụ
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
