ALTER TABLE public.curriculum_units ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';
ALTER TABLE public.curriculum_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';
