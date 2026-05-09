
CREATE TABLE IF NOT EXISTS public.user_weakness_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pattern_key text NOT NULL,
  category text NOT NULL,
  label text NOT NULL,
  score numeric NOT NULL DEFAULT 1,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  jlpt_level text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, pattern_key)
);

CREATE INDEX IF NOT EXISTS idx_uwp_user_score ON public.user_weakness_patterns(user_id, score DESC);

ALTER TABLE public.user_weakness_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uwp_select_own" ON public.user_weakness_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uwp_insert_own" ON public.user_weakness_patterns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uwp_update_own" ON public.user_weakness_patterns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "uwp_delete_own" ON public.user_weakness_patterns FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_uwp_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_uwp_updated_at
  BEFORE UPDATE ON public.user_weakness_patterns
  FOR EACH ROW EXECUTE FUNCTION public.touch_uwp_updated_at();

CREATE OR REPLACE FUNCTION public.decay_weakness_score(_pattern_key text, _delta numeric DEFAULT 0.2)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_weakness_patterns
  SET score = GREATEST(0, score - _delta),
      last_seen_at = now()
  WHERE user_id = auth.uid() AND pattern_key = _pattern_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_adaptive_review_queue(_limit integer DEFAULT 20)
RETURNS TABLE (
  source text,
  item_id uuid,
  word text,
  reading text,
  meaning text,
  jlpt_level text,
  injected_reason text,
  pattern_key text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  due_count int := GREATEST(1, (_limit * 7) / 10);
  inject_count int := _limit - due_count;
BEGIN
  RETURN QUERY
  (
    SELECT 'fsrs'::text, f.id, f.word, f.reading, f.meaning, f.jlpt_level,
           NULL::text, NULL::text
    FROM public.flashcards f
    WHERE f.user_id = uid
      AND (f.due IS NULL OR f.due <= now())
    ORDER BY COALESCE(f.due, f.created_at) ASC
    LIMIT due_count
  )
  UNION ALL
  (
    SELECT 'weakness'::text, f.id, f.word, f.reading, f.meaning, f.jlpt_level,
           p.label, p.pattern_key
    FROM public.user_weakness_patterns p
    JOIN LATERAL (
      SELECT * FROM public.flashcards ff
      WHERE ff.user_id = uid
        AND (p.jlpt_level IS NULL OR ff.jlpt_level = p.jlpt_level)
      ORDER BY random()
      LIMIT 2
    ) f ON true
    WHERE p.user_id = uid AND p.score > 0
    ORDER BY p.score DESC
    LIMIT inject_count
  );
END;
$$;
