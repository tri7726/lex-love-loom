
-- Hotfix: Add missing columns to mock_exam_results
ALTER TABLE public.mock_exam_results 
ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 180,
ADD COLUMN IF NOT EXISTS time_taken INTEGER,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS level TEXT;

-- Backfill completed_at for existing rows (mock_exam_results has no created_at)
UPDATE public.mock_exam_results SET completed_at = now() WHERE completed_at IS NULL;
