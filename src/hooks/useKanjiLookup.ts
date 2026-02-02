import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface KanjiSuggestion {
  kanji: string;
  reading: string;
  meaning: string;
  source?: string;
}

interface UseKanjiLookupOptions {
  debounceMs?: number;
  maxResults?: number;
}

export const useKanjiLookup = (options: UseKanjiLookupOptions = {}) => {
  const { debounceMs = 300, maxResults = 5 } = options;
  const [suggestions, setSuggestions] = useState<KanjiSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastQueryRef = useRef<string>('');

  const lookupKanji = useCallback(async (hiraganaText: string) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Skip if text too short or same as last query
    if (!hiraganaText || hiraganaText.length < 2) {
      setSuggestions([]);
      return;
    }

    if (hiraganaText === lastQueryRef.current) {
      return;
    }

    debounceRef.current = setTimeout(async () => {
      lastQueryRef.current = hiraganaText;
      setIsLoading(true);

      try {
        // Call the lookup-word edge function
        const { data, error } = await supabase.functions.invoke('lookup-word', {
          body: { word: hiraganaText }
        });

        if (error) {
          console.error('Lookup error:', error);
          setSuggestions([]);
          return;
        }

        if (data && data.word && data.meaning) {
          const suggestion: KanjiSuggestion = {
            kanji: data.word,
            reading: data.reading || hiraganaText,
            meaning: data.meaning,
            source: data.source || 'api'
          };
          setSuggestions([suggestion]);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Kanji lookup failed:', err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [debounceMs, maxResults]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    lastQueryRef.current = '';
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  return {
    suggestions,
    isLoading,
    lookupKanji,
    clearSuggestions
  };
};
