-- ============================================================
-- DASHBOARD OPTIMIZATION: INDEXES FOR SRS AND ANALYTICS
-- Date: 2026-03-26
-- ============================================================

-- 1. Index for SRS Due Cards (Review Now)
-- Helps speed up queries like .lte('next_review_date', now())
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review_date 
ON public.flashcards(next_review_date);

-- 2. Index for AI Writing Recommendations
-- Helps speed up queries like .lt('ease_factor', 2.0)
CREATE INDEX IF NOT EXISTS idx_flashcards_ease_factor 
ON public.flashcards(ease_factor);

-- 3. Index for Leaderboard
-- Helps speed up .order('total_xp', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_profiles_total_xp_desc 
ON public.profiles(total_xp DESC);

-- 4. Index for Achievement progress checks (if any)
CREATE INDEX IF NOT EXISTS idx_profiles_jlpt_level 
ON public.profiles(jlpt_level);

-- 5. Completion Message
DO $$
BEGIN
    RAISE NOTICE '🚀 Dashboard optimization indexes applied successfully.';
END $$;
