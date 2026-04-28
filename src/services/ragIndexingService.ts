import { supabase } from '@/integrations/supabase/client';

interface IndexVocabParams {
  userId: string;
  word: string;
  reading: string | null;
  meaning: string;
  folderId: string;
  jlptLevel?: string | null;
}

export async function indexSavedVocabulary(params: IndexVocabParams) {
  const { userId, word, reading, meaning, folderId, jlptLevel } = params;

  await supabase.functions.invoke('sensei-rag', {
    body: {
      action: 'index',
      user_id: userId,
      content: `Người dùng đã lưu từ vựng vào sổ tay: "${word}" (${reading || ''}) — nghĩa: ${meaning}. ${jlptLevel ? `JLPT ${jlptLevel}.` : ''}`,
      source_type: 'vocabulary',
      metadata: { word, folder_id: folderId }
    }
  }).catch(() => {});
}
