export interface MinnaVocabulary {
  id: string;
  lesson: number;
  kanji?: string | null;
  word: string;
  kana: string;
  romaji?: string;
  meaning_vi: string;
  meaning_en?: string;
  example_jp?: string;
  example_vi?: string;
  part_of_speech?: string;
  jlpt_level: string;
  tags?: string[];
  audio_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserVocabProgress {
  id: string;
  user_id: string;
  vocabulary_id: string;
  interval: number;
  ease_factor: number;
  repetitions: number;
  mastery_level: number;
  last_reviewed?: string;
  next_review: string;
  correct_count: number;
  incorrect_count: number;
  xp_earned: number;
}

/**
 * Joined type for vocabulary with user progress
 */
export interface VocabWithProgress extends MinnaVocabulary {
  progress?: UserVocabProgress;
}
