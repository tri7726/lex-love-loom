import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface WordHistoryItem {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  created_at: string;
  mastery_level: number | null;
}

export const useWordHistory = () => {
  const [history, setHistory] = useState<WordHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch saved vocabulary history
  const fetchHistory = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_vocabulary')
        .select('id, word, reading, meaning, created_at, mastery_level')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save word to vocabulary
  const saveWord = useCallback(async (word: { 
    word: string; 
    reading?: string; 
    meaning: string;
    example_sentence?: string;
  }) => {
    if (!user) {
      toast({
        title: 'Chưa đăng nhập',
        description: 'Vui lòng đăng nhập để lưu từ vựng',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase.from('saved_vocabulary').upsert({
        user_id: user.id,
        word: word.word,
        reading: word.reading || null,
        meaning: word.meaning,
        example_sentence: word.example_sentence || null,
        mastery_level: 0,
      }, {
        onConflict: 'user_id,word',
      });

      if (error) throw error;

      toast({
        title: 'Đã lưu!',
        description: `"${word.word}" đã được thêm vào sổ từ vựng`,
      });

      // Refresh history
      fetchHistory();
      return true;
    } catch (err) {
      console.error('Error saving word:', err);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu từ vựng. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, fetchHistory]);

  // Remove word from vocabulary
  const removeWord = useCallback(async (wordId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_vocabulary')
        .delete()
        .eq('id', wordId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Đã xóa',
        description: 'Từ vựng đã được xóa khỏi danh sách',
      });

      // Update local state
      setHistory(prev => prev.filter(item => item.id !== wordId));
      return true;
    } catch (err) {
      console.error('Error removing word:', err);
      return false;
    }
  }, [user, toast]);

  // Check if word is saved
  const isWordSaved = useCallback((word: string) => {
    return history.some(item => item.word === word);
  }, [history]);

  // Load history on mount
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, fetchHistory]);

  return {
    history,
    isLoading,
    saveWord,
    removeWord,
    isWordSaved,
    refreshHistory: fetchHistory,
  };
};
