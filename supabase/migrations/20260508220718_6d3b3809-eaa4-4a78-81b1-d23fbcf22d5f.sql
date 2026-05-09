-- ============================================================
-- PHASE 1.1 — WEAKNESS HEATMAP
-- ============================================================

-- Mastery matrix view (per user × jlpt level × category)
CREATE OR REPLACE VIEW public.v_user_mastery_matrix
WITH (security_invoker = true) AS
SELECT
  ukp.user_id,
  COALESCE(k.jlpt_level, 'N5')::text AS level,
  'kanji'::text AS category,
  COUNT(*)::int AS attempted,
  COUNT(*) FILTER (WHERE ukp.consecutive_correct >= 3 OR ukp.repetitions >= 4)::int AS mastered
FROM public.user_kanji_progress ukp
JOIN public.kanji k ON k.id = ukp.kanji_id
GROUP BY ukp.user_id, COALESCE(k.jlpt_level, 'N5')

UNION ALL

SELECT
  ugp.user_id,
  COALESCE(gp.level, 'N5')::text,
  'grammar',
  COUNT(*)::int,
  COUNT(*) FILTER (WHERE ugp.mastery_score >= 0.7)::int
FROM public.user_grammar_progress ugp
JOIN public.grammar_points gp ON gp.id = ugp.grammar_id
GROUP BY ugp.user_id, COALESCE(gp.level, 'N5')

UNION ALL

SELECT
  f.user_id,
  COALESCE(f.jlpt_level, 'N5')::text,
  'vocab',
  COUNT(*)::int,
  COUNT(*) FILTER (WHERE f.repetitions >= 4)::int
FROM public.flashcards f
GROUP BY f.user_id, COALESCE(f.jlpt_level, 'N5');

GRANT SELECT ON public.v_user_mastery_matrix TO authenticated, anon;

-- Weakness quest generator
CREATE OR REPLACE FUNCTION public.generate_weakness_quest(
  p_category text,
  p_level text DEFAULT 'N5',
  p_limit int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_items jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF p_category = 'kanji' THEN
    SELECT jsonb_agg(item) INTO v_items FROM (
      SELECT jsonb_build_object(
        'id', k.id,
        'character', k.character,
        'meaning', COALESCE(k.meaning_vi, k.meaning),
        'onyomi', k.onyomi,
        'kunyomi', k.kunyomi,
        'weakness_score', COALESCE(ukp.lapses_score, 999)
      ) AS item
      FROM public.kanji k
      LEFT JOIN (
        SELECT kanji_id,
          (COALESCE(repetitions,0) - COALESCE(consecutive_correct,0)*2) AS lapses_score
        FROM public.user_kanji_progress
        WHERE user_id = v_user
      ) ukp ON ukp.kanji_id = k.id
      WHERE k.jlpt_level = p_level
      ORDER BY COALESCE(ukp.lapses_score, 999) DESC
      LIMIT p_limit
    ) t;

  ELSIF p_category = 'grammar' THEN
    SELECT jsonb_agg(item) INTO v_items FROM (
      SELECT jsonb_build_object(
        'id', gp.id,
        'title', gp.title,
        'structure', gp.structure,
        'explanation', gp.explanation,
        'examples', gp.examples,
        'mastery', COALESCE(ugp.mastery_score, 0)
      ) AS item
      FROM public.grammar_points gp
      LEFT JOIN public.user_grammar_progress ugp
        ON ugp.grammar_id = gp.id AND ugp.user_id = v_user
      WHERE gp.level = p_level
      ORDER BY COALESCE(ugp.mastery_score, 0) ASC
      LIMIT p_limit
    ) t;

  ELSIF p_category = 'vocab' THEN
    SELECT jsonb_agg(item) INTO v_items FROM (
      SELECT jsonb_build_object(
        'id', f.id,
        'word', f.word,
        'reading', f.reading,
        'meaning', f.meaning,
        'example_sentence', f.example_sentence,
        'repetitions', f.repetitions,
        'lapses', f.lapses
      ) AS item
      FROM public.flashcards f
      WHERE f.user_id = v_user
        AND COALESCE(f.jlpt_level, 'N5') = p_level
      ORDER BY (COALESCE(f.lapses,0) * 3 - COALESCE(f.repetitions,0)) DESC, f.due ASC
      LIMIT p_limit
    ) t;
  END IF;

  RETURN COALESCE(v_items, '[]'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_weakness_quest(text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_weakness_quest(text, text, int) TO authenticated;

-- ============================================================
-- PHASE 1.3 — A/B TEST FRAMEWORK
-- ============================================================

CREATE TABLE IF NOT EXISTS public.experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  description text,
  variants jsonb NOT NULL DEFAULT '["control","treatment"]'::jsonb,
  traffic numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read active experiments"
  ON public.experiments FOR SELECT USING (true);
CREATE POLICY "Admin manage experiments"
  ON public.experiments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  experiment_key text NOT NULL,
  variant text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, experiment_key)
);
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own assignments"
  ON public.experiment_assignments FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own assignments"
  ON public.experiment_assignments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.experiment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  experiment_key text NOT NULL,
  variant text NOT NULL,
  event text NOT NULL,
  value numeric,
  ts timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exp_events_key_event ON public.experiment_events(experiment_key, event);
ALTER TABLE public.experiment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own events"
  ON public.experiment_events FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own events"
  ON public.experiment_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Stable variant assignment via deterministic hash
CREATE OR REPLACE FUNCTION public.assign_experiment_variant(p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_exp public.experiments%ROWTYPE;
  v_existing text;
  v_variants jsonb;
  v_count int;
  v_idx int;
  v_chosen text;
  v_hash bigint;
BEGIN
  IF v_user IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_exp FROM public.experiments WHERE key = p_key AND is_active = true;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT variant INTO v_existing FROM public.experiment_assignments
  WHERE user_id = v_user AND experiment_key = p_key;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  v_variants := v_exp.variants;
  v_count := jsonb_array_length(v_variants);
  IF v_count = 0 THEN RETURN NULL; END IF;

  v_hash := abs(hashtext(v_user::text || ':' || p_key));
  v_idx := (v_hash % v_count)::int;
  v_chosen := v_variants->>v_idx;

  INSERT INTO public.experiment_assignments (user_id, experiment_key, variant)
  VALUES (v_user, p_key, v_chosen)
  ON CONFLICT (user_id, experiment_key) DO NOTHING;

  INSERT INTO public.experiment_events (user_id, experiment_key, variant, event)
  VALUES (v_user, p_key, v_chosen, 'assign');

  RETURN v_chosen;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_experiment_event(
  p_key text, p_event text, p_value numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_variant text;
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  SELECT variant INTO v_variant FROM public.experiment_assignments
  WHERE user_id = v_user AND experiment_key = p_key;
  IF v_variant IS NULL THEN RETURN; END IF;
  INSERT INTO public.experiment_events (user_id, experiment_key, variant, event, value)
  VALUES (v_user, p_key, v_variant, p_event, p_value);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_experiment_variant(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_experiment_event(text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_experiment_variant(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_experiment_event(text, text, numeric) TO authenticated;

-- Admin funnel summary
CREATE OR REPLACE FUNCTION public.get_experiment_funnel(p_key text)
RETURNS TABLE(variant text, event text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT variant, event, count(*)::bigint
  FROM public.experiment_events
  WHERE experiment_key = p_key
  GROUP BY variant, event
  ORDER BY variant, event;
$$;

REVOKE EXECUTE ON FUNCTION public.get_experiment_funnel(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_experiment_funnel(text) TO authenticated;
