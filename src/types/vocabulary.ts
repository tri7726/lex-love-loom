export interface VocabWord {
  id: string;
  word: string;
  reading: string | null;
  hanviet?: string | null;
  meaning: string;
  mastery_level: number | null;
  example?: string;
  exampleMeaning?: string;
}

export interface VocabularyItem extends VocabWord {}
