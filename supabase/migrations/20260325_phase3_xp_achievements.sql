-- =====================================================
-- Phase 3: XP Events + Achievements System
-- =====================================================

-- 1. XP Events table — log mọi XP earning
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'quiz', 'flashcard', 'duel', 'reading', 'speaking', 'streak_bonus', 'achievement'
  amount INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_id ON xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_created_at ON xp_events(user_id, created_at DESC);

ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own xp_events" ON xp_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp_events" ON xp_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Achievements definition table
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  category TEXT NOT NULL DEFAULT 'general', -- 'streak', 'xp', 'flashcard', 'social', 'quiz', 'speaking'
  condition_type TEXT NOT NULL, -- 'xp_total', 'streak_days', 'flashcard_count', 'quiz_score', 'duel_wins', 'speaking_sessions'
  condition_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User achievements — unlocked records
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Add total_xp column alias + streak columns to profiles if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- 5. Seed achievement definitions
INSERT INTO achievements (id, title, description, icon, category, condition_type, condition_value, xp_reward) VALUES
  ('first_steps',       'Bước đầu tiên',      'Kiếm được XP đầu tiên',              '⭐', 'general',  'xp_total',          1,    50),
  ('xp_100',            'Học viên mới',        'Đạt 100 XP',                          '📚', 'xp',       'xp_total',          100,  50),
  ('xp_500',            'Chăm chỉ',            'Đạt 500 XP',                          '💪', 'xp',       'xp_total',          500,  100),
  ('xp_1000',           'XP Hunter',           'Đạt 1,000 XP',                        '🎯', 'xp',       'xp_total',          1000, 150),
  ('xp_5000',           'XP Legend',           'Đạt 5,000 XP',                        '👑', 'xp',       'xp_total',          5000, 300),
  ('xp_10000',          'Huyền thoại',         'Đạt 10,000 XP',                       '🌟', 'xp',       'xp_total',          10000,500),
  ('streak_3',          'Khởi đầu tốt',        'Duy trì streak 3 ngày',               '🔥', 'streak',   'streak_days',       3,    30),
  ('streak_7',          'On Fire',             'Duy trì streak 7 ngày',               '🔥', 'streak',   'streak_days',       7,    75),
  ('streak_30',         'Dedicated Learner',   'Duy trì streak 30 ngày',              '🏆', 'streak',   'streak_days',       30,   200),
  ('streak_100',        'Bất khuất',           'Duy trì streak 100 ngày',             '💎', 'streak',   'streak_days',       100,  500),
  ('flashcard_10',      'Tập tành',            'Tạo 10 flashcard',                    '🃏', 'flashcard','flashcard_count',   10,   30),
  ('flashcard_50',      'Bộ sưu tập',          'Tạo 50 flashcard',                    '📖', 'flashcard','flashcard_count',   50,   75),
  ('flashcard_100',     'Vocabulary Master',   'Tạo 100 flashcard',                   '🎓', 'flashcard','flashcard_count',   100,  150),
  ('flashcard_500',     'Từ điển sống',        'Tạo 500 flashcard',                   '📕', 'flashcard','flashcard_count',   500,  400),
  ('quiz_perfect',      'Hoàn hảo',            'Đạt 100% trong một bài quiz',         '💯', 'quiz',     'quiz_perfect',      1,    100),
  ('quiz_10',           'Quiz Addict',         'Hoàn thành 10 bài quiz',              '⚡', 'quiz',     'quiz_count',        10,   75),
  ('duel_first',        'Chiến binh',          'Thắng trận duel đầu tiên',            '⚔️', 'social',   'duel_wins',         1,    100),
  ('duel_10',           'Đấu sĩ',              'Thắng 10 trận duel',                  '🗡️', 'social',   'duel_wins',         10,   250),
  ('speaking_first',    'Mở miệng',            'Hoàn thành buổi luyện nói đầu tiên',  '🎤', 'speaking', 'speaking_sessions', 1,    50),
  ('speaking_10',       'Diễn giả',            'Hoàn thành 10 buổi luyện nói',        '🎙️', 'speaking', 'speaking_sessions', 10,   150)
ON CONFLICT (id) DO NOTHING;
