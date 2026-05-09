
CREATE TABLE IF NOT EXISTS public.listening_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  audio_url text NOT NULL,
  transcript text NOT NULL,
  translation text,
  jlpt_level text,
  type text NOT NULL DEFAULT 'speed', -- speed | fill_blank | dictation
  duration_seconds integer,
  source text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listening_exercises_level ON public.listening_exercises(jlpt_level);
CREATE INDEX IF NOT EXISTS idx_listening_exercises_type ON public.listening_exercises(type);

ALTER TABLE public.listening_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "le_select_authenticated" ON public.listening_exercises
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "le_insert_admin_or_owner" ON public.listening_exercises
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "le_update_admin_or_owner" ON public.listening_exercises
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "le_delete_admin_or_owner" ON public.listening_exercises
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.user_listening_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_id uuid NOT NULL REFERENCES public.listening_exercises(id) ON DELETE CASCADE,
  mode text NOT NULL,            -- speed | fill_blank | dictation
  score integer NOT NULL DEFAULT 0,
  playback_rate numeric,
  user_input text,
  mistakes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ula_user_created ON public.user_listening_attempts(user_id, created_at DESC);

ALTER TABLE public.user_listening_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ula_select_own" ON public.user_listening_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ula_insert_own" ON public.user_listening_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ula_update_own" ON public.user_listening_attempts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ula_delete_own" ON public.user_listening_attempts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
