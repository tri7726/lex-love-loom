-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: LEARNING — Minna No Nihongo System
-- Gộp từ: 20260501213926_cf845a59-bf9b-490c-a69e-85d042bccfd3
--         20260502111158_bf1eea33-0f3f-4204-9ab0-679cb9183bd3
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.minna_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook TEXT NOT NULL DEFAULT 'minna_n5',
  lesson_number INTEGER NOT NULL,
  title_jp TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📖',
  color TEXT DEFAULT '#3b82f6',
  jlpt_level TEXT DEFAULT 'N5',
  word_count INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT minna_lessons_textbook_lesson_unique UNIQUE(textbook, lesson_number)
);

CREATE TABLE IF NOT EXISTS public.minna_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.minna_lessons(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  textbook TEXT NOT NULL DEFAULT 'minna_n5',
  kanji TEXT,
  word TEXT NOT NULL,
  kana TEXT NOT NULL,
  romaji TEXT,
  hanviet TEXT,
  meaning_vi TEXT NOT NULL,
  meaning_en TEXT,
  example_jp TEXT,
  example_vi TEXT,
  example_en TEXT,
  part_of_speech TEXT,
  jlpt_level TEXT DEFAULT 'N5',
  tags TEXT[] DEFAULT '{}',
  audio_url TEXT,
  image_url TEXT,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_vocabulary_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES public.minna_vocabulary(id) ON DELETE CASCADE,
  mastery_level SMALLINT NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_earned INTEGER NOT NULL DEFAULT 0,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uvp_user_vocab_unique UNIQUE(user_id, vocabulary_id)
);

CREATE INDEX IF NOT EXISTS idx_minna_vocab_lesson ON public.minna_vocabulary(lesson_id);
CREATE INDEX IF NOT EXISTS idx_minna_vocab_lesson_num ON public.minna_vocabulary(textbook, lesson_number);
CREATE INDEX IF NOT EXISTS idx_uvp_user_next ON public.user_vocabulary_progress(user_id, next_review_at);

ALTER TABLE public.minna_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minna_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocabulary_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lessons readable" ON public.minna_lessons FOR SELECT USING (true);
CREATE POLICY "Vocab readable" ON public.minna_vocabulary FOR SELECT USING (true);
CREATE POLICY "Users view own progress" ON public.user_vocabulary_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.user_vocabulary_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.user_vocabulary_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own progress" ON public.user_vocabulary_progress FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_minna_lesson_word_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  IF (TG_OP = 'INSERT') AND NEW.lesson_id IS NOT NULL THEN
    UPDATE public.minna_lessons SET word_count = word_count + 1 WHERE id = NEW.lesson_id;
  ELSIF (TG_OP = 'DELETE') AND OLD.lesson_id IS NOT NULL THEN
    UPDATE public.minna_lessons SET word_count = GREATEST(0, word_count - 1) WHERE id = OLD.lesson_id;
  END IF;
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_minna_vocab_count ON public.minna_vocabulary;
CREATE TRIGGER trg_minna_vocab_count AFTER INSERT OR DELETE ON public.minna_vocabulary
  FOR EACH ROW EXECUTE FUNCTION public.update_minna_lesson_word_count();

CREATE OR REPLACE FUNCTION public.update_vocab_progress(p_vocabulary_id UUID, p_quality INTEGER)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_user_id UUID := auth.uid(); v_prog public.user_vocabulary_progress; v_new_interval INTEGER; v_new_ef REAL; v_new_reps INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_prog FROM public.user_vocabulary_progress WHERE user_id = v_user_id AND vocabulary_id = p_vocabulary_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_vocabulary_progress (user_id, vocabulary_id) VALUES (v_user_id, p_vocabulary_id) RETURNING * INTO v_prog;
  END IF;
  
  IF p_quality >= 3 THEN
    IF v_prog.repetitions = 0 THEN v_new_interval := 1;
    ELSIF v_prog.repetitions = 1 THEN v_new_interval := 6;
    ELSE v_new_interval := ROUND(v_prog.interval_days * v_prog.ease_factor); END IF;
    v_new_reps := v_prog.repetitions + 1;
    v_new_ef := v_prog.ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
  ELSE
    v_new_interval := 1; v_new_reps := 0; v_new_ef := v_prog.ease_factor;
  END IF;
  v_new_ef := GREATEST(1.3, v_new_ef);
  
  UPDATE public.user_vocabulary_progress SET
    ease_factor = v_new_ef, interval_days = v_new_interval, repetitions = v_new_reps,
    mastery_level = LEAST(5, GREATEST(0, v_new_reps))::SMALLINT,
    last_reviewed_at = NOW(), next_review_at = NOW() + (v_new_interval || ' days')::INTERVAL,
    correct_count = correct_count + CASE WHEN p_quality >= 3 THEN 1 ELSE 0 END,
    incorrect_count = incorrect_count + CASE WHEN p_quality < 3 THEN 1 ELSE 0 END,
    xp_earned = xp_earned + CASE WHEN p_quality >= 3 THEN 10 ELSE 2 END
  WHERE user_id = v_user_id AND vocabulary_id = p_vocabulary_id
  RETURNING * INTO v_prog;
  
  RETURN row_to_json(v_prog);
END;
$fn$;
