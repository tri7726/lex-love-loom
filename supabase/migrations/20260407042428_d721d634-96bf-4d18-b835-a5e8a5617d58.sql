
-- 1. Create user_evolved_skills table
CREATE TABLE IF NOT EXISTS public.user_evolved_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'vocabulary',
  status TEXT NOT NULL DEFAULT 'discovered',
  challenge_data JSONB DEFAULT '{}',
  xp_reward INTEGER DEFAULT 50,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_evolved_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evolved skills"
  ON public.user_evolved_skills FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own evolved skills"
  ON public.user_evolved_skills FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert evolved skills"
  ON public.user_evolved_skills FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert achievements"
  ON public.user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (true);
