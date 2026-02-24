import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Plus, Loader2, BookOpen, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFlashcardCreation } from '@/hooks/useFlashcardCreation';
import { FolderSelectionDialog } from '@/components/flashcards/FolderSelectionDialog';

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
  const [flashcards, setFlashcards] = useState<SuggestedFlashcard[]>([]);
  const { toast } = useToast();
  
  // Flashcard creation
  const { createFlashcard, createFlashcards, isCreating } = useFlashcardCreation();
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [pendingFlashcard, setPendingFlashcard] = useState<SuggestedFlashcard | null>(null);
  const [pendingBulkAdd, setPendingBulkAdd] = useState(false);

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
          description: 'AI không tìm thấy từ vựng rõ ràng hoặc định dạng không đúng. Hãy thử văn bản khác.',
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

  const handleAddOne = (flashcard: SuggestedFlashcard) => {
    setPendingFlashcard(flashcard);
    setPendingBulkAdd(false);
    setShowFolderDialog(true);
  };

  const handleAddAll = () => {
    if (flashcards.length === 0) return;
    setPendingFlashcard(null);
    setPendingBulkAdd(true);
    setShowFolderDialog(true);
  };

  const handleFolderSelected = async (folderId: string) => {
    setShowFolderDialog(false);
    
    if (pendingBulkAdd && flashcards.length > 0) {
      await createFlashcards(flashcards, folderId);
    } else if (pendingFlashcard) {
      await createFlashcard(pendingFlashcard, folderId);
    }
    
    setPendingFlashcard(null);
    setPendingBulkAdd(false);
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
              Dán văn bản tiếng Nhật bạn đang học (bài báo, lời bài hát, đoạn chat...) để AI tự động trích xuất các thẻ nhớ chất lượng.
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
                disabled={isCreating}
              >
                <Plus className="h-4 w-4" />
                Lưu tất cả
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
                  <Card className="hover:border-sakura transition-all shadow-sm group relative overflow-hidden">
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
                        className="w-full mt-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-background border-sakura/30 text-sakura hover:bg-sakura hover:text-white"
                        variant="outline"
                        onClick={() => handleAddOne(card)}
                        disabled={isCreating}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Thêm vào bộ từ
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FolderSelectionDialog
        open={showFolderDialog}
        onClose={() => {
          setShowFolderDialog(false);
          setPendingFlashcard(null);
          setPendingBulkAdd(false);
        }}
        onSelectFolder={handleFolderSelected}
        title={pendingBulkAdd ? "Thêm tất cả vào thư mục" : "Thêm thẻ vào thư mục"}
      />
    </div>
  );
};

// export default FlashcardGenerator;
