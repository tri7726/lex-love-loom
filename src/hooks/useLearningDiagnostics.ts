import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DiagnosticInsight {
  type: 'vocabulary' | 'pronunciation' | 'grammar';
  target: string;
  weight: number;
}

export const useLearningDiagnostics = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<DiagnosticInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshInsights = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Fetch top mistakes
      const { data: mistakes } = await supabase
        .from('user_mistakes' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('mistake_count', { ascending: false })
        .limit(3);

      // 2. Fetch low pronunciation results
      const { data: results } = await supabase
        .from('pronunciation_results' as any)
        .select('original_text, score')
        .eq('user_id', user.id)
        .lt('score', 80)
        .order('created_at', { ascending: false })
        .limit(5);

      const computed: DiagnosticInsight[] = [];

      (mistakes || []).forEach((m: any) => {
        computed.push({ type: 'vocabulary', target: m.word, weight: m.mistake_count });
      });

      // Simple heuristic for pronunciation: detect common failed phrases
      (results || []).forEach((r: any) => {
        computed.push({ type: 'pronunciation', target: r.original_text, weight: 1 });
      });

      setInsights(computed);
      return computed;
    } catch (e) {
      console.error('Diagnostics failed', e);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return { insights, isLoading, refreshInsights };
};
