-- =====================================================
-- Flashcard Management System with SRS
-- 3-Tier Structure: Course Modules → Folders → Flashcards
-- Created: 2026-02-07
-- =====================================================

-- =====================================================
-- 1. COURSE MODULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Module info
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📚',
  color TEXT DEFAULT '#3b82f6',
  order_index INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_modules_user_id ON course_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_order ON course_modules(user_id, order_index);

-- RLS
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own modules"
  ON course_modules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own modules"
  ON course_modules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own modules"
  ON course_modules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own modules"
  ON course_modules FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 2. VOCABULARY FOLDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vocabulary_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES vocabulary_folders(id) ON DELETE CASCADE,
  
  -- Folder info
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#10b981',
  order_index INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT no_self_reference CHECK (id != parent_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON vocabulary_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_module_id ON vocabulary_folders(module_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON vocabulary_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_order ON vocabulary_folders(user_id, order_index);

-- RLS
ALTER TABLE vocabulary_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders"
  ON vocabulary_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
  ON vocabulary_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON vocabulary_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON vocabulary_folders FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. FLASHCARDS TABLE (with SRS)
-- =====================================================
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  word TEXT NOT NULL,
  reading TEXT,
  hanviet TEXT,
  meaning TEXT NOT NULL,
  example_sentence TEXT,
  example_translation TEXT,
  audio_url TEXT,
  image_url TEXT,
  notes TEXT,
  
  -- Metadata
  jlpt_level TEXT,
  word_type TEXT,
  tags TEXT[],
  
  -- SRS Fields (SuperMemo SM-2)
  ease_factor FLOAT DEFAULT 2.5,
  interval INT DEFAULT 0,
  repetitions INT DEFAULT 0,
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_flashcards_jlpt ON flashcards(jlpt_level);
CREATE INDEX IF NOT EXISTS idx_flashcards_word ON flashcards(word);

-- RLS
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flashcards"
  ON flashcards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flashcards"
  ON flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flashcards"
  ON flashcards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcards"
  ON flashcards FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. VOCABULARY FOLDER ITEMS (Junction Table)
-- =====================================================
CREATE TABLE IF NOT EXISTS vocabulary_folder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES vocabulary_folders(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  
  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),
  order_index INT DEFAULT 0,
  
  -- Unique constraint: flashcard can only be added once per folder
  UNIQUE (folder_id, flashcard_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_folder_items_folder ON vocabulary_folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_items_flashcard ON vocabulary_folder_items(flashcard_id);

-- RLS
ALTER TABLE vocabulary_folder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folder items"
  ON vocabulary_folder_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vocabulary_folders
      WHERE id = folder_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own folder items"
  ON vocabulary_folder_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vocabulary_folders
      WHERE id = folder_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own folder items"
  ON vocabulary_folder_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM vocabulary_folders
      WHERE id = folder_id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to get flashcard count in folder
CREATE OR REPLACE FUNCTION get_folder_flashcard_count(folder_uuid UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM vocabulary_folder_items
  WHERE folder_id = folder_uuid;
$$ LANGUAGE SQL STABLE;

-- Function to get due flashcards count
CREATE OR REPLACE FUNCTION get_due_flashcards_count(user_uuid UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM flashcards
  WHERE user_id = user_uuid AND next_review_date <= NOW();
$$ LANGUAGE SQL STABLE;

-- =====================================================
-- 6. TRIGGERS FOR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_modules_updated_at
  BEFORE UPDATE ON course_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vocabulary_folders_updated_at
  BEFORE UPDATE ON vocabulary_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON flashcards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
