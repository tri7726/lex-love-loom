ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_jlpt_level text,
  ADD COLUMN IF NOT EXISTS daily_goal_minutes integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS learning_goal text;

COMMENT ON COLUMN public.profiles.onboarded IS 'Đã hoàn tất luồng onboarding khởi đầu hay chưa';
COMMENT ON COLUMN public.profiles.target_jlpt_level IS 'Mục tiêu JLPT mong muốn (N5..N1)';
COMMENT ON COLUMN public.profiles.daily_goal_minutes IS 'Mục tiêu số phút học mỗi ngày';
COMMENT ON COLUMN public.profiles.learning_goal IS 'Lý do học (work, travel, anime, exam, culture, other)';