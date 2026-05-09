
-- Add status column to curriculum system
ALTER TABLE public.curriculum_units ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';
ALTER TABLE public.curriculum_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';

-- Update existing units to published
UPDATE public.curriculum_units SET status = 'published' WHERE status IS NULL;
UPDATE public.curriculum_items SET status = 'published' WHERE status IS NULL;
