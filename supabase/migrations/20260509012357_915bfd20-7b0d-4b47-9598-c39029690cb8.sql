
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.pitch_accent_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  reading text NOT NULL,
  downstep int NOT NULL,
  alternates int[],
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (word, reading)
);
CREATE INDEX IF NOT EXISTS idx_pao_word ON public.pitch_accent_overrides (word);
ALTER TABLE public.pitch_accent_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pitch overrides" ON public.pitch_accent_overrides FOR SELECT USING (true);
CREATE POLICY "Admins can insert pitch overrides" ON public.pitch_accent_overrides FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pitch overrides" ON public.pitch_accent_overrides FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pitch overrides" ON public.pitch_accent_overrides FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_pao_updated_at BEFORE UPDATE ON public.pitch_accent_overrides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TABLE IF NOT EXISTS public.analysis_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature text NOT NULL,
  event text NOT NULL,
  reason text,
  word text,
  reading text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telemetry_feature_event ON public.analysis_telemetry (feature, event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_word ON public.analysis_telemetry (word);
ALTER TABLE public.analysis_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert telemetry" ON public.analysis_telemetry FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read telemetry" ON public.analysis_telemetry FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete telemetry" ON public.analysis_telemetry FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.analysis_history ADD COLUMN IF NOT EXISTS schema_version int NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_analysis_history_schema_version ON public.analysis_history (schema_version);

CREATE OR REPLACE FUNCTION public.auto_grant_admin_to_seed_emails()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IN ('phamdjj6@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_grant_admin ON auth.users;
CREATE TRIGGER trg_auto_grant_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin_to_seed_emails();
