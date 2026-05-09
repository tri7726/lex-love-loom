
-- saved_vocabulary
CREATE TABLE IF NOT EXISTS public.saved_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  word TEXT NOT NULL,
  reading TEXT,
  meaning TEXT NOT NULL,
  example_sentence TEXT,
  mastery_level INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, word)
);
ALTER TABLE public.saved_vocabulary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own saved_vocabulary" ON public.saved_vocabulary;
CREATE POLICY "Users manage own saved_vocabulary" ON public.saved_vocabulary
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- reading_passages user_id
ALTER TABLE public.reading_passages
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- speaking_lessons (placeholder)
CREATE TABLE IF NOT EXISTS public.speaking_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  jlpt_level TEXT DEFAULT 'N5',
  content JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.speaking_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone read speaking_lessons" ON public.speaking_lessons;
CREATE POLICY "Anyone read speaking_lessons" ON public.speaking_lessons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages speaking_lessons" ON public.speaking_lessons;
CREATE POLICY "Admin manages speaking_lessons" ON public.speaking_lessons
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ai_conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  mode TEXT DEFAULT 'chat',
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users manage own ai_conversations" ON public.ai_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- get_due_flashcards_count RPC
CREATE OR REPLACE FUNCTION public.get_due_flashcards_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.flashcards
  WHERE user_id = _user_id
    AND (next_review_date <= now() OR due <= now());
$$;
REVOKE EXECUTE ON FUNCTION public.get_due_flashcards_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_due_flashcards_count(uuid) TO authenticated;
