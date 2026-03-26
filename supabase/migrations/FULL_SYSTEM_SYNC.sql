-- ============================================================
-- 🚀 FULL SYSTEM SYNC MIGRATION (Phase 9 & 10)
-- Dashboard → SQL Editor → New query → Paste → Run
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES UPDATES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_endpoint TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_p256dh TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_auth TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_reminder_time TEXT DEFAULT '20:00';

-- 2. MOCK EXAM SYSTEM
CREATE TABLE IF NOT EXISTS public.mock_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'N5',
  duration INTEGER NOT NULL DEFAULT 120,
  difficulty TEXT DEFAULT 'Medium',
  description TEXT,
  passing_total INTEGER DEFAULT 90,
  section_benchmarks JSONB DEFAULT '{"vocabulary_grammar":19,"reading":19,"listening":19}',
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mock_exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'Kiến thức ngôn ngữ',
  section_type TEXT NOT NULL DEFAULT 'vocabulary_grammar',
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  image_url TEXT,
  passage TEXT,
  audio_url TEXT,
  point_weight INTEGER DEFAULT 2,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mock_exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.mock_exams(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 180,
  time_taken INTEGER DEFAULT 0,
  section_scores JSONB,
  passed BOOLEAN DEFAULT false,
  level TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SOCIAL & DUEL SYSTEM
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'completed'
  challenger_score INTEGER DEFAULT 0,
  opponent_score INTEGER DEFAULT 0,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS public.analysis_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  analysis JSONB NOT NULL,
  engine TEXT DEFAULT 'gemini',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for analysis_history
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own history" ON public.analysis_history FOR ALL USING (auth.uid() = user_id);

-- 4. XP & ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 0
);

-- 5. UNIFIED AI HUB CONTENT
CREATE TABLE IF NOT EXISTS public.speaking_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  level TEXT DEFAULT 'N5',
  category TEXT DEFAULT 'daily',
  sentences JSONB NOT NULL,
  icon TEXT DEFAULT 'Sparkles',
  color TEXT DEFAULT 'bg-emerald-500',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roleplay_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  persona TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  first_message TEXT NOT NULL,
  difficulty TEXT DEFAULT 'Easy',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaking_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roleplay_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read exams" ON public.mock_exams FOR SELECT USING (is_published = true);
CREATE POLICY "Public read questions" ON public.mock_exam_questions FOR SELECT USING (true);
CREATE POLICY "Users manage own results" ON public.mock_exam_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own challenges" ON public.challenges FOR ALL USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
CREATE POLICY "Public read content" ON public.speaking_lessons FOR SELECT USING (true);
CREATE POLICY "Public read scenarios" ON public.roleplay_scenarios FOR SELECT USING (true);

-- SEED DATA
INSERT INTO public.speaking_lessons (title, level, sentences) VALUES 
('Chào hỏi hàng ngày', 'N5', '[{"id":"1","japanese":"おはよう","vietnamese":"Chào buổi sáng"}]')
ON CONFLICT DO NOTHING;

INSERT INTO public.roleplay_scenarios (title, persona, system_prompt, first_message) VALUES
('Tại Nhà Hàng', 'Phục vụ', 'Bạn là một phục vụ nhà hàng Nhật Bản...', 'いらっしゃいませ。何名様ですか？')
ON CONFLICT DO NOTHING;
