-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: LEARNING — Kanji, Vocab, Flashcards, Exams, AI Content
-- Gộp từ: 20260207220439_create_flashcard_system, 20260209_create_kanji_system,
--          20260325_create_exam_system, 20260326_create_content_tables,
--          20260328_sensei_rag_v3, 20260403000000_community_decks,
--          20260505_create_grammar_mistakes, 20260505_create_saved_sentences,
--          20260506_add_fsrs_columns
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

CREATE OR REPLACE FUNCTION public.update_kanji_progress(
    p_kanji_id UUID,
    p_quality INTEGER -- 0-5
) RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_progress public.user_kanji_progress%ROWTYPE;
    v_new_ease_factor REAL;
    v_new_interval INTEGER;
    v_new_repetitions INTEGER;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 2. FLASHCARDS & FSRS SYSTEM ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📚',
  color TEXT DEFAULT '#3b82f6',
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vocabulary_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.vocabulary_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#10b981',
  order_index INT DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  clone_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  jlpt_level TEXT DEFAULT 'N5',
  language TEXT DEFAULT 'ja-vi',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_reference CHECK (id != parent_id)
);

CREATE INDEX IF NOT EXISTS idx_vocab_folders_tags ON public.vocabulary_folders USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_vocab_folders_fts ON public.vocabulary_folders USING GIN (to_tsvector('simple', name || ' ' || COALESCE(description, '')));

CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  reading TEXT,
  hanviet TEXT,
  meaning TEXT NOT NULL,
  example_sentence TEXT,
  example_translation TEXT,
  audio_url TEXT,
  image_url TEXT,
  notes TEXT,
  jlpt_level TEXT,
  word_type TEXT,
  tags TEXT[],
  
  -- FSRS Fields
  ease_factor FLOAT DEFAULT 2.5,
  interval INT DEFAULT 0,
  repetitions INT DEFAULT 0,
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  state INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  due TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vocabulary_folder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.vocabulary_folders(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  order_index INT DEFAULT 0,
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

CREATE OR REPLACE FUNCTION public.get_folder_flashcard_count(folder_uuid UUID) RETURNS INT AS $$
  SELECT COUNT(*)::INT FROM public.vocabulary_folder_items WHERE folder_id = folder_uuid;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.get_folder_flashcards(folder_uuid UUID)
RETURNS TABLE (
  id UUID,
  word TEXT,
  reading TEXT,
  hanviet TEXT,
  meaning TEXT,
  example_sentence TEXT,
  example_translation TEXT,
  audio_url TEXT,
  image_url TEXT,
  notes TEXT,
  jlpt_level TEXT,
  word_type TEXT,
  tags TEXT[]
) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    f.id, f.word, f.reading, f.hanviet, f.meaning, 
    f.example_sentence, f.example_translation, f.audio_url, 
    f.image_url, f.notes, f.jlpt_level, f.word_type, f.tags
  FROM public.flashcards f
  JOIN public.vocabulary_folder_items i ON i.flashcard_id = f.id
  WHERE i.folder_id = folder_uuid;
$$;


-- ── 3. EXAM SYSTEM ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mock_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'N5',
  duration INTEGER NOT NULL DEFAULT 120,
  difficulty TEXT DEFAULT 'Cơ bản',
  description TEXT,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'Kiến thức ngôn ngữ',
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  order_index INTEGER DEFAULT 0,
  category TEXT DEFAULT 'General', -- 'Kanji', 'Grammar', 'Listening', 'Reading'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mock_exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER DEFAULT 180,
  time_taken INTEGER,
  level TEXT,
  answers JSONB DEFAULT '{}',
  category_scores JSONB DEFAULT '{}', -- Lưu kết quả bóc tách theo skill
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3.5 SKILL METRICS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_skill_metrics (
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category    TEXT NOT NULL, -- 'Kanji', 'Grammar',...
    total_correct   INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    last_updated    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, category)
);

ALTER TABLE public.user_skill_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own metrics" ON public.user_skill_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers view student metrics" ON public.user_skill_metrics FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.class_members cm JOIN public.classrooms c ON cm.class_id = c.id WHERE cm.user_id = user_skill_metrics.user_id AND c.teacher_id = auth.uid())
);

ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read published exams" ON public.mock_exams FOR SELECT USING (is_published = true OR created_by = auth.uid());
CREATE POLICY "Creator manage own exams" ON public.mock_exams FOR ALL USING (created_by = auth.uid());
CREATE POLICY "Admin full access exams" ON public.mock_exams FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone read questions" ON public.exam_questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.mock_exams WHERE id = exam_id AND (is_published = true OR created_by = auth.uid())));
CREATE POLICY "Creator manage own questions" ON public.exam_questions FOR ALL USING (EXISTS (SELECT 1 FROM public.mock_exams WHERE id = exam_id AND created_by = auth.uid()));
CREATE POLICY "Users manage own results" ON public.mock_exam_results FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read passages" ON public.reading_passages FOR SELECT USING (true);
CREATE POLICY "Users manage own reading progress" ON public.user_reading_progress FOR ALL USING (auth.uid() = user_id);



-- ── 4. CONTENT TABLES & GRAMMAR ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reading_passages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    furigana_content TEXT,
    translation TEXT,
    level TEXT NOT NULL DEFAULT 'N5',
    category TEXT DEFAULT 'Graded Reader', -- Graded Reader, News, Manga, Story
    topic TEXT,
    image_url TEXT,
    vocabulary JSONB DEFAULT '[]',
    grammar JSONB DEFAULT '[]',
    questions JSONB DEFAULT '[]', -- [{question: string, options: string[], answer: number, explanation: string}]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_reading_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    passage_id UUID REFERENCES public.reading_passages(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    quiz_score INTEGER,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, passage_id)
);


CREATE TABLE IF NOT EXISTS public.roleplay_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    setting TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'N5',
    personas JSONB NOT NULL DEFAULT '[]',
    goals JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shadowing_practices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    transcript TEXT NOT NULL,
    translation TEXT,
    audio_url TEXT,
    level TEXT NOT NULL DEFAULT 'N5',
    speed REAL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grammar_mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sentence_id UUID,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    grammar_point TEXT NOT NULL,
    explanation TEXT,
    mistake_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_sentences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    japanese TEXT NOT NULL,
    reading TEXT,
    meaning TEXT NOT NULL,
    notes TEXT,
    source_type TEXT NOT NULL,
    source_id UUID,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analysis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    analysis JSONB NOT NULL,
    engine TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON public.analysis_history(user_id);

-- ── 4.1 TIẾN ĐỘ NỘI DUNG (CONTENT PROGRESS) ────────────────────
CREATE TABLE IF NOT EXISTS public.user_reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    passage_id UUID NOT NULL REFERENCES public.reading_passages(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    score INTEGER,
    last_read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, passage_id)
);

CREATE TABLE IF NOT EXISTS public.user_shadowing_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    practice_id UUID NOT NULL REFERENCES public.shadowing_practices(id) ON DELETE CASCADE,
    best_score REAL DEFAULT 0,
    attempts_count INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, practice_id)
);

ALTER TABLE public.user_reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shadowing_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reading progress" ON public.user_reading_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own shadowing progress" ON public.user_shadowing_progress FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roleplay_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadowing_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read content" ON public.reading_passages FOR SELECT USING (true);
CREATE POLICY "Public read roleplay" ON public.roleplay_scenarios FOR SELECT USING (true);
CREATE POLICY "Public read shadowing" ON public.shadowing_practices FOR SELECT USING (true);
CREATE POLICY "Users manage own grammar" ON public.grammar_mistakes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sentences" ON public.saved_sentences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own analysis" ON public.analysis_history FOR ALL USING (auth.uid() = user_id);


-- ── 5. SENSEI RAG KNOWLEDGE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sensei_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[],
    embedding vector(1536),
    jlpt_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hàm tìm kiếm kiến thức Sensei (Vector Search)
CREATE OR REPLACE FUNCTION public.match_sensei_knowledge (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  tags text[],
  jlpt_level text,
  similarity float
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    sk.id, sk.title, sk.content, sk.category, sk.tags, sk.jlpt_level,
    1 - (sk.embedding <=> query_embedding) AS similarity
  FROM public.sensei_knowledge sk
  WHERE (p_category IS NULL OR sk.category = p_category)
    AND 1 - (sk.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

ALTER TABLE public.sensei_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sensei knowledge" ON public.sensei_knowledge FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS sensei_knowledge_embedding_idx ON public.sensei_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS sensei_knowledge_trgm_idx ON public.sensei_knowledge USING gin (content gin_trgm_ops);


-- ── 7. ADVANCED BUSINESS LOGIC ────────────────────────────────
-- RPC to fetch public community decks
CREATE OR REPLACE FUNCTION public.get_community_decks()
RETURNS TABLE (
  id UUID, name TEXT, description TEXT, clone_count INT, owner_name TEXT, card_count BIGINT, created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id, f.name, f.description, f.clone_count,
    p.display_name AS owner_name,
    COUNT(i.flashcard_id) AS card_count,
    f.created_at
  FROM public.vocabulary_folders f
  LEFT JOIN public.profiles p ON p.user_id = f.user_id
  LEFT JOIN public.vocabulary_folder_items i ON i.folder_id = f.id
  WHERE f.is_public = true
  GROUP BY f.id, f.name, f.description, f.clone_count, p.display_name, f.created_at
  ORDER BY f.clone_count DESC, f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC to clone a public deck
CREATE OR REPLACE FUNCTION public.clone_public_deck(p_folder_id UUID)
RETURNS UUID AS $$
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
    INSERT INTO public.flashcards (
      user_id, word, reading, hanviet, meaning, example_sentence, example_translation, audio_url, image_url, notes, jlpt_level, word_type, tags
    ) VALUES (
      auth.uid(), rec.word, rec.reading, rec.hanviet, rec.meaning, rec.example_sentence, rec.example_translation, rec.audio_url, rec.image_url, rec.notes, rec.jlpt_level, rec.word_type, rec.tags
    ) RETURNING id INTO v_new_flashcard_id;

    INSERT INTO public.vocabulary_folder_items (folder_id, flashcard_id) VALUES (v_new_folder_id, v_new_flashcard_id);
  END LOOP;
  RETURN v_new_folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC to get recommended reading based on user vocabulary
CREATE OR REPLACE FUNCTION public.get_recommended_reading(p_limit INT DEFAULT 3)
RETURNS TABLE (
  passage_id UUID, title TEXT, level TEXT, match_percentage FLOAT, learning_count INT, mastered_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_vocab AS (
    SELECT word, repetitions FROM public.flashcards WHERE user_id = auth.uid()
  ),
  passage_vocab AS (
    SELECT 
      rp.id AS p_id, rp.title AS p_title, rp.level AS p_level,
      jsonb_array_length(rp.vocabulary) AS total_words,
      v->>'word' AS passage_word
    FROM public.reading_passages rp,
    jsonb_array_elements(rp.vocabulary) AS v
    WHERE rp.vocabulary IS NOT NULL
  ),
  passage_matches AS (
    SELECT 
      pv.p_id, pv.p_title, pv.p_level,
      MAX(pv.total_words) as total_words,
      COUNT(uv.word) AS matched_words,
      SUM(CASE WHEN uv.repetitions < 4 THEN 1 ELSE 0 END) AS learning_count,
      SUM(CASE WHEN uv.repetitions >= 4 THEN 1 ELSE 0 END) AS mastered_count
    FROM passage_vocab pv
    LEFT JOIN user_vocab uv ON pv.passage_word = uv.word
    GROUP BY pv.p_id, pv.p_title, pv.p_level
  )
  SELECT 
    p_id, p_title, p_level,
    COALESCE(CAST(matched_words AS FLOAT) / NULLIF(total_words, 0) * 100, 0) AS match_percentage,
    CAST(COALESCE(learning_count, 0) AS INT) AS learning_count,
    CAST(COALESCE(mastered_count, 0) AS INT) AS mastered_count
  FROM passage_matches
  WHERE matched_words > 0
  ORDER BY match_percentage DESC, learning_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE public.sensei_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read knowledge" ON public.sensei_knowledge FOR SELECT USING (true);

-- Hàm Hybrid Search (RAG)
CREATE OR REPLACE FUNCTION public.hybrid_match_sensei_knowledge(
    query_embedding vector(1536),
    query_text text,
    match_count int DEFAULT 5,
    full_text_weight float DEFAULT 1.0,
    semantic_weight float DEFAULT 1.0,
    rrf_k int DEFAULT 50,
    time_weight float DEFAULT 0.1
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    category text,
    tags text[],
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH semantic_search AS (
        SELECT sk.id, RANK() OVER (ORDER BY sk.embedding <=> query_embedding) as rank, (1 - (sk.embedding <=> query_embedding)) as raw_score
        FROM public.sensei_knowledge sk
        ORDER BY sk.embedding <=> query_embedding LIMIT match_count * 2
    ),
    keyword_search AS (
        SELECT sk.id, RANK() OVER (ORDER BY word_similarity(query_text, sk.content) DESC) as rank, word_similarity(query_text, sk.content) as raw_score
        FROM public.sensei_knowledge sk
        WHERE sk.content % query_text LIMIT match_count * 2
    ),
    combined_scores AS (
        SELECT
            sk.id, sk.title, sk.content, sk.category, sk.tags, sk.created_at,
            COALESCE(ss.raw_score, 0) as semantic_score,
            COALESCE(ks.raw_score, 0) as keyword_score,
            (COALESCE(1.0 / (rrf_k + ss.rank), 0.0) * semantic_weight) +
            (COALESCE(1.0 / (rrf_k + ks.rank), 0.0) * full_text_weight) as base_score
        FROM public.sensei_knowledge sk
        LEFT JOIN semantic_search ss ON sk.id = ss.id
        LEFT JOIN keyword_search ks ON sk.id = ks.id
        WHERE ss.id IS NOT NULL OR ks.id IS NOT NULL
    )
    SELECT
        c.id, c.title, c.content, c.category, c.tags,
        (c.base_score * (1 + (EXTRACT(EPOCH FROM c.created_at) / EXTRACT(EPOCH FROM NOW())) * time_weight))::float as similarity
    FROM combined_scores c
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;


-- ── 6. COMMUNITY DECKS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    jlpt_level TEXT,
    downloads_count INTEGER DEFAULT 0,
    upvotes_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_deck_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.community_decks(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    reading TEXT,
    meaning TEXT NOT NULL,
    example_sentence TEXT,
    example_translation TEXT,
    notes TEXT,
    order_index INTEGER DEFAULT 0
);

ALTER TABLE public.community_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_deck_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read published decks" ON public.community_decks FOR SELECT USING (is_published = true);
CREATE POLICY "Users manage own decks" ON public.community_decks FOR ALL USING (auth.uid() = author_id);
CREATE POLICY "Anyone read deck cards" ON public.community_deck_cards FOR SELECT USING (EXISTS (SELECT 1 FROM public.community_decks WHERE id = deck_id AND is_published = true));
CREATE POLICY "Users manage own deck cards" ON public.community_deck_cards FOR ALL USING (EXISTS (SELECT 1 FROM public.community_decks WHERE id = deck_id AND author_id = auth.uid()));

-- ── 7. RPC TO FETCH PUBLIC COMMUNITY DECKS (UPGRADED) ──────────
CREATE OR REPLACE FUNCTION public.get_community_decks()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  clone_count INT,
  owner_name TEXT,
  card_count BIGINT,
  tags TEXT[],
  jlpt_level TEXT,
  language TEXT,
  is_premium BOOLEAN,
  price_xp INTEGER,
  avg_rating DECIMAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.id,
    pd.title AS name,
    pd.description,
    pd.total_clones AS clone_count,
    p.display_name AS owner_name,
    (SELECT COUNT(*) FROM public.public_deck_items pdi WHERE pdi.deck_id = pd.id) AS card_count,
    pd.tags,
    pd.category AS jlpt_level,
    'ja-vi'::TEXT AS language,
    pd.is_premium,
    pd.price_xp,
    pd.avg_rating,
    pd.created_at
  ORDER BY pd.total_clones DESC, pd.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 8. SEED DATA FOR CONTENT ──────────────────────────────────
INSERT INTO public.reading_passages (title, content, translation, level, topic, vocabulary) VALUES
('Ngôi nhà của tôi', '私の家はハノイにあります。とてもきれいです。', 'Nhà của tôi ở Hà Nội. Nó rất đẹp.', 'N5', 'Daily Life', '[{"word": "家", "reading": "うち", "meaning": "nhà"}, {"word": "きれい", "reading": "きれい", "meaning": "đẹp"}]'),
('Sở thích của tôi', '私の趣味は日本語を勉強することです。', 'Sở thích của tôi là học tiếng Nhật.', 'N5', 'Hobby', '[{"word": "趣味", "reading": "しゅみ", "meaning": "sở thích"}, {"word": "勉強", "reading": "べんきょう", "meaning": "học tập"}]')
ON CONFLICT DO NOTHING;

INSERT INTO public.shadowing_practices (title, transcript, translation, level) VALUES
('Chào hỏi buổi sáng', 'おはようございます。お元気ですか？', 'Chào buổi sáng. Bạn có khỏe không?', 'N5'),
('Giới thiệu bản thân', 'はじめまして。ベトナムから来ました。よろしくお願いします。', 'Rất vui được gặp bạn. Tôi đến từ Việt Nam. Rất mong được giúp đỡ.', 'N5')
ON CONFLICT DO NOTHING;

INSERT INTO public.roleplay_scenarios (title, description, setting, level, personas, goals) VALUES
('Tại quán cà phê', 'Đặt đồ uống tại một quán cà phê ở Tokyo.', 'Coffee Shop', 'N5', '[{"name": "Phục vụ", "role": "AI"}, {"name": "Khách hàng", "role": "User"}]', '["Đặt một cốc Cafe Latte", "Hỏi về mật khẩu Wifi"]'),
('Hỏi đường', 'Hỏi đường đến ga Shinjuku.', 'Street', 'N4', '[{"name": "Người qua đường", "role": "AI"}, {"name": "Khách du lịch", "role": "User"}]', '["Hỏi đường đến ga gần nhất", "Hỏi mất bao lâu để đi bộ đến đó"]')
ON CONFLICT DO NOTHING;


-- Seed Data for Reading Passages
INSERT INTO public.reading_passages (title, content, furigana_content, translation, level, category, topic, vocabulary, grammar, questions)
VALUES 
(
  'Con m�o l?c', 
  '????????????????????????????', 
  '<ruby>??<rt>????</rt></ruby>?<ruby>?<rt>??</rt></ruby>?<ruby>?<rt>??</rt></ruby>??????<ruby>?<rt>??</rt></ruby>?????<ruby>?<rt>??</rt></ruby>?<ruby>?<rt>?</rt></ruby>???????',
  'C� m?t con m�o tr?ng ? c�ng vi�n. Con m�o dang r?t d�i.',
  'N5',
  'Graded Reader',
  '�?ng v?t',
  '[{"word": "??", "reading": "????", "meaning": "c�ng vi�n"}, {"word": "?", "reading": "??", "meaning": "con m�o"}]',
  '[{"pattern": "~?~????", "meaning": "C� ~ ? ~"}]',
  '[{"question": "Con m�o m�u g�?", "options": ["Tr?ng", "�en", "V�ng"], "answer": 0, "explanation": "Trong b�i vi?t ''???'' (m�o tr?ng)."}, {"question": "Con m�o dang ? d�u?", "options": ["Nh�", "C�ng vi�n", "Tru?ng h?c"], "answer": 1, "explanation": "Trong b�i vi?t ''???'' (? c�ng vi�n)."}]'
),
(
  'M�a hoa anh d�o',
  '????????????????????????????',
  '<ruby>??<rt>???</rt></ruby>?<ruby>?<rt>???</rt></ruby>????<ruby>??<rt>???</rt></ruby>????????<ruby>?<rt>??</rt></ruby>?<ruby>??<rt>???</rt></ruby>?<ruby>?<rt>?</rt></ruby>????',
  'Hoa anh d�o nam nay r?t d?p. R?t nhi?u ngu?i di ng?m hoa.',
  'N3',
  'News',
  'Van h�a',
  '[{"word": "?", "reading": "???", "meaning": "hoa anh d�o"}, {"word": "??", "reading": "???", "meaning": "ng?m hoa"}]',
  '[{"pattern": "~?????", "meaning": "�i d? l�m g� d�"}]',
  '[{"question": "M?i ngu?i di d�u?", "options": ["�i l�m", "�i ng?m hoa", "�i ng?"], "answer": 1, "explanation": "''???????'' nghia l� di ng?m hoa."}]'
);

CREATE TABLE IF NOT EXISTS public.grammar_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    level VARCHAR(5) NOT NULL,
    usage TEXT,
    explanation TEXT NOT NULL,
    structure TEXT,
    examples JSONB DEFAULT '[]',
    comparisons JSONB DEFAULT '[]',
    category TEXT,
    lesson INTEGER,
    related_ids TEXT[] DEFAULT '{}',
    pitfall TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_grammar_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    grammar_id UUID REFERENCES public.grammar_points(id) ON DELETE CASCADE,
    mastery_score INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, grammar_id)
);

ALTER TABLE public.grammar_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_grammar_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read grammar points" ON public.grammar_points FOR SELECT USING (true);
CREATE POLICY "Users manage own grammar progress" ON public.user_grammar_progress FOR ALL USING (auth.uid() = user_id);

-- Seed Data for Grammar Points
INSERT INTO public.grammar_points (title, level, usage, explanation, examples, comparisons, category)
VALUES (
  '? vs ?', 
  'N5', 
  'N1 ? ... / N1 ? ...', 
  '? d�ng d? n�u ch? d? (topic marker), ? d�ng d? nh?n m?nh ch? th? h�nh d?ng ho?c th�ng tin m?i (subject marker).',
  '[{"japanese": "???????", "vietnamese": "T�i l� sinh vi�n. (Ch? d? l� ''t�i'')", "reading": "???????????"}, {"japanese": "???????", "vietnamese": "CH�NH T�I l� sinh vi�n. (Nh?n m?nh ''ai'' l� sinh vi�n)", "reading": "???????????"}]',
  '[{"target": "?", "difference": "? nh?n m?nh ph?n v? ng? ph�a sau, ? nh?n m?nh ph?n ch? ng? ph�a tru?c."}]',
  'Tr? t?'
);
