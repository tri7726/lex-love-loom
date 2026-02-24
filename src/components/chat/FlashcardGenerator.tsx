import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Plus, Loader2, BookOpen, Save, FolderOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface CustomFolder {
  id: string;
  name: string;
  emoji: string;
  words: VocabWord[];
  createdAt: string;
}

interface VocabWord {
  id: string;
  word: string;
  reading: string | null;
  hanviet: string | null;
  meaning: string;
  mastery_level: number | null;
}

const CUSTOM_FOLDERS_KEY = 'lex-custom-folders';

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
  const [flashcards, setFlashcards] = useState<SuggestedFlashcard[]>([]);
  const { toast } = useToast();

  // Folder selection
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pendingCards, setPendingCards] = useState<SuggestedFlashcard[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [addedCards, setAddedCards] = useState<Set<number>>(new Set());

  // Load folders from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_FOLDERS_KEY);
      if (stored) setFolders(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [showFolderPicker]);

  const saveFolders = (updated: CustomFolder[]) => {
    setFolders(updated);
    localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(updated));
  };

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
      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: {
          prompt: "Please extract key vocabulary and suggest flashcards from this text. Focus on common words and useful expressions.",
          content: inputText
        }
      });

      if (error) throw error;

      if (data.format === 'structured' && data.analysis?.suggested_flashcards) {
        setFlashcards(data.analysis.suggested_flashcards);
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
        title: 'Lỗi AI',
        description: 'Không thể kết nối với AI. Hãy thử lại sau.',
        variant: 'destructive',
      });
    } finally {
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
    const stored = localStorage.getItem(CUSTOM_FOLDERS_KEY);
    const allFolders: CustomFolder[] = stored ? JSON.parse(stored) : [];

    const newWords: VocabWord[] = pendingCards.map((card, i) => ({
      id: `ai-${Date.now()}-${i}`,
      word: card.word,
      reading: card.reading || null,
      hanviet: card.hanviet || null,
      meaning: card.meaning,
      mastery_level: null,
    }));

    const updated = allFolders.map((f) =>
      f.id === folderId ? { ...f, words: [...f.words, ...newWords] } : f
    );

    saveFolders(updated);

    // Track which cards were added
    if (pendingCards.length === flashcards.length) {
      // Added all
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

  const createFolderAndAdd = () => {
    if (!newFolderName.trim()) return;
    const stored = localStorage.getItem(CUSTOM_FOLDERS_KEY);
    const allFolders: CustomFolder[] = stored ? JSON.parse(stored) : [];

    const newFolder: CustomFolder = {
      id: `custom-${Date.now()}`,
      name: newFolderName.trim(),
      emoji: '📚',
      words: [],
      createdAt: new Date().toISOString(),
    };

    const updated = [...allFolders, newFolder];
    saveFolders(updated);
    setNewFolderName('');

    // Now add cards to the new folder
    addToFolder(newFolder.id);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-sakura/20 bg-gradient-to-br from-background to-sakura/5">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sakura" />
              Tạo thẻ từ nội dung bất kỳ
            </h3>
            <p className="text-sm text-muted-foreground">
              Dán văn bản tiếng Nhật (bài báo, lời bài hát, đoạn chat...) → AI trích xuất từ vựng → Lưu vào <strong>Sổ tay của tôi</strong> trong Vocabulary.
            </p>
          </div>

          <Textarea
            placeholder="Dán văn bản tiếng Nhật vào đây..."
            className="min-h-[150px] font-jp text-lg leading-relaxed focus:ring-sakura"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <Button
            className="w-full h-12 gap-2 text-md bg-sakura hover:bg-sakura/90 text-white shadow-lg"
            onClick={handleGenerate}
            disabled={isGenerating || !inputText.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang trích xuất từ vựng...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5" />
                Bắt đầu trích xuất (AI)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence>
        {flashcards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-matcha" />
                Kết quả: {flashcards.length} thẻ gợi ý
              </h4>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-matcha/50 text-matcha hover:bg-matcha/5"
                onClick={handleAddAll}
                disabled={addedCards.size === flashcards.length}
              >
                {addedCards.size === flashcards.length ? (
                  <><Check className="h-4 w-4" /> Đã lưu tất cả</>
                ) : (
                  <><Plus className="h-4 w-4" /> Lưu tất cả vào Sổ tay</>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flashcards.map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`hover:border-sakura transition-all shadow-sm group relative overflow-hidden ${addedCards.has(idx) ? 'border-green-300 bg-green-50/30' : ''}`}>
                    <CardContent className="pt-5 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-xl font-bold font-jp text-foreground">{card.word}</div>
                          <div className="text-sm text-muted-foreground font-jp">{card.reading}</div>
                          {card.hanviet && (
                            <div className="text-xs text-sakura/70 font-display font-medium">Hán Việt: {card.hanviet}</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {card.jlpt_level && (
                            <Badge className={`${JLPT_COLORS[card.jlpt_level]} border-none`}>
                              {card.jlpt_level}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] py-0">{card.word_type}</Badge>
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="text-md border-l-2 border-sakura/30 pl-3 py-1 bg-sakura/5 rounded-r">
                          {card.meaning}
                        </div>

                        <div className="p-2 bg-muted/30 rounded text-xs space-y-1 italic border-l-2 border-muted">
                          <div className="font-jp text-muted-foreground">{card.example_sentence}</div>
                          <div className="text-muted-foreground/70">{card.example_translation}</div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className={`w-full mt-4 transition-all ${
                          addedCards.has(idx)
                            ? 'bg-green-500/10 text-green-600 border-green-300 cursor-default'
                            : 'opacity-100 md:opacity-0 group-hover:opacity-100 bg-background border-sakura/30 text-sakura hover:bg-sakura hover:text-white'
                        }`}
                        variant="outline"
                        onClick={() => !addedCards.has(idx) && handleAddOne(card, idx)}
                        disabled={addedCards.has(idx)}
                      >
                        {addedCards.has(idx) ? (
                          <><Check className="h-4 w-4 mr-2" /> Đã thêm</>
                        ) : (
                          <><Save className="h-4 w-4 mr-2" /> Thêm vào Sổ tay</>
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

      {/* Folder Picker Dialog */}
      <AnimatePresence>
        {showFolderPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowFolderPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-rose-500" />
                Chọn thư mục trong Sổ tay
              </h3>
              <p className="text-sm text-muted-foreground">
                Thêm {pendingCards.length} từ vào thư mục:
              </p>

              {/* Existing folders */}
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {folders.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Chưa có thư mục nào. Tạo mới bên dưới!</p>
                )}
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-rose-200 hover:border-rose-400 hover:bg-rose-50 transition-all text-left"
                    onClick={() => addToFolder(folder.id)}
                  >
                    <span className="text-2xl">{folder.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">{folder.words.length} từ</p>
                    </div>
                    <Plus className="h-4 w-4 text-rose-400" />
                  </button>
                ))}
              </div>

              {/* Create new folder */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Hoặc tạo thư mục mới:</p>
                <div className="flex gap-2">
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Tên thư mục mới..."
                    className="flex-1 px-3 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm bg-background"
                    onKeyDown={(e) => e.key === 'Enter' && createFolderAndAdd()}
                  />
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-rose-400 to-pink-400 text-white"
                    disabled={!newFolderName.trim()}
                    onClick={createFolderAndAdd}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowFolderPicker(false)}
              >
                Hủy
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
