-- =====================================================
-- Phase 3: Minna no Nihongo Vocabulary System
-- Created: 2026-04-27
-- =====================================================

-- 1. Function cho trigger updated_at (đã có trong repo nhưng thêm IF NOT EXISTS để an toàn)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Bảng Từ vựng Minna no Nihongo (Reference Data)
CREATE TABLE IF NOT EXISTS vocabulary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lesson INTEGER NOT NULL,
  kanji TEXT,                    -- Kanji chính (có thể null)
  word TEXT NOT NULL,            -- Từ hiển thị (Kanji hoặc Kana)
  kana TEXT NOT NULL,            -- Hiragana/Katakana
  romaji TEXT,
  meaning_vi TEXT NOT NULL,
  meaning_en TEXT,
  example_jp TEXT,
  example_vi TEXT,
  part_of_speech TEXT,           -- noun, verb-v1, i-adj, na-adj, pronoun...
  jlpt_level TEXT DEFAULT 'N5',
  tags TEXT[],                   -- ['personal', 'job', 'greeting']
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng Tiến độ người dùng + SRS
CREATE TABLE IF NOT EXISTS user_vocabulary_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vocabulary_id UUID REFERENCES vocabulary(id) ON DELETE CASCADE NOT NULL,

  -- SRS (SM-2 Algorithm)
  interval INTEGER DEFAULT 1,
  ease_factor FLOAT DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  mastery_level INTEGER DEFAULT 0,     -- 0=new, 1-4=learning, 5=mastered
  last_reviewed TIMESTAMPTZ,
  next_review TIMESTAMPTZ DEFAULT NOW(),

  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,

  UNIQUE(user_id, vocabulary_id)
);

-- Trigger cho updated_at
DROP TRIGGER IF EXISTS update_vocabulary_updated_at ON vocabulary;
CREATE TRIGGER update_vocabulary_updated_at
  BEFORE UPDATE ON vocabulary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes (Tối ưu hóa truy vấn)
CREATE INDEX IF NOT EXISTS idx_user_vocab_next_review ON user_vocabulary_progress (user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_vocab_lesson ON vocabulary (lesson);
CREATE INDEX IF NOT EXISTS idx_vocab_jlpt ON vocabulary (jlpt_level);
CREATE INDEX IF NOT EXISTS idx_vocab_kanji ON vocabulary (kanji) WHERE kanji IS NOT NULL;

-- RLS (Security)
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vocabulary_progress ENABLE ROW LEVEL SECURITY;

-- Ai cũng có thể xem từ vựng
CREATE POLICY "Public can view vocabulary" ON vocabulary FOR SELECT USING (true);

-- User chỉ có thể xem và sửa tiến độ của chính mình
CREATE POLICY "Users can view own progress" ON user_vocabulary_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_vocabulary_progress FOR ALL USING (auth.uid() = user_id);
