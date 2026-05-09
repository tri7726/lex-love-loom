export interface VocabWord {
  id: string;
  word: string;
  reading: string | null;
  hanviet?: string | null;
  meaning: string;
  mastery_level?: number | null;
  example_sentence?: string;
  example_translation?: string;
  /** Shorthand alias used in local data files */
  example?: string;
  /** Shorthand alias used in local data files */
  exampleMeaning?: string;
  jlpt_level?: string;
  word_type?: string;
  created_at?: string;
}

export type VocabularyItem = VocabWord;

export interface SavedVocabulary extends VocabWord {
  user_id: string;
  created_at: string;
}

export type InsertVocabulary = Omit<SavedVocabulary, 'id' | 'created_at'>;
export type UpdateVocabulary = Partial<InsertVocabulary>;
