CREATE TABLE IF NOT EXISTS public.user_evolved_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('vocabulary', 'pronunciation', 'grammar')),
    status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered', 'in_progress', 'mastered')),
    challenge_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    xp_reward INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours')
);

-- RLS policies
ALTER TABLE public.user_evolved_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own evolved skills"
    ON public.user_evolved_skills
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own evolved skills"
    ON public.user_evolved_skills
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Services can insert evolved skills"
    ON public.user_evolved_skills
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_evolved_skills_user_status ON public.user_evolved_skills(user_id, status);
CREATE INDEX IF NOT EXISTS idx_evolved_skills_expires ON public.user_evolved_skills(expires_at);
