-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: VIDEO LEARNING — Sources, Segments, Progress, Saved Content
-- ═══════════════════════════════════════════════════════════════

-- ── 1. VIDEO SOURCES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.video_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER, -- in seconds
  thumbnail_url TEXT,
  jlpt_level TEXT DEFAULT 'N5',
  processed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. VIDEO SEGMENTS (AI Processed) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.video_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.video_sources(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  start_time FLOAT NOT NULL,
  end_time FLOAT NOT NULL,
  japanese_text TEXT NOT NULL,
  vietnamese_text TEXT,
  grammar_notes JSONB DEFAULT '[]',
  vocabulary JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(video_id, segment_index)
);

-- ── 3. USER PROGRESS & SAVED CONTENT ──────────────────────────
CREATE TABLE IF NOT EXISTS public.user_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.video_segments(id) ON DELETE CASCADE,
  user_input TEXT,
  score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 1,
  status TEXT DEFAULT 'learning' CHECK (status IN ('learning', 'mastered')),
  last_practiced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, segment_id)
);

CREATE TABLE IF NOT EXISTS public.saved_sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  japanese_text TEXT NOT NULL,
  vietnamese_text TEXT,
  video_id UUID REFERENCES public.video_sources(id) ON DELETE SET NULL,
  segment_id UUID REFERENCES public.video_segments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. FAVORITE VIDEOS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorite_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.video_sources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- ── 5. PUBLIC VIEW (hides creator info) ─────────────────────────
CREATE OR REPLACE VIEW public.video_sources_public
WITH (security_invoker=on) AS
  SELECT
    id,
    youtube_id,
    title,
    description,
    duration,
    thumbnail_url,
    jlpt_level,
    processed,
    created_at,
    updated_at
  FROM public.video_sources
  WHERE processed = true;

GRANT SELECT ON public.video_sources_public TO anon, authenticated;

-- ── 6. RLS POLICIES ───────────────────────────────────────────
ALTER TABLE public.video_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_videos ENABLE ROW LEVEL SECURITY;

-- video_sources: public can view processed; creators can view & manage their own
DROP POLICY IF EXISTS "Anyone view processed videos" ON public.video_sources;
CREATE POLICY "Public view processed videos" ON public.video_sources FOR SELECT USING (processed = true OR auth.uid() = created_by);
CREATE POLICY "Creators manage own videos" ON public.video_sources FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Anyone view segments of processed videos" ON public.video_segments FOR SELECT
USING (EXISTS (SELECT 1 FROM public.video_sources WHERE id = video_id AND processed = true));

CREATE POLICY "Users manage own video progress" ON public.user_video_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own saved sentences" ON public.saved_sentences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own favorites" ON public.favorite_videos FOR ALL USING (auth.uid() = user_id);

-- ── 7. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_video_segments_video_id ON public.video_segments(video_id);
CREATE INDEX IF NOT EXISTS idx_user_video_progress_user ON public.user_video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_sentences_user ON public.saved_sentences(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_videos_user ON public.favorite_videos(user_id);

