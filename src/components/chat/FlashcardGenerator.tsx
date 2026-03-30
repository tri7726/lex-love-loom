import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Plus, Loader2, BookOpen, Save, FolderOpen, Check, Volume2, Crown, Zap, Trash2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTTS } from '@/hooks/useTTS';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { useFlashcardFolders } from '@/hooks/useFlashcardFolders';
import { VocabWord } from '@/types/vocabulary';

interface SuggestedFlashcard {
  word: string;
  reading: string;
  hanviet?: string;
  meaning: string;
  example_sentence: string;
  example_translation: string;
  jlpt_level?: string;
  word_type?: string;
  notes?: string;
}

const JLPT_COLORS: Record<string, string> = {
  'N5': 'bg-green-500/20 text-green-700 dark:text-green-300',
  'N4': 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  'N3': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  'N2': 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  'N1': 'bg-red-500/20 text-red-700 dark:text-red-300',
};

export const FlashcardGenerator = () => {
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<SuggestedFlashcard[]>([]);
  const { toast } = useToast();
  const { speak, isSpeaking } = useTTS();
  const { profile } = useProfile();

  const { folders, createFolder, addWordToFolder } = useFlashcardFolders();
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pendingCards, setPendingCards] = useState<SuggestedFlashcard[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [addedCards, setAddedCards] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      toast({
        title: 'Thiếu nội dung',
        description: 'Vui lòng nhập văn bản để AI có thể trích xuất từ vựng.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setFlashcards([]);
    setAddedCards(new Set());

    try {
      const userContext = profile ? 
        `User Level: ${profile.level}, name ${profile.full_name || 'Gakusei'}.` : 
        "User is learning Japanese.";

      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: {
          prompt: `[Context: ${userContext}] Please extract key vocabulary and suggest high-quality flashcards from this text. Focus on common words and useful expressions.`,
          content: inputText,
          isVip: true
        }
      });

      if (error) throw error;

      if (data.format === 'structured' && data.analysis?.suggested_flashcards) {
        setFlashcards(data.analysis.suggested_flashcards);
        toast({
          title: 'Trích xuất VIP hoàn tất',
          description: `Sensei đã tìm thấy ${data.analysis.suggested_flashcards.length} từ vựng quan trọng!`,
        });
      } else {
        toast({
          title: 'Kết quả không mong muốn',
          description: 'AI không tìm thấy từ vựng rõ ràng. Hãy thử văn bản khác.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Lỗi AI Sensei',
        description: 'Sensei hiện đang bận pha trà, hãy thử lại sau nhé!',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleAddOne = (card: SuggestedFlashcard, idx: number) => {
    setPendingCards([card]);
    setShowFolderPicker(true);
  };

  const handleAddAll = () => {
    if (flashcards.length === 0) return;
    setPendingCards(flashcards);
    setShowFolderPicker(true);
  };

  const addToFolder = (folderId: string) => {
    const newWords: Omit<VocabWord, 'id'>[] = pendingCards.map((card) => ({
      word: card.word,
      reading: card.reading || null,
      hanviet: card.hanviet || null,
      meaning: card.meaning,
      mastery_level: null,
      example_sentence: card.example_sentence,
      example_translation: card.example_translation,
      jlpt_level: card.jlpt_level,
      word_type: card.word_type
    }));

    newWords.forEach(word => addWordToFolder(folderId, word));

    // Track which cards were added
    if (pendingCards.length === flashcards.length) {
      setAddedCards(new Set(flashcards.map((_, i) => i)));
    } else {
      const idx = flashcards.indexOf(pendingCards[0]);
      if (idx >= 0) setAddedCards((prev) => new Set([...prev, idx]));
    }

    toast({
      title: '✅ Đã thêm thành công!',
      description: `${pendingCards.length} từ đã được thêm vào Sổ tay. Vào Vocabulary để học!`,
    });

    setShowFolderPicker(false);
    setPendingCards([]);
  };

  const createFolderAndAdd = async () => {
    if (!newFolderName.trim()) return;
    const newFolder = await createFolder(newFolderName.trim(), '📚');
    if (!newFolder) return;
    setNewFolderName('');
    
    // Add cards to the new folder
    const newWords: Omit<VocabWord, 'id'>[] = pendingCards.map((card) => ({
      word: card.word,
      reading: card.reading || null,
      hanviet: card.hanviet || null,
      meaning: card.meaning,
      mastery_level: null,
      example_sentence: card.example_sentence,
      example_translation: card.example_translation,
      jlpt_level: card.jlpt_level,
      word_type: card.word_type
    }));
    
    newWords.forEach(word => addWordToFolder(newFolder.id, word));
    
    // Track added cards
    if (pendingCards.length === flashcards.length) {
      setAddedCards(new Set(flashcards.map((_, i) => i)));
    } else {
      const idx = flashcards.indexOf(pendingCards[0]);
      if (idx >= 0) setAddedCards((prev) => new Set([...prev, idx]));
    }

    toast({
      title: '✅ Đã thêm thành công!',
      description: `${pendingCards.length} từ đã được thêm vào thư mục mới.`,
    });

    setShowFolderPicker(false);
    setPendingCards([]);
  };

  return (
    <div className="space-y-8">
      {/* VIP Generator Card */}
      <Card className="border-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] shadow-elevated overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Zap className="h-32 w-32" />
        </div>
        
        <CardContent className="p-8 md:p-10 space-y-6 relative z-10">
          <div className="space-y-2 text-center">
            <Badge variant="outline" className="border-indigo-600/30 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 font-bold tracking-widest text-[10px] px-3 py-0.5">
              AI VOCABULARY EXTRACTOR
            </Badge>
            <h3 className="font-black text-2xl md:text-3xl text-slate-900 dark:text-white">
              Tạo thẻ từ nội dung bất kỳ
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">
              Dán văn bản tiếng Nhật và Sensei sẽ trích xuất những từ vựng quan trọng nhất cho bạn.
            </p>
          </div>

          <div className="group relative">
            <Textarea
              placeholder="Dán văn bản tiếng Nhật vào đây..."
              className="min-h-[200px] font-jp text-lg leading-relaxed bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-sakura/10 dark:border-slate-800 transition-all rounded-3xl p-6 shadow-soft focus-visible:ring-sakura/30"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <Button
            className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
            onClick={handleGenerate}
            disabled={isGenerating || !inputText.trim()}
          >
            {isGenerating ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Đang trích xuất...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5" />
                <span>BẮT ĐẦU TRÍCH XUẬT VIP</span>
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {flashcards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
              <div className="space-y-1 text-center md:text-left">
                <h4 className="font-black text-2xl flex items-center justify-center md:justify-start gap-4">
                   <div className="h-10 w-10 rounded-xl bg-sakura/10 flex items-center justify-center">
                     <BookOpen className="h-6 w-6 text-sakura" />
                   </div>
                   Tìm thấy {flashcards.length} đề xuất
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Chọn các thẻ bạn muốn lưu vào Sổ tay để bắt đầu luyện tập.</p>
              </div>
              
              <Button
                onClick={handleAddAll}
                disabled={addedCards.size === flashcards.length}
                variant="outline"
                className={cn(
                  "h-12 px-8 rounded-2xl font-black transition-all gap-3 text-xs uppercase tracking-widest shadow-sm",
                  addedCards.size === flashcards.length 
                    ? "bg-green-500/10 text-green-600 border-green-200" 
                    : "border-sakura/20 text-sakura hover:bg-sakura/10"
                )}
              >
                {addedCards.size === flashcards.length ? (
                  <><Check className="h-4 w-4" /> Đã lưu tất cả</>
                ) : (
                  <><PlusCircle className="h-4 w-4" /> Lưu tất cả thẻ</>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {flashcards.map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card 
                    className={cn(
                      "group relative overflow-hidden transition-all duration-300 cursor-pointer rounded-[2.5rem] border-0 shadow-soft",
                      addedCards.has(idx) 
                        ? 'bg-green-50/40 dark:bg-green-950/20 border-2 border-green-200' 
                        : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:border-2 hover:border-sakura/30'
                    )}
                    onClick={() => speak(card.word)}
                  >
                    <CardContent className="p-10 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                           <div className="flex items-center gap-3">
                             <div className="text-3xl font-jp font-black text-slate-900 dark:text-white group-hover:text-sakura transition-colors">{card.word}</div>
                             <div className="h-8 w-8 rounded-full bg-sakura/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                <Volume2 className="h-4 w-4 text-sakura" />
                             </div>
                           </div>
                           <p className="text-lg font-mono text-sakura/60 font-bold tracking-tight">【{card.reading}】</p>
                           {card.hanviet && (
                             <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest bg-white dark:bg-slate-800 text-amber-600 border-amber-200 shadow-sm px-3">
                               Hán Việt: {card.hanviet}
                             </Badge>
                           )}
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {card.jlpt_level && (
                            <Badge className={cn("px-4 py-1.5 border-0 shadow-sm rounded-full font-black text-[10px]", JLPT_COLORS[card.jlpt_level])}>
                              {card.jlpt_level}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-sakura/20 text-sakura/60 h-6">
                             {card.word_type}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-white/20 shadow-inner-soft">
                           <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{card.meaning}</p>
                        </div>

                        <div className="flex gap-4 p-2">
                           <div className="w-1.5 bg-gradient-to-b from-sakura/60 to-transparent rounded-full" />
                           <div className="space-y-2 py-1 flex-1">
                             <p className="font-jp text-lg leading-relaxed font-bold text-slate-800 dark:text-slate-200">{card.example_sentence}</p>
                             <p className="text-sm text-slate-500 italic font-medium">"{card.example_translation}"</p>
                           </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "w-full h-11 rounded-xl transition-all font-black text-xs uppercase tracking-widest",
                          addedCards.has(idx)
                            ? 'bg-green-500 text-white border-transparent cursor-default'
                            : 'border-sakura/20 text-sakura hover:bg-sakura/10 bg-white/50'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!addedCards.has(idx)) handleAddOne(card, idx);
                        }}
                        disabled={addedCards.has(idx)}
                      >
                        {addedCards.has(idx) ? (
                          <><Check className="h-4 w-4 mr-2" /> Đã lưu vào Sổ tay</>
                        ) : (
                          <><Save className="h-4 w-4 mr-2" /> Lưu thẻ từ này</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIP Folder Picker Dialog */}
      <AnimatePresence>
        {showFolderPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setShowFolderPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-elevated-heavy w-full max-w-md p-8 space-y-6 overflow-hidden relative border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <FolderOpen className="h-24 w-24" />
              </div>

              <div className="space-y-2 text-center">
                <h3 className="font-display font-black text-2xl flex items-center justify-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sakura/10 flex items-center justify-center">
                    <FolderOpen className="h-6 w-6 text-sakura" />
                  </div>
                  Chọn thư mục
                </h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Đang thêm <span className="text-sakura font-bold">{pendingCards.length}</span> từ vựng mới vào Sổ tay của bạn.
                </p>
              </div>

              {/* Existing folders */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                {folders.length === 0 && (
                  <div className="text-center py-8 bg-white/40 dark:bg-white/5 rounded-3xl border border-dashed border-white/20">
                     <p className="text-sm text-muted-foreground font-medium">Chưa có thư mục nào.<br/>Hãy tạo mới bên dưới!</p>
                  </div>
                )}
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/40 bg-white/40 dark:bg-white/5 hover:border-sakura/50 hover:bg-sakura/5 transition-all text-left shadow-soft hover:shadow-md group"
                    onClick={() => addToFolder(folder.id)}
                  >
                    <span className="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">{folder.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-foreground">{folder.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{folder.words.length} từ vựng</p>
                    </div>
                    <PlusCircle className="h-5 w-5 text-sakura opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>

              {/* Create new folder */}
              <div className="pt-4 border-t border-white/20 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Hoặc tạo không gian mới</p>
                <div className="flex gap-2 bg-white/40 dark:bg-white/5 p-1.5 rounded-2xl border border-white/20 shadow-soft">
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Tên thư mục mới..."
                    className="flex-1 px-4 h-11 bg-transparent border-0 outline-none text-sm font-medium"
                    onKeyDown={(e) => e.key === 'Enter' && createFolderAndAdd()}
                  />
                  <Button
                    className="h-11 w-11 rounded-xl bg-gradient-to-r from-sakura to-pink-500 shadow-sakura-soft hover:shadow-sakura transition-all"
                    disabled={!newFolderName.trim()}
                    onClick={createFolderAndAdd}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full rounded-2xl h-12 text-muted-foreground hover:bg-sakura/5 hover:text-sakura transition-colors font-bold"
                onClick={() => setShowFolderPicker(false)}
              >
                Hủy bỏ
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
