-- ── PART 5.1: SECURITY & RATE LIMITS ──
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    identifier_type text NOT NULL,
    endpoint text NOT NULL,
    count integer DEFAULT 0,
    window_start timestamptz DEFAULT date_trunc('minute', now()),
    blocked_until timestamptz,
    UNIQUE(identifier, identifier_type, endpoint, window_start)
);

CREATE TABLE IF NOT EXISTS public.abuse_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    identifier_type text NOT NULL,
    reason text NOT NULL,
    details jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only rate" ON public.rate_limits;
CREATE POLICY "Service role only rate" ON public.rate_limits FOR ALL USING (false);
DROP POLICY IF EXISTS "Service role only abuse" ON public.abuse_alerts;
CREATE POLICY "Service role only abuse" ON public.abuse_alerts FOR ALL USING (false);

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
    p_id text, p_type text, p_endpoint text, p_tier text DEFAULT 'medium'
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer; v_window timestamptz := date_trunc('minute', now());
BEGIN
    INSERT INTO public.rate_limits (identifier, identifier_type, endpoint, window_start, count)
    VALUES (p_id, p_type, p_endpoint, v_window, 1)
    ON CONFLICT (identifier, identifier_type, endpoint, window_start)
    DO UPDATE SET count = rate_limits.count + 1
    RETURNING count INTO v_count;
    RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.block_identifier(
    p_id text, p_type text, p_endpoint text, p_duration interval
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.rate_limits SET blocked_until = now() + p_duration
    WHERE identifier = p_id AND identifier_type = p_type AND endpoint = p_endpoint
      AND window_start = date_trunc('minute', now());
END; $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_sensei_knowledge_content_trgm ON public.sensei_knowledge USING gin(content gin_trgm_ops);

-- ── PART 5.2: PERFORMANCE INDEXES ──
CREATE INDEX IF NOT EXISTS idx_xp_events_user_date ON public.xp_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_results_user ON public.mock_exam_results (user_id, completed_at DESC);

-- ── PART 5.3: NOTIFICATIONS ──
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_friendship_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, content, link)
    VALUES (NEW.receiver_id, 'follow', 'Bạn có một lời mời kết bạn mới!', '/friends');
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_friendship_notification ON public.friendships;
CREATE TRIGGER on_friendship_notification
AFTER INSERT ON public.friendships FOR EACH ROW
EXECUTE FUNCTION public.handle_new_friendship_notification();

-- ── PART 5.4: HELPER FUNCTIONS ──
CREATE OR REPLACE FUNCTION public.get_recommended_reading(p_user_id UUID, p_limit INT DEFAULT 3)
RETURNS TABLE (passage_id UUID, title TEXT, level TEXT, category TEXT, match_percentage FLOAT, learning_count INT, mastered_count INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH user_vocab AS (
    SELECT word, repetitions FROM public.flashcards WHERE user_id = p_user_id
  ),
  passage_vocab AS (
    SELECT id AS p_id, title AS p_title, level AS p_level, category AS p_category,
      jsonb_array_length(vocabulary) AS total_words, v->>'word' AS passage_word
    FROM public.reading_passages, jsonb_array_elements(vocabulary) AS v
    WHERE vocabulary IS NOT NULL AND jsonb_typeof(vocabulary) = 'array'
  ),
  passage_matches AS (
    SELECT pv.p_id, pv.p_title, pv.p_level, pv.p_category,
      MAX(pv.total_words) as total_words, COUNT(uv.word) AS matched_words,
      SUM(CASE WHEN uv.repetitions < 4 THEN 1 ELSE 0 END) AS learning_count,
      SUM(CASE WHEN uv.repetitions >= 4 THEN 1 ELSE 0 END) AS mastered_count
    FROM passage_vocab pv LEFT JOIN user_vocab uv ON pv.passage_word = uv.word
    GROUP BY pv.p_id, pv.p_title, pv.p_level, pv.p_category
  )
  SELECT p_id, p_title, p_level, p_category,
    COALESCE(CAST(matched_words AS FLOAT) / NULLIF(total_words, 0) * 100, 0) AS match_percentage,
    CAST(COALESCE(learning_count, 0) AS INT), CAST(COALESCE(mastered_count, 0) AS INT)
  FROM passage_matches WHERE matched_words > 0
  ORDER BY match_percentage DESC, learning_count DESC LIMIT p_limit;
END; $$;

CREATE OR REPLACE FUNCTION public.get_global_leaderboard()
RETURNS TABLE (user_id UUID, display_name TEXT, avatar_url TEXT, total_xp BIGINT, current_streak INTEGER, jlpt_level TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_monday DATE := date_trunc('week', now())::DATE;
BEGIN
  RETURN QUERY
  WITH weekly_xp AS (
    SELECT e.user_id, SUM(e.amount) as week_total
    FROM public.xp_events e WHERE e.created_at >= v_monday
    GROUP BY e.user_id
  )
  SELECT p.user_id, p.display_name, p.avatar_url,
    COALESCE(w.week_total, 0) as total_xp, p.current_streak, p.jlpt_level
  FROM public.profiles p LEFT JOIN weekly_xp w ON p.user_id = w.user_id
  ORDER BY total_xp DESC LIMIT 50;
END; $$;