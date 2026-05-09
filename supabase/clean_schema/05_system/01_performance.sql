-- ═══════════════════════════════════════════════════════════════
-- PERFORMANCE OPTIMIZATION & INDEXES
-- ═══════════════════════════════════════════════════════════════

-- Indexes cho các bảng dữ liệu lớn (Big Data)
CREATE INDEX IF NOT EXISTS idx_xp_events_user_date ON public.xp_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_results_user ON public.mock_exam_results (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_vocabulary_progress_user ON public.vocabulary_progress (user_id, next_review);

-- View thống kê nhanh cho Dashboard (Học sinh)
CREATE OR REPLACE VIEW public.user_learning_stats AS
SELECT 
    user_id,
    COUNT(DISTINCT vocab_id) as total_vocab_learned,
    (SELECT COUNT(*) FROM public.mock_exam_results mer WHERE mer.user_id = vp.user_id) as total_exams_taken,
    (SELECT SUM(amount) FROM public.xp_events xe WHERE xe.user_id = vp.user_id AND xe.created_at > now() - interval '7 days') as weekly_xp
FROM public.vocabulary_progress vp
GROUP BY user_id;

-- Cấp quyền view
GRANT SELECT ON public.user_learning_stats TO authenticated;
