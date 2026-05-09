import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SavedSentence {
  id: string;
  japanese_text: string;
  vietnamese_text: string | null;
  video_id: string | null;
  segment_id: string | null;
  created_at: string;
}

export const useSentenceBookmark = () => {
  const [sentences, setSentences] = useState<SavedSentence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSentences = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_sentences')
        .select('id, japanese_text, vietnamese_text, video_id, segment_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSentences(data || []);
    } catch (err) {
      console.error('Error fetching saved sentences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveSentence = useCallback(async (sentence: {
    japanese_text: string;
    vietnamese_text?: string | null;
    video_id?: string | null;
    segment_id?: string | null;
  }) => {
    if (!user) {
      toast({
        title: 'Chưa đăng nhập',
        description: 'Vui lòng đăng nhập để lưu câu',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await (supabase as any).from('saved_sentences').upsert({
        user_id: user.id,
        japanese: sentence.japanese_text,
        meaning: sentence.vietnamese_text || '',
        japanese_text: sentence.japanese_text,
        vietnamese_text: sentence.vietnamese_text || null,
        video_id: sentence.video_id || null,
        segment_id: sentence.segment_id || null,
      }, {
        onConflict: 'user_id,segment_id',
      });

      if (error) throw error;

      toast({
        title: 'Đã lưu câu!',
        description: 'Câu đã được thêm vào sổ câu',
      });

      fetchSentences();
      return true;
    } catch (err) {
      console.error('Error saving sentence:', err);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu câu. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, fetchSentences]);

  const removeSentence = useCallback(async (segmentId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_sentences')
        .delete()
        .eq('segment_id', segmentId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Đã xóa',
        description: 'Câu đã được xóa khỏi danh sách',
      });

      setSentences(prev => prev.filter(s => s.segment_id !== segmentId));
      return true;
    } catch (err) {
      console.error('Error removing sentence:', err);
      return false;
    }
  }, [user, toast]);

  const isSentenceSaved = useCallback((segmentId?: string) => {
    if (!segmentId) return false;
    return sentences.some(s => s.segment_id === segmentId);
  }, [sentences]);

  useEffect(() => {
    if (user) {
      fetchSentences();
    }
  }, [user, fetchSentences]);

  return {
    sentences,
    isLoading,
    saveSentence,
    removeSentence,
    isSentenceSaved,
    refreshSentences: fetchSentences,
  };
};
