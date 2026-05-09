-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: LEARNING — Kanji, Vocab, Flashcards, Exams, AI Content
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 1. KANJI SYSTEM & SM-2 ALGORITHM ───────────────────────────
CREATE TABLE IF NOT EXISTS public.kanji (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character VARCHAR(10) NOT NULL UNIQUE,
    onyomi TEXT[],
    kunyomi TEXT[],
    meaning TEXT NOT NULL,
    meaning_vi TEXT,
    hanviet TEXT,
    jlpt_level VARCHAR(5) NOT NULL,
    stroke_count INTEGER,
    frequency INTEGER,
    grade INTEGER,
    radical_id UUID,
    components TEXT[],
    examples JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kanji_radicals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character VARCHAR(10) NOT NULL UNIQUE,
    strokes INTEGER NOT NULL,
    meaning TEXT NOT NULL,
    reading TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kanji_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_kanji_id UUID REFERENCES public.kanji(id) ON DELETE CASCADE,
    child_kanji_id UUID REFERENCES public.kanji(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE(parent_kanji_id, child_kanji_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS public.user_kanji_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    kanji_id UUID REFERENCES public.kanji(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'learning',
    ease_factor REAL DEFAULT 2.5,
    interval INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    next_review TIMESTAMPTZ DEFAULT NOW(),
    last_review TIMESTAMPTZ,
    consecutive_correct INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, kanji_id)
);

CREATE INDEX IF NOT EXISTS idx_kanji_jlpt ON public.kanji(jlpt_level);
CREATE INDEX IF NOT EXISTS idx_user_kanji_next_review ON public.user_kanji_progress(user_id, next_review);

ALTER TABLE public.kanji ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanji_radicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_kanji_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view kanji" ON public.kanji FOR SELECT USING (true);
CREATE POLICY "Anyone can view radicals" ON public.kanji_radicals FOR SELECT USING (true);
CREATE POLICY "Users can manage own progress" ON public.user_kanji_progress FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_kanji_progress(p_kanji_id UUID, p_quality INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id UUID; v_progress public.user_kanji_progress%ROWTYPE;
    v_new_ease_factor REAL; v_new_interval INTEGER; v_new_repetitions INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
    SELECT * INTO v_progress FROM public.user_kanji_progress WHERE user_id = v_user_id AND kanji_id = p_kanji_id;
    IF NOT FOUND THEN
        INSERT INTO public.user_kanji_progress (user_id, kanji_id) VALUES (v_user_id, p_kanji_id) RETURNING * INTO v_progress;
    END IF;
    IF p_quality < 3 THEN
        v_new_repetitions := 0; v_new_interval := 1;
    ELSE
        v_new_repetitions := v_progress.repetitions + 1;
        IF v_progress.repetitions = 0 THEN v_new_interval := 1;
        ELSIF v_progress.repetitions = 1 THEN v_new_interval := 6;
        ELSE v_new_interval := ROUND(v_progress.interval * v_progress.ease_factor);
        END IF;
    END IF;
    v_new_ease_factor := v_progress.ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
    IF v_new_ease_factor < 1.3 THEN v_new_ease_factor := 1.3; END IF;
    UPDATE public.user_kanji_progress
    SET ease_factor = v_new_ease_factor, interval = v_new_interval, repetitions = v_new_repetitions,
        last_review = NOW(), next_review = NOW() + (v_new_interval || ' days')::INTERVAL,
        status = CASE WHEN v_new_interval > 21 THEN 'mastered' ELSE 'learning' END,
        consecutive_correct = CASE WHEN p_quality >= 3 THEN consecutive_correct + 1 ELSE 0 END,
        updated_at = NOW()
    WHERE id = v_progress.id;
END;
$$;

-- ── 2. FLASHCARDS & FSRS SYSTEM ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  icon TEXT DEFAULT '📚', color TEXT DEFAULT '#3b82f6',
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vocabulary_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.vocabulary_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  icon TEXT DEFAULT '📁', color TEXT DEFAULT '#10b981',
  order_index INT DEFAULT 0, is_public BOOLEAN DEFAULT false, clone_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}', jlpt_level TEXT DEFAULT 'N5', language TEXT DEFAULT 'ja-vi',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_reference CHECK (id != parent_id)
);
CREATE INDEX IF NOT EXISTS idx_vocab_folders_tags ON public.vocabulary_folders USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_vocab_folders_fts ON public.vocabulary_folders USING GIN (to_tsvector('simple', name || ' ' || COALESCE(description, '')));

CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL, reading TEXT, hanviet TEXT, meaning TEXT NOT NULL,
  example_sentence TEXT, example_translation TEXT,
  audio_url TEXT, image_url TEXT, notes TEXT, jlpt_level TEXT, word_type TEXT, tags TEXT[],
  ease_factor FLOAT DEFAULT 2.5, interval INT DEFAULT 0, repetitions INT DEFAULT 0,
  next_review_date TIMESTAMPTZ DEFAULT NOW(), last_reviewed_at TIMESTAMPTZ,
  state INTEGER DEFAULT 0, reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0,
  due TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vocabulary_folder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.vocabulary_folders(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(), order_index INT DEFAULT 0,
  UNIQUE (folder_id, flashcard_id)
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_folder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own modules" ON public.course_modules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone read public folders" ON public.vocabulary_folders FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users manage own folders" ON public.vocabulary_folders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own flashcards" ON public.flashcards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone read public folder items" ON public.vocabulary_folder_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.vocabulary_folders WHERE id = folder_id AND (is_public = true OR user_id = auth.uid())));
CREATE POLICY "Users manage own folder items" ON public.vocabulary_folder_items FOR ALL USING (EXISTS (SELECT 1 FROM public.vocabulary_folders WHERE id = folder_id AND user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_folder_flashcard_count(folder_uuid UUID) RETURNS INT
LANGUAGE SQL STABLE SET search_path = public AS $$
  SELECT COUNT(*)::INT FROM public.vocabulary_folder_items WHERE folder_id = folder_uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_folder_flashcards(folder_uuid UUID)
RETURNS TABLE (id UUID, word TEXT, reading TEXT, hanviet TEXT, meaning TEXT,
  example_sentence TEXT, example_translation TEXT, audio_url TEXT, image_url TEXT,
  notes TEXT, jlpt_level TEXT, word_type TEXT, tags TEXT[])
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.word, f.reading, f.hanviet, f.meaning, f.example_sentence,
    f.example_translation, f.audio_url, f.image_url, f.notes, f.jlpt_level, f.word_type, f.tags
  FROM public.flashcards f
  JOIN public.vocabulary_folder_items i ON i.flashcard_id = f.id
  WHERE i.folder_id = folder_uuid;
$$;

-- ── 3. EXAM SYSTEM ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mock_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL, level TEXT NOT NULL DEFAULT 'N5',
  duration INTEGER NOT NULL DEFAULT 120, difficulty TEXT DEFAULT 'Cơ bản',
  description TEXT, is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'Kiến thức ngôn ngữ',
  question TEXT NOT NULL, options JSONB NOT NULL DEFAULT '[]',
  correct_index INTEGER NOT NULL DEFAULT 0, explanation TEXT,
  order_index INTEGER DEFAULT 0, category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mock_exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0, max_score INTEGER DEFAULT 180,
  time_taken INTEGER, level TEXT,
  answers JSONB DEFAULT '{}', category_scores JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ DEFAULT now(), created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_skill_metrics (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  total_correct INTEGER DEFAULT 0, total_questions INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, category)
);
ALTER TABLE public.user_skill_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own metrics" ON public.user_skill_metrics FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read published exams" ON public.mock_exams FOR SELECT USING (is_published = true OR created_by = auth.uid());
CREATE POLICY "Creator manage own exams" ON public.mock_exams FOR ALL USING (created_by = auth.uid());
CREATE POLICY "Admin full access exams" ON public.mock_exams FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone read questions" ON public.exam_questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.mock_exams WHERE id = exam_id AND (is_published = true OR created_by = auth.uid())));
CREATE POLICY "Creator manage own questions" ON public.exam_questions FOR ALL USING (EXISTS (SELECT 1 FROM public.mock_exams WHERE id = exam_id AND created_by = auth.uid()));
CREATE POLICY "Users manage own results" ON public.mock_exam_results FOR ALL USING (auth.uid() = user_id);

-- ── 4. CONTENT TABLES & GRAMMAR ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reading_passages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL, content TEXT NOT NULL,
    furigana_content TEXT, translation TEXT,
    level TEXT NOT NULL DEFAULT 'N5',
    category TEXT DEFAULT 'Graded Reader', topic TEXT, image_url TEXT,
    vocabulary JSONB DEFAULT '[]', grammar JSONB DEFAULT '[]', questions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_reading_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    passage_id UUID REFERENCES public.reading_passages(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false, quiz_score INTEGER, score INTEGER,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, passage_id)
);

CREATE TABLE IF NOT EXISTS public.roleplay_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL, description TEXT, setting TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'N5',
    personas JSONB NOT NULL DEFAULT '[]', goals JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shadowing_practices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL, transcript TEXT NOT NULL, translation TEXT,
    audio_url TEXT, level TEXT NOT NULL DEFAULT 'N5', speed REAL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grammar_mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sentence_id UUID,
    original_text TEXT NOT NULL, corrected_text TEXT NOT NULL,
    grammar_point TEXT NOT NULL, explanation TEXT, mistake_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_sentences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    japanese TEXT NOT NULL, reading TEXT, meaning TEXT NOT NULL,
    notes TEXT, source_type TEXT, source_id UUID, tags TEXT[] DEFAULT '{}',
    japanese_text TEXT, vietnamese_text TEXT,
    video_id UUID, segment_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analysis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL, analysis JSONB NOT NULL, engine TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON public.analysis_history(user_id);

CREATE TABLE IF NOT EXISTS public.user_shadowing_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    practice_id UUID NOT NULL REFERENCES public.shadowing_practices(id) ON DELETE CASCADE,
    best_score REAL DEFAULT 0, attempts_count INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, practice_id)
);

ALTER TABLE public.reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roleplay_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadowing_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shadowing_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read content" ON public.reading_passages FOR SELECT USING (true);
CREATE POLICY "Users manage own reading progress" ON public.user_reading_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public read roleplay" ON public.roleplay_scenarios FOR SELECT USING (true);
CREATE POLICY "Public read shadowing" ON public.shadowing_practices FOR SELECT USING (true);
CREATE POLICY "Users manage own shadowing progress" ON public.user_shadowing_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own grammar" ON public.grammar_mistakes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sentences" ON public.saved_sentences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own analysis" ON public.analysis_history FOR ALL USING (auth.uid() = user_id);

-- ── GRAMMAR POINTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grammar_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL, level VARCHAR(5) NOT NULL,
    usage TEXT, explanation TEXT NOT NULL, structure TEXT,
    examples JSONB DEFAULT '[]', comparisons JSONB DEFAULT '[]',
    category TEXT, lesson INTEGER, related_ids TEXT[] DEFAULT '{}',
    pitfall TEXT, video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.user_grammar_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    grammar_id UUID REFERENCES public.grammar_points(id) ON DELETE CASCADE,
    mastery_score INTEGER DEFAULT 0, last_practiced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, grammar_id)
);
ALTER TABLE public.grammar_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_grammar_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read grammar points" ON public.grammar_points FOR SELECT USING (true);
CREATE POLICY "Users manage own grammar progress" ON public.user_grammar_progress FOR ALL USING (auth.uid() = user_id);

-- ── 5. SENSEI RAG KNOWLEDGE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sensei_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL,
    tags TEXT[], embedding vector(1536), jlpt_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.match_sensei_knowledge (
  query_embedding vector(1536), match_threshold float, match_count int, p_category text DEFAULT NULL
) RETURNS TABLE (id uuid, title text, content text, category text, tags text[], jlpt_level text, similarity float)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT sk.id, sk.title, sk.content, sk.category, sk.tags, sk.jlpt_level,
    1 - (sk.embedding <=> query_embedding) AS similarity
  FROM public.sensei_knowledge sk
  WHERE (p_category IS NULL OR sk.category = p_category)
    AND 1 - (sk.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC LIMIT match_count;
END;
$$;

ALTER TABLE public.sensei_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sensei knowledge" ON public.sensei_knowledge FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS sensei_knowledge_embedding_idx ON public.sensei_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS sensei_knowledge_trgm_idx ON public.sensei_knowledge USING gin (content gin_trgm_ops);

-- ── 6. COMMUNITY DECKS & RPCs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL, description TEXT, tags TEXT[], jlpt_level TEXT,
    downloads_count INTEGER DEFAULT 0, upvotes_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_deck_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.community_decks(id) ON DELETE CASCADE,
    word TEXT NOT NULL, reading TEXT, meaning TEXT NOT NULL,
    example_sentence TEXT, example_translation TEXT, notes TEXT, order_index INTEGER DEFAULT 0
);

ALTER TABLE public.community_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_deck_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read published decks" ON public.community_decks FOR SELECT USING (is_published = true);
CREATE POLICY "Users manage own decks" ON public.community_decks FOR ALL USING (auth.uid() = author_id);
CREATE POLICY "Anyone read deck cards" ON public.community_deck_cards FOR SELECT USING (EXISTS (SELECT 1 FROM public.community_decks WHERE id = deck_id AND is_published = true));
CREATE POLICY "Users manage own deck cards" ON public.community_deck_cards FOR ALL USING (EXISTS (SELECT 1 FROM public.community_decks WHERE id = deck_id AND author_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_community_decks()
RETURNS TABLE (id UUID, name TEXT, description TEXT, clone_count INT, owner_name TEXT, card_count BIGINT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, f.description, f.clone_count,
    p.display_name AS owner_name,
    COUNT(i.flashcard_id) AS card_count, f.created_at
  FROM public.vocabulary_folders f
  LEFT JOIN public.profiles p ON p.user_id = f.user_id
  LEFT JOIN public.vocabulary_folder_items i ON i.folder_id = f.id
  WHERE f.is_public = true
  GROUP BY f.id, f.name, f.description, f.clone_count, p.display_name, f.created_at
  ORDER BY f.clone_count DESC, f.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.clone_public_deck(p_folder_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_folder_id UUID; v_source public.vocabulary_folders%ROWTYPE; v_new_flashcard_id UUID; rec RECORD;
BEGIN
  SELECT * INTO v_source FROM public.vocabulary_folders WHERE id = p_folder_id;
  IF NOT FOUND OR v_source.is_public = false THEN RAISE EXCEPTION 'Folder not found or not public'; END IF;
  INSERT INTO public.vocabulary_folders (user_id, name, description, icon, color, is_public)
  VALUES (auth.uid(), v_source.name || ' (Bản sao)', v_source.description, v_source.icon, v_source.color, false)
  RETURNING id INTO v_new_folder_id;
  UPDATE public.vocabulary_folders SET clone_count = clone_count + 1 WHERE id = p_folder_id;
  FOR rec IN SELECT f.* FROM public.flashcards f JOIN public.vocabulary_folder_items i ON i.flashcard_id = f.id WHERE i.folder_id = p_folder_id LOOP
    INSERT INTO public.flashcards (user_id, word, reading, hanviet, meaning, example_sentence, example_translation, audio_url, image_url, notes, jlpt_level, word_type, tags)
    VALUES (auth.uid(), rec.word, rec.reading, rec.hanviet, rec.meaning, rec.example_sentence, rec.example_translation, rec.audio_url, rec.image_url, rec.notes, rec.jlpt_level, rec.word_type, rec.tags)
    RETURNING id INTO v_new_flashcard_id;
    INSERT INTO public.vocabulary_folder_items (folder_id, flashcard_id) VALUES (v_new_folder_id, v_new_flashcard_id);
  END LOOP;
  RETURN v_new_folder_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recommended_reading(p_limit INT DEFAULT 3)
RETURNS TABLE (passage_id UUID, title TEXT, level TEXT, match_percentage FLOAT, learning_count INT, mastered_count INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH user_vocab AS (SELECT word, repetitions FROM public.flashcards WHERE user_id = auth.uid()),
  passage_vocab AS (
    SELECT rp.id AS p_id, rp.title AS p_title, rp.level AS p_level,
      jsonb_array_length(rp.vocabulary) AS total_words, v->>'word' AS passage_word
    FROM public.reading_passages rp, jsonb_array_elements(rp.vocabulary) AS v
    WHERE rp.vocabulary IS NOT NULL
  ),
  passage_matches AS (
    SELECT pv.p_id, pv.p_title, pv.p_level,
      MAX(pv.total_words) as total_words, COUNT(uv.word) AS matched_words,
      SUM(CASE WHEN uv.repetitions < 4 THEN 1 ELSE 0 END) AS learning_count,
      SUM(CASE WHEN uv.repetitions >= 4 THEN 1 ELSE 0 END) AS mastered_count
    FROM passage_vocab pv LEFT JOIN user_vocab uv ON pv.passage_word = uv.word
    GROUP BY pv.p_id, pv.p_title, pv.p_level
  )
  SELECT p_id, p_title, p_level,
    COALESCE(CAST(matched_words AS FLOAT) / NULLIF(total_words, 0) * 100, 0) AS match_percentage,
    CAST(COALESCE(learning_count, 0) AS INT), CAST(COALESCE(mastered_count, 0) AS INT)
  FROM passage_matches WHERE matched_words > 0
  ORDER BY match_percentage DESC, learning_count DESC LIMIT p_limit;
END;
$$;

-- ── 7. SEED CONTENT (small) ───────────────────────────────────
INSERT INTO public.reading_passages (title, content, translation, level, topic, vocabulary) VALUES
('Ngôi nhà của tôi', '私の家はハノイにあります。とてもきれいです。', 'Nhà của tôi ở Hà Nội. Nó rất đẹp.', 'N5', 'Daily Life', '[{"word": "家", "reading": "うち", "meaning": "nhà"}, {"word": "きれい", "reading": "きれい", "meaning": "đẹp"}]'),
('Sở thích của tôi', '私の趣味は日本語を勉強することです。', 'Sở thích của tôi là học tiếng Nhật.', 'N5', 'Hobby', '[{"word": "趣味", "reading": "しゅみ", "meaning": "sở thích"}, {"word": "勉強", "reading": "べんきょう", "meaning": "học tập"}]')
ON CONFLICT DO NOTHING;

INSERT INTO public.shadowing_practices (title, transcript, translation, level) VALUES
('Chào hỏi buổi sáng', 'おはようございます。お元気ですか？', 'Chào buổi sáng. Bạn có khỏe không?', 'N5'),
('Giới thiệu bản thân', 'はじめまして。ベトナムから来ました。よろしくお願いします。', 'Rất vui được gặp bạn. Tôi đến từ Việt Nam.', 'N5')
ON CONFLICT DO NOTHING;

INSERT INTO public.roleplay_scenarios (title, description, setting, level, personas, goals) VALUES
('Tại quán cà phê', 'Đặt đồ uống tại một quán cà phê ở Tokyo.', 'Coffee Shop', 'N5', '[{"name": "Phục vụ", "role": "AI"}, {"name": "Khách hàng", "role": "User"}]', '["Đặt một cốc Cafe Latte", "Hỏi về mật khẩu Wifi"]'),
('Hỏi đường', 'Hỏi đường đến ga Shinjuku.', 'Street', 'N4', '[{"name": "Người qua đường", "role": "AI"}, {"name": "Khách du lịch", "role": "User"}]', '["Hỏi đường đến ga gần nhất"]')
ON CONFLICT DO NOTHING;

-- ── 8. MINNA NO NIHONGO ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.minna_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook TEXT NOT NULL DEFAULT 'minna_n5',
  lesson_number INTEGER NOT NULL,
  title_jp TEXT NOT NULL, title_vi TEXT NOT NULL, description TEXT,
  icon TEXT DEFAULT '📖', color TEXT DEFAULT '#3b82f6',
  jlpt_level TEXT DEFAULT 'N5', word_count INTEGER DEFAULT 0, order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT minna_lessons_textbook_lesson_unique UNIQUE(textbook, lesson_number)
);

CREATE TABLE IF NOT EXISTS public.minna_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.minna_lessons(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL, textbook TEXT NOT NULL DEFAULT 'minna_n5',
  kanji TEXT, word TEXT NOT NULL, kana TEXT NOT NULL, romaji TEXT, hanviet TEXT,
  meaning_vi TEXT NOT NULL, meaning_en TEXT,
  example_jp TEXT, example_vi TEXT, example_en TEXT,
  part_of_speech TEXT, jlpt_level TEXT DEFAULT 'N5', tags TEXT[] DEFAULT '{}',
  audio_url TEXT, image_url TEXT, notes TEXT, order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_vocabulary_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES public.minna_vocabulary(id) ON DELETE CASCADE,
  mastery_level SMALLINT NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0, incorrect_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ, next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_earned INTEGER NOT NULL DEFAULT 0, is_starred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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
  v_user_id UUID := auth.uid(); v_prog public.user_vocabulary_progress;
  v_new_interval INTEGER; v_new_ef REAL; v_new_reps INTEGER;
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

-- ── 9. VIDEO LEARNING ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.video_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL, description TEXT, duration INTEGER,
  thumbnail_url TEXT, jlpt_level TEXT DEFAULT 'N5', processed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.video_sources(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  start_time FLOAT NOT NULL, end_time FLOAT NOT NULL,
  japanese_text TEXT NOT NULL, vietnamese_text TEXT,
  grammar_notes JSONB DEFAULT '[]', vocabulary JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(video_id, segment_index)
);

CREATE TABLE IF NOT EXISTS public.user_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.video_segments(id) ON DELETE CASCADE,
  user_input TEXT, score INTEGER DEFAULT 0, attempts INTEGER DEFAULT 1,
  status TEXT DEFAULT 'learning' CHECK (status IN ('learning', 'mastered')),
  last_practiced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, segment_id)
);

CREATE TABLE IF NOT EXISTS public.favorite_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.video_sources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

CREATE OR REPLACE VIEW public.video_sources_public
WITH (security_invoker=on) AS
  SELECT id, youtube_id, title, description, duration, thumbnail_url,
    jlpt_level, processed, created_at, updated_at
  FROM public.video_sources WHERE processed = true;
GRANT SELECT ON public.video_sources_public TO anon, authenticated;

ALTER TABLE public.video_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view processed videos" ON public.video_sources FOR SELECT USING (processed = true OR auth.uid() = created_by);
CREATE POLICY "Creators manage own videos" ON public.video_sources FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Anyone view segments of processed videos" ON public.video_segments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.video_sources WHERE id = video_id AND processed = true));
CREATE POLICY "Users manage own video progress" ON public.user_video_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own favorites" ON public.favorite_videos FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_video_segments_video_id ON public.video_segments(video_id);
CREATE INDEX IF NOT EXISTS idx_user_video_progress_user ON public.user_video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_sentences_user ON public.saved_sentences(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_videos_user ON public.favorite_videos(user_id);
