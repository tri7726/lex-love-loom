-- ============================================================
-- Pet History Table
-- Records each pet a user has ever owned (archived when replaced)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pet_history (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_type      TEXT        NOT NULL,
  pet_name      TEXT,
  evolution_level INTEGER   DEFAULT 1,
  max_pet_xp    INTEGER     DEFAULT 0,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_pet_history_user_id ON public.pet_history (user_id);

-- RLS
ALTER TABLE public.pet_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pet history"
  ON public.pet_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pet history"
  ON public.pet_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
