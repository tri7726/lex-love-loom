-- ============================================================
-- MIGRATION TỔNG HỢP — Chạy file này trong Supabase SQL Editor
-- Dashboard → SQL Editor → New query → Paste → Run
-- ============================================================

-- 1. Bảng đề thi
CREATE TABLE IF NOT EXISTS public.mock_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'N5',
  duration INTEGER NOT NULL DEFAULT 120,
  difficulty TEXT DEFAULT 'Cơ bản',
  description TEXT,
  passing_total INTEGER DEFAULT 90,
  section_benchmarks JSONB DEFAULT '{"vocabulary_grammar":19,"reading":19,"listening":19}',
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng câu hỏi đề thi
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

-- 3. Bảng kết quả thi
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

-- 4. Bảng XP events (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bảng achievements definitions
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  category TEXT NOT NULL DEFAULT 'general',
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bảng user achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- 7. Bảng friendships
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- 8. Bảng messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Bảng study squads
CREATE TABLE IF NOT EXISTS public.study_squads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Bảng squad members
CREATE TABLE IF NOT EXISTS public.squad_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id UUID NOT NULL REFERENCES public.study_squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(squad_id, user_id)
);

-- 11. Bảng challenges (1vs1)
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  challenger_score INTEGER,
  opponent_score INTEGER,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Thêm cột last_activity_date vào profiles (nếu chưa có)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- 13. Thêm cột push notification vào profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_endpoint TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_p256dh TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_auth TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_reminder_time TEXT DEFAULT '20:00';

-- ── RLS Policies ──────────────────────────────────────────────

ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- mock_exams: public read
CREATE POLICY IF NOT EXISTS "Public read exams" ON public.mock_exams FOR SELECT USING (is_published = true);
CREATE POLICY IF NOT EXISTS "Admin manage exams" ON public.mock_exams FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- mock_exam_questions: public read
CREATE POLICY IF NOT EXISTS "Public read questions" ON public.mock_exam_questions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Admin manage questions" ON public.mock_exam_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- mock_exam_results: own data
CREATE POLICY IF NOT EXISTS "Users manage own results" ON public.mock_exam_results FOR ALL USING (auth.uid() = user_id);

-- xp_events: own data
CREATE POLICY IF NOT EXISTS "Users manage own xp" ON public.xp_events FOR ALL USING (auth.uid() = user_id);

-- achievements: public read
CREATE POLICY IF NOT EXISTS "Public read achievements" ON public.achievements FOR SELECT USING (true);

-- user_achievements: own data
CREATE POLICY IF NOT EXISTS "Users manage own achievements" ON public.user_achievements FOR ALL USING (auth.uid() = user_id);

-- friendships
CREATE POLICY IF NOT EXISTS "Users manage own friendships" ON public.friendships FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- messages
CREATE POLICY IF NOT EXISTS "Users manage own messages" ON public.messages FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- squads: public read
CREATE POLICY IF NOT EXISTS "Public read squads" ON public.study_squads FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users manage own squads" ON public.study_squads FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY IF NOT EXISTS "Owners update squads" ON public.study_squads FOR UPDATE USING (auth.uid() = owner_id);

-- squad_members
CREATE POLICY IF NOT EXISTS "Users manage squad membership" ON public.squad_members FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Public read squad members" ON public.squad_members FOR SELECT USING (true);

-- challenges
CREATE POLICY IF NOT EXISTS "Users manage own challenges" ON public.challenges FOR ALL USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_xp_events_user_date ON public.xp_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_user ON public.mock_exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON public.mock_exam_questions(exam_id, order_index);
CREATE INDEX IF NOT EXISTS idx_messages_users ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_users ON public.challenges(challenger_id, opponent_id);

-- ── Seed achievements ─────────────────────────────────────────
INSERT INTO public.achievements (title, description, icon, category, condition_type, condition_value, xp_reward)
VALUES
  ('Bước đầu tiên', 'Nhận XP đầu tiên', '🌱', 'general', 'xp_total', 1, 50),
  ('Học sinh chăm chỉ', 'Đạt 1,000 XP', '⭐', 'xp', 'xp_total', 1000, 100),
  ('Chiến binh XP', 'Đạt 5,000 XP', '🔥', 'xp', 'xp_total', 5000, 200),
  ('Huyền thoại', 'Đạt 20,000 XP', '👑', 'xp', 'xp_total', 20000, 500),
  ('Streak 7 ngày', 'Học liên tục 7 ngày', '🔥', 'streak', 'streak_days', 7, 100),
  ('Streak 30 ngày', 'Học liên tục 30 ngày', '💎', 'streak', 'streak_days', 30, 300),
  ('Nhà sưu tập', 'Tạo 100 flashcard', '📚', 'flashcard', 'flashcard_count', 100, 150),
  ('Cao thủ PvP', 'Thắng 10 trận đấu', '⚔️', 'social', 'duel_wins', 10, 200),
  ('Diễn giả', 'Luyện nói 10 lần', '🎤', 'speaking', 'speaking_sessions', 10, 100)
ON CONFLICT DO NOTHING;
