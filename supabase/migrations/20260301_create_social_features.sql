-- Create Study Squads table
CREATE TABLE IF NOT EXISTS public.study_squads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Squad Members table
CREATE TABLE IF NOT EXISTS public.squad_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID REFERENCES public.study_squads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(squad_id, user_id)
);

-- Create Challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'completed', 'expired'
    challenger_score INTEGER,
    opponent_score INTEGER,
    winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    completed_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE public.study_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Allow anyone to see squads
CREATE POLICY "Anyone can view squads" ON public.study_squads FOR SELECT USING (true);

-- Allow squad members to see other members
CREATE POLICY "Squad members can view fellow members" ON public.squad_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.squad_members sm WHERE sm.squad_id = squad_id AND sm.user_id = auth.uid())
);

-- Allow users to see their own challenges
CREATE POLICY "Users can view their own challenges" ON public.challenges FOR SELECT USING (
    auth.uid() = challenger_id OR auth.uid() = opponent_id
);
