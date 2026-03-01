export interface VocabWord {
  id: string;
  word: string;
  reading: string | null;
  hanviet?: string | null;
  meaning: string;
  mastery_level?: number | null;
  example?: string;
  exampleMeaning?: string;
  created_at?: string;
}

export type VocabularyItem = VocabWord;

export interface SavedVocabulary extends VocabWord {
  user_id: string;
  created_at: string;
}

export type InsertVocabulary = Omit<SavedVocabulary, 'id' | 'created_at'>;
export type UpdateVocabulary = Partial<InsertVocabulary>;
