-- Create daily_quest_progress table to persist quest completion and rewards
CREATE TABLE IF NOT EXISTS public.daily_quest_progress (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quest_date date DEFAULT CURRENT_DATE NOT NULL,
    quest_id text NOT NULL,
    is_completed boolean DEFAULT false,
    is_claimed boolean DEFAULT false,
    PRIMARY KEY (user_id, quest_date, quest_id)
);

-- Enable RLS
ALTER TABLE public.daily_quest_progress ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own quest progress" ON public.daily_quest_progress;
CREATE POLICY "Users can view own quest progress" ON public.daily_quest_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert/update own quest progress" ON public.daily_quest_progress;
CREATE POLICY "Users can insert/update own quest progress" ON public.daily_quest_progress
    FOR ALL USING (auth.uid() = user_id);
