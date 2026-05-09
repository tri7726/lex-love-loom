
-- Reader articles
CREATE TABLE IF NOT EXISTS public.reader_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  url text,
  title text NOT NULL,
  content text NOT NULL,
  word_count integer,
  source_domain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reader_articles_user ON public.reader_articles(user_id, created_at DESC);
ALTER TABLE public.reader_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ra_select_own" ON public.reader_articles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ra_insert_own" ON public.reader_articles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ra_update_own" ON public.reader_articles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ra_delete_own" ON public.reader_articles FOR DELETE USING (auth.uid() = user_id);

-- Profiles extra columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS learning_goal text,
  ADD COLUMN IF NOT EXISTS daily_minutes_target integer,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS looking_for_buddy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Public profile view (safe subset)
CREATE OR REPLACE VIEW public.v_public_profile
WITH (security_invoker = true) AS
SELECT
  user_id,
  username,
  display_name,
  avatar_url,
  banner_url,
  bio,
  jlpt_level,
  total_xp,
  current_streak,
  longest_streak,
  active_title,
  created_at
FROM public.profiles
WHERE is_public = true AND username IS NOT NULL;

GRANT SELECT ON public.v_public_profile TO anon, authenticated;

-- Buddy suggestions (precomputed)
CREATE TABLE IF NOT EXISTS public.buddy_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  suggested_user_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, suggested_user_id)
);
CREATE INDEX IF NOT EXISTS idx_buddy_user ON public.buddy_suggestions(user_id, score DESC);
ALTER TABLE public.buddy_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs_select_own" ON public.buddy_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bs_insert_own" ON public.buddy_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bs_delete_own" ON public.buddy_suggestions FOR DELETE USING (auth.uid() = user_id);

-- Live buddy matches (no precompute needed)
CREATE OR REPLACE FUNCTION public.find_buddy_matches(_limit integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  jlpt_level text,
  learning_goal text,
  daily_minutes_target integer,
  timezone text,
  current_streak integer,
  total_xp integer,
  match_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me_level text;
  me_goal text;
  me_minutes integer;
  me_tz text;
BEGIN
  SELECT jlpt_level, learning_goal, daily_minutes_target, timezone
  INTO me_level, me_goal, me_minutes, me_tz
  FROM public.profiles WHERE profiles.user_id = auth.uid();

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.jlpt_level,
    p.learning_goal,
    p.daily_minutes_target,
    p.timezone,
    p.current_streak,
    p.total_xp,
    ( CASE WHEN p.jlpt_level = me_level THEN 3 ELSE 0 END
    + CASE WHEN p.learning_goal = me_goal AND me_goal IS NOT NULL THEN 2 ELSE 0 END
    + CASE WHEN p.timezone = me_tz AND me_tz IS NOT NULL THEN 1 ELSE 0 END
    + CASE WHEN p.daily_minutes_target IS NOT NULL AND me_minutes IS NOT NULL
        AND abs(p.daily_minutes_target - me_minutes) <= 15 THEN 1 ELSE 0 END
    )::numeric AS match_score
  FROM public.profiles p
  WHERE p.looking_for_buddy = true
    AND p.user_id <> auth.uid()
  ORDER BY match_score DESC, p.current_streak DESC
  LIMIT _limit;
END;
$$;
