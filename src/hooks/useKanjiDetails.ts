import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KanjiData {
  id: string;
  character: string;
  hanviet: string;
  meaning_vi: string;
  meaning_en?: string;
  jlpt_level: string;
  grade?: number;
  frequency?: number;
  stroke_count: number;
  radical: string;
  onyomi: string[];
  kunyomi: string[];
  components: string[];
  svg_data?: string;
  svg_url?: string;
  stroke_order?: any;
  conversion_rules?: string;
  mnemonic?: string;
}

export interface VocabularyData {
  id: string;
  word: string;
  reading: string;
  hanviet?: string;
  meaning_vi: string;
  meaning_en?: string;
  jlpt_level?: string;
  part_of_speech?: string;
  example_sentence?: string;
  example_translation?: string;
  position?: number;
  textbook_info?: {
    textbook: string;
    lesson_number: number;
    page_number?: number;
  }[];
}

export interface RelatedKanjiData {
  id: string;
  character: string;
  hanviet: string;
  meaning_vi: string;
  jlpt_level: string;
  stroke_count: number;
  radical: string;
  relationship_type: string;
  strength: number;
  reason?: string;
}

export interface UserProgress {
  id: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  last_review?: string;
  next_review: string;
  recognition_correct: number;
  recognition_total: number;
  recognition_accuracy: number;
  writing_attempts: number;
  writing_accuracy: number;
  last_writing_score?: number;
  status: 'new' | 'learning' | 'review' | 'mastered';
  starred: boolean;
  notes?: string;
}

export interface KanjiDetailsResponse {
  kanji: KanjiData;
  vocabulary?: VocabularyData[];
  vocabulary_by_jlpt?: {
    N5: VocabularyData[];
    N4: VocabularyData[];
    N3: VocabularyData[];
    N2: VocabularyData[];
    N1: VocabularyData[];
  };
  textbook_vocabulary?: VocabularyData[];
  related_kanji?: RelatedKanjiData[];
  related_by_type?: {
    radical: RelatedKanjiData[];
    reading: RelatedKanjiData[];
    meaning: RelatedKanjiData[];
    component: RelatedKanjiData[];
  };
  user_progress?: UserProgress | null;
  stats?: {
    vocabulary_count: number;
    related_kanji_count: number;
  };
}

interface UseKanjiDetailsOptions {
  kanji_id?: string;
  character?: string;
  include_vocabulary?: boolean;
  include_related?: boolean;
  enabled?: boolean;
}

export function useKanjiDetails({
  kanji_id,
  character,
  include_vocabulary = true,
  include_related = true,
  enabled = true,
}: UseKanjiDetailsOptions) {
  const [data, setData] = useState<KanjiDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || (!kanji_id && !character)) {
      return;
    }

    const fetchKanjiDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Call Edge Function
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'kanji-details',
          {
            body: {
              kanji_id,
              character,
              include_vocabulary,
              include_related,
              user_id: user?.id,
            },
          }
        );

        if (functionError) throw functionError;

        setData(functionData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch kanji details'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchKanjiDetails();
  }, [kanji_id, character, include_vocabulary, include_related, enabled]);

  const refetch = async () => {
    if (!kanji_id && !character) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'kanji-details',
        {
          body: {
            kanji_id,
            character,
            include_vocabulary,
            include_related,
            user_id: user?.id,
          },
        }
      );

      if (functionError) throw functionError;

      setData(functionData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch kanji details'));
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, refetch };
}
