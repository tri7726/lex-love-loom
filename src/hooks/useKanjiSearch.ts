import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KanjiData } from './useKanjiDetails';

export interface SearchFilters {
  query?: string;
  jlpt_level?: string;
  radical?: string;
  stroke_min?: number;
  stroke_max?: number;
}

export interface SearchResponse {
  results: KanjiData[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  total_pages: number;
}

export function useKanjiSearch() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * limit;

      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'kanji-search',
        {
          body: {
            ...filters,
            limit,
            offset,
          },
        }
      );

      if (functionError) throw functionError;

      setData(functionData);
      return functionData as SearchResponse;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to search kanji');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, isLoading, error, search, clear };
}
