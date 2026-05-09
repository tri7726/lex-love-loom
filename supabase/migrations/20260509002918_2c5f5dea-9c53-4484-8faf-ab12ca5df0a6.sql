-- Add user_id to reading_passages for personal vs system passages
ALTER TABLE public.reading_passages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reading_passages_user_id ON public.reading_passages(user_id);

-- Refresh RLS policies
DROP POLICY IF EXISTS "Anyone read passages" ON public.reading_passages;
DROP POLICY IF EXISTS "Read system or own passages" ON public.reading_passages;
DROP POLICY IF EXISTS "Insert own passages" ON public.reading_passages;
DROP POLICY IF EXISTS "Update own passages" ON public.reading_passages;
DROP POLICY IF EXISTS "Delete own passages" ON public.reading_passages;

CREATE POLICY "Read system or own passages"
  ON public.reading_passages FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Insert own passages"
  ON public.reading_passages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR (user_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Update own passages"
  ON public.reading_passages FOR UPDATE
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Delete own passages"
  ON public.reading_passages FOR DELETE
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));