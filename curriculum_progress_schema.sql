-- Create curriculum progress tracking
CREATE TABLE IF NOT EXISTS public.curriculum_progress (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id uuid REFERENCES public.curriculum_items(id) ON DELETE CASCADE,
    is_completed boolean DEFAULT true,
    completed_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, item_id)
);

-- RLS for progress
ALTER TABLE public.curriculum_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own curriculum progress"
    ON public.curriculum_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own curriculum progress"
    ON public.curriculum_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);
