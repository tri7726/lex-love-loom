import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RelatedKanjiData } from './useKanjiDetails';

export interface RelatedKanjiResponse {
  related: Array<{
    kanji: {
      id: string;
      character: string;
      hanviet: string;
      meaning_vi: string;
      jlpt_level: string;
      stroke_count: number;
      radical: string;
    };
    relationship_type: string;
    strength: number;
    reason?: string;
  }>;
  grouped_by_type: {
    radical: any[];
    reading: any[];
    meaning: any[];
    component: any[];
    compound: any[];
    antonym: any[];
    synonym: any[];
  };
  total: number;
}

interface UseRelatedKanjiOptions {
  kanji_id?: string;
  types?: string[];
  limit?: number;
  enabled?: boolean;
}

export function useRelatedKanji({
  kanji_id,
  types,
  limit = 50,
  enabled = true,
}: UseRelatedKanjiOptions) {
  const [data, setData] = useState<RelatedKanjiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !kanji_id) {
      return;
    }

    const fetchRelatedKanji = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'kanji-related',
          {
            body: {
              kanji_id,
              types,
              limit,
            },
          }
        );

        if (functionError) throw functionError;

        setData(functionData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch related kanji'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelatedKanji();
  }, [kanji_id, types, limit, enabled]);

  return { data, isLoading, error };
}
