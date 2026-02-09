-- =====================================================
-- Kanji Learning System Database Schema
-- =====================================================
-- This migration creates tables for:
-- 1. Kanji data (characters, readings, meanings, JLPT levels)
-- 2. Kanji relationships (network connections)
-- 3. Vocabulary (words using kanji)
-- 4. Textbook vocabulary mappings
-- 5. User progress tracking
-- =====================================================

-- =====================================================
-- 1. RADICALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS radicals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    radical TEXT UNIQUE NOT NULL,
    name TEXT,
    meaning_vi TEXT,
    meaning_en TEXT,
    stroke_count INTEGER,
    traditional_form TEXT,
    position TEXT CHECK (position IN ('left', 'right', 'top', 'bottom', 'enclosure', 'any')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE radicals IS 'Japanese radicals (部首) with meanings and positions';

-- =====================================================
-- 2. KANJI TABLE (Main Kanji Data)
-- =====================================================

CREATE TABLE IF NOT EXISTS kanji (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character TEXT UNIQUE NOT NULL,
    
    -- Readings
    onyomi TEXT[] DEFAULT '{}',
    kunyomi TEXT[] DEFAULT '{}',
    
    -- Meanings
    hanviet TEXT,
    meaning_vi TEXT NOT NULL,
    meaning_en TEXT,
    
    -- Classification
    jlpt_level TEXT CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
    grade INTEGER CHECK (grade >= 1 AND grade <= 8),
    frequency INTEGER,
    
    -- Structure
    radical TEXT,
    radical_id UUID REFERENCES radicals(id),
    stroke_count INTEGER NOT NULL,
    components TEXT[] DEFAULT '{}',
    
    -- Visual Data
    svg_data TEXT,
    svg_url TEXT,
    stroke_order JSONB,
    
    -- Learning Notes
    conversion_rules TEXT,
    mnemonic TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE kanji IS 'Main kanji characters with readings, meanings, and structure data';

-- Indexes for fast lookup
CREATE INDEX idx_kanji_character ON kanji(character);
CREATE INDEX idx_kanji_jlpt ON kanji(jlpt_level);
CREATE INDEX idx_kanji_radical ON kanji(radical);
CREATE INDEX idx_kanji_stroke_count ON kanji(stroke_count);
CREATE INDEX idx_kanji_frequency ON kanji(frequency);
CREATE INDEX idx_kanji_grade ON kanji(grade);

-- GIN index for array searches
CREATE INDEX idx_kanji_onyomi ON kanji USING GIN(onyomi);
CREATE INDEX idx_kanji_kunyomi ON kanji USING GIN(kunyomi);
CREATE INDEX idx_kanji_components ON kanji USING GIN(components);

-- Full-text search index for meanings
CREATE INDEX idx_kanji_meaning_vi ON kanji USING GIN(to_tsvector('simple', meaning_vi));

-- =====================================================
-- 3. KANJI RELATIONSHIPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kanji_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kanji_id UUID REFERENCES kanji(id) ON DELETE CASCADE,
    related_kanji_id UUID REFERENCES kanji(id) ON DELETE CASCADE,
    
    -- Relationship metadata
    relationship_type TEXT NOT NULL CHECK (relationship_type IN (
        'radical',      -- Same radical
        'reading',      -- Same reading (on/kun)
        'meaning',      -- Similar meaning
        'component',    -- Uses as component
        'compound',     -- Forms compound together
        'antonym',      -- Opposite meaning
        'synonym'       -- Similar meaning
    )),
    strength REAL DEFAULT 1.0 CHECK (strength >= 0 AND strength <= 1),
    reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(kanji_id, related_kanji_id, relationship_type)
);

COMMENT ON TABLE kanji_relationships IS 'Network of relationships between kanji characters';

-- Indexes
CREATE INDEX idx_kanji_rel_kanji ON kanji_relationships(kanji_id);
CREATE INDEX idx_kanji_rel_related ON kanji_relationships(related_kanji_id);
CREATE INDEX idx_kanji_rel_type ON kanji_relationships(relationship_type);
CREATE INDEX idx_kanji_rel_strength ON kanji_relationships(strength DESC);

-- =====================================================
-- 4. VOCABULARY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kanji_vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL,
    reading TEXT NOT NULL,
    hanviet TEXT,
    
    -- Meanings
    meaning_vi TEXT NOT NULL,
    meaning_en TEXT,
    
    -- Classification
    jlpt_level TEXT CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
    part_of_speech TEXT,
    
    -- Examples
    example_sentence TEXT,
    example_translation TEXT,
    
    -- Audio
    audio_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(word, reading)
);

COMMENT ON TABLE kanji_vocabulary IS 'Japanese vocabulary words';

-- Indexes
CREATE INDEX idx_vocab_word ON kanji_vocabulary(word);
CREATE INDEX idx_vocab_jlpt ON kanji_vocabulary(jlpt_level);
CREATE INDEX idx_vocab_meaning ON kanji_vocabulary USING GIN(to_tsvector('simple', meaning_vi));

-- =====================================================
-- 5. KANJI-VOCABULARY JUNCTION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kanji_vocab_junction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kanji_id UUID REFERENCES kanji(id) ON DELETE CASCADE,
    vocabulary_id UUID REFERENCES kanji_vocabulary(id) ON DELETE CASCADE,
    position INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(kanji_id, vocabulary_id)
);

COMMENT ON TABLE kanji_vocab_junction IS 'Links kanji to vocabulary words that use them';

CREATE INDEX idx_kanji_vocab_kanji ON kanji_vocab_junction(kanji_id);
CREATE INDEX idx_kanji_vocab_vocab ON kanji_vocab_junction(vocabulary_id);

-- =====================================================
-- 6. TEXTBOOK VOCABULARY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS textbook_vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vocabulary_id UUID REFERENCES kanji_vocabulary(id) ON DELETE CASCADE,
    
    textbook TEXT NOT NULL CHECK (textbook IN (
        'minna',
        'genki',
        'marugoto',
        'tobira',
        'try'
    )),
    lesson_number INTEGER,
    page_number INTEGER,
    unit_title TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(vocabulary_id, textbook, lesson_number)
);

COMMENT ON TABLE textbook_vocabulary IS 'Maps vocabulary to specific textbook lessons';

CREATE INDEX idx_textbook_vocab_textbook ON textbook_vocabulary(textbook);
CREATE INDEX idx_textbook_vocab_lesson ON textbook_vocabulary(textbook, lesson_number);

-- =====================================================
-- 7. USER KANJI PROGRESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_kanji_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    kanji_id UUID REFERENCES kanji(id) ON DELETE CASCADE,
    
    -- SRS (Spaced Repetition System)
    ease_factor REAL DEFAULT 2.5,
    interval INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    last_review TIMESTAMPTZ,
    next_review TIMESTAMPTZ DEFAULT NOW(),
    
    -- Recognition tracking
    recognition_correct INTEGER DEFAULT 0,
    recognition_total INTEGER DEFAULT 0,
    recognition_accuracy REAL GENERATED ALWAYS AS (
        CASE 
            WHEN recognition_total > 0 
            THEN ROUND((recognition_correct::NUMERIC / recognition_total::NUMERIC * 100)::NUMERIC, 2)
            ELSE 0 
        END
    ) STORED,
    
    -- Writing tracking
    writing_attempts INTEGER DEFAULT 0,
    writing_total_score REAL DEFAULT 0,
    writing_accuracy REAL GENERATED ALWAYS AS (
        CASE 
            WHEN writing_attempts > 0 
            THEN ROUND((writing_total_score / writing_attempts)::NUMERIC, 2)
            ELSE 0 
        END
    ) STORED,
    last_writing_score REAL,
    
    -- Status
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'learning', 'review', 'mastered')),
    starred BOOLEAN DEFAULT false,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, kanji_id)
);

COMMENT ON TABLE user_kanji_progress IS 'Tracks individual user progress for each kanji with SRS';

CREATE INDEX idx_user_kanji_progress_user ON user_kanji_progress(user_id);
CREATE INDEX idx_user_kanji_progress_next_review ON user_kanji_progress(user_id, next_review);
CREATE INDEX idx_user_kanji_progress_status ON user_kanji_progress(user_id, status);
CREATE INDEX idx_user_kanji_progress_starred ON user_kanji_progress(user_id, starred) WHERE starred = true;

-- =====================================================
-- 8. USER WRITING SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_writing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    kanji_id UUID REFERENCES kanji(id) ON DELETE CASCADE,
    
    -- Stroke data
    strokes_drawn JSONB,
    stroke_count INTEGER,
    stroke_order_correct BOOLEAN,
    accuracy_score REAL,
    
    -- Timing
    time_taken INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_writing_sessions IS 'Historical record of writing practice sessions';

CREATE INDEX idx_writing_sessions_user ON user_writing_sessions(user_id, created_at DESC);
CREATE INDEX idx_writing_sessions_kanji ON user_writing_sessions(kanji_id, created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE user_kanji_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_writing_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_kanji_progress
CREATE POLICY "Users can view own kanji progress"
    ON user_kanji_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kanji progress"
    ON user_kanji_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kanji progress"
    ON user_kanji_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for user_writing_sessions
CREATE POLICY "Users can view own writing sessions"
    ON user_writing_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own writing sessions"
    ON user_writing_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Public read access for kanji, vocabulary, radicals, relationships
ALTER TABLE kanji ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanji_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE radicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanji_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanji_vocab_junction ENABLE ROW LEVEL SECURITY;
ALTER TABLE textbook_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kanji are publicly readable"
    ON kanji FOR SELECT
    USING (true);

CREATE POLICY "Vocabulary is publicly readable"
    ON kanji_vocabulary FOR SELECT
    USING (true);

CREATE POLICY "Radicals are publicly readable"
    ON radicals FOR SELECT
    USING (true);

CREATE POLICY "Kanji relationships are publicly readable"
    ON kanji_relationships FOR SELECT
    USING (true);

CREATE POLICY "Kanji-vocab junction is publicly readable"
    ON kanji_vocab_junction FOR SELECT
    USING (true);

CREATE POLICY "Textbook vocabulary is publicly readable"
    ON textbook_vocabulary FOR SELECT
    USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get kanji with all related data
CREATE OR REPLACE FUNCTION get_kanji_details(kanji_char TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'kanji', row_to_json(k.*),
        'vocabulary_count', (
            SELECT COUNT(*)
            FROM kanji_vocab_junction kvj
            WHERE kvj.kanji_id = k.id
        ),
        'related_kanji_count', (
            SELECT COUNT(*)
            FROM kanji_relationships kr
            WHERE kr.kanji_id = k.id
        )
    )
    INTO result
    FROM kanji k
    WHERE k.character = kanji_char;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update kanji progress after review
CREATE OR REPLACE FUNCTION update_kanji_progress(
    p_user_id UUID,
    p_kanji_id UUID,
    p_quality INTEGER,
    p_writing_score REAL DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_progress RECORD;
    v_new_interval INTEGER;
    v_new_ease_factor REAL;
    v_new_repetitions INTEGER;
BEGIN
    -- Get current progress
    SELECT * INTO v_progress
    FROM user_kanji_progress
    WHERE user_id = p_user_id AND kanji_id = p_kanji_id;
    
    -- If no progress exists, create it
    IF NOT FOUND THEN
        INSERT INTO user_kanji_progress (user_id, kanji_id)
        VALUES (p_user_id, p_kanji_id)
        RETURNING * INTO v_progress;
    END IF;
    
    -- SM-2 Algorithm
    IF p_quality >= 3 THEN
        -- Correct answer
        IF v_progress.repetitions = 0 THEN
            v_new_interval := 1;
        ELSIF v_progress.repetitions = 1 THEN
            v_new_interval := 6;
        ELSE
            v_new_interval := ROUND(v_progress.interval * v_progress.ease_factor);
        END IF;
        
        v_new_repetitions := v_progress.repetitions + 1;
        v_new_ease_factor := v_progress.ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
    ELSE
        -- Incorrect answer - reset
        v_new_interval := 1;
        v_new_repetitions := 0;
        v_new_ease_factor := v_progress.ease_factor;
    END IF;
    
    -- Clamp ease factor
    v_new_ease_factor := GREATEST(1.3, v_new_ease_factor);
    
    -- Update progress
    UPDATE user_kanji_progress
    SET
        ease_factor = v_new_ease_factor,
        interval = v_new_interval,
        repetitions = v_new_repetitions,
        last_review = NOW(),
        next_review = NOW() + (v_new_interval || ' days')::INTERVAL,
        recognition_correct = CASE WHEN p_quality >= 3 THEN recognition_correct + 1 ELSE recognition_correct END,
        recognition_total = recognition_total + 1,
        writing_total_score = CASE WHEN p_writing_score IS NOT NULL THEN writing_total_score + p_writing_score ELSE writing_total_score END,
        writing_attempts = CASE WHEN p_writing_score IS NOT NULL THEN writing_attempts + 1 ELSE writing_attempts END,
        last_writing_score = COALESCE(p_writing_score, last_writing_score),
        status = CASE
            WHEN v_new_repetitions >= 5 AND v_new_ease_factor >= 2.5 THEN 'mastered'
            WHEN v_new_repetitions >= 1 THEN 'review'
            ELSE 'learning'
        END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND kanji_id = p_kanji_id
    RETURNING * INTO v_progress;
    
    RETURN row_to_json(v_progress);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Kanji Learning System tables created successfully!';
    RAISE NOTICE '📊 Tables created: kanji, radicals, kanji_relationships, kanji_vocabulary, textbook_vocabulary, user_kanji_progress, user_writing_sessions';
    RAISE NOTICE '🔒 Row Level Security policies enabled';
    RAISE NOTICE '⚡ Helper functions created: get_kanji_details, update_kanji_progress';
END $$;
