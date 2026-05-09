-- Add status column to curriculum system
ALTER TABLE public.curriculum_units ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';
ALTER TABLE public.curriculum_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';

-- Update existing units to published
UPDATE public.curriculum_units SET status = 'published' WHERE status IS NULL;
UPDATE public.curriculum_items SET status = 'published' WHERE status IS NULL;

-- Refine RLS Policies
DROP POLICY IF EXISTS "Public can view curriculum units" ON public.curriculum_units;
DROP POLICY IF EXISTS "Public can view curriculum items" ON public.curriculum_items;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can view published units') THEN
        CREATE POLICY "Students can view published units" ON public.curriculum_units FOR SELECT 
        USING (status = 'published' OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can manage units') THEN
        CREATE POLICY "Teachers can manage units" ON public.curriculum_units FOR ALL 
        USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can view published items') THEN
        CREATE POLICY "Students can view published items" ON public.curriculum_items FOR SELECT 
        USING (status = 'published' OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can manage items') THEN
        CREATE POLICY "Teachers can manage items" ON public.curriculum_items FOR ALL 
        USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;
