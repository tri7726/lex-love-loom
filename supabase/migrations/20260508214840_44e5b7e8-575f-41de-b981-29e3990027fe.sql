
-- 1. grammar_mistakes: missing columns
ALTER TABLE public.grammar_mistakes
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS original_part TEXT,
  ADD COLUMN IF NOT EXISTS corrected_part TEXT;

-- 2. abuse_alerts: missing column (used by DailyQuests fallback)
ALTER TABLE public.abuse_alerts
  ADD COLUMN IF NOT EXISTS reading_minutes INTEGER DEFAULT 0;

-- 3. learning_progress per-day stats
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reading_minutes INTEGER DEFAULT 0,
  listening_minutes INTEGER DEFAULT 0,
  speaking_minutes INTEGER DEFAULT 0,
  words_learned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, date)
);
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own learning_progress" ON public.learning_progress;
CREATE POLICY "Users manage own learning_progress" ON public.learning_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. pronunciation_results
CREATE TABLE IF NOT EXISTS public.pronunciation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  original_text TEXT NOT NULL,
  recognized_text TEXT,
  score INTEGER DEFAULT 0,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pronunciation_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own pronunciation" ON public.pronunciation_results;
CREATE POLICY "Users manage own pronunciation" ON public.pronunciation_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. video_questions
CREATE TABLE IF NOT EXISTS public.video_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT,
  explanation TEXT,
  question_type TEXT DEFAULT 'comprehension',
  difficulty TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.video_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone read video_questions" ON public.video_questions;
CREATE POLICY "Anyone read video_questions" ON public.video_questions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage video_questions" ON public.video_questions;
CREATE POLICY "Admins manage video_questions" ON public.video_questions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_video_questions_video_id ON public.video_questions(video_id);

-- 6. kanji_details compatibility view
DROP VIEW IF EXISTS public.kanji_details;
CREATE VIEW public.kanji_details AS
SELECT
  id,
  character,
  meaning,
  meaning_vi,
  hanviet,
  array_to_string(onyomi, ', ') AS on_reading,
  array_to_string(kunyomi, ', ') AS kun_reading,
  grade,
  CASE
    WHEN jlpt_level ILIKE 'N%' THEN substring(jlpt_level from 2)::int
    ELSE NULL
  END AS jlpt,
  stroke_count,
  frequency,
  examples,
  created_at,
  updated_at
FROM public.kanji;
GRANT SELECT ON public.kanji_details TO anon, authenticated;
