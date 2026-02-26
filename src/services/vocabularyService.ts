import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

import { 
  SavedVocabulary, 
  InsertVocabulary, 
  UpdateVocabulary 
} from '@/types/vocabulary';

export const vocabularyService = {
  /**
   * Fetch all saved vocabulary for the current user
   */
  async getSavedVocabulary(userId: string) {
    const { data, error } = await supabase
      .from('saved_vocabulary')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Save a new word or update an existing one (upsert based on word text)
   * Note: The DB should have a unique constraint or we handle it here.
   * Based on useWordHistory, there is an upsert with onConflict: 'user_id,word'
   */
  async upsertWord(word: InsertVocabulary) {
    const { data, error } = await supabase
      .from('saved_vocabulary')
      .upsert(word, { onConflict: 'user_id,word' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a word by ID
   */
  async deleteWord(id: string, userId: string) {
    const { error } = await supabase
      .from('saved_vocabulary')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  },

  /**
   * Update mastery level or other fields
   */
  async updateWord(id: string, userId: string, updates: UpdateVocabulary) {
    const { data, error } = await supabase
      .from('saved_vocabulary')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
