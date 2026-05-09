-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: SOCIAL EXPANSION — PvP Challenges, Squad Goals, Social Activity
-- ═══════════════════════════════════════════════════════════════

-- ── 1. PVP CHALLENGES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL, -- 'vocabulary', 'grammar', 'kanji'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'expired', 'declined')),
    challenger_score INTEGER DEFAULT 0,
    opponent_score INTEGER DEFAULT 0,
    winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    completed_at TIMESTAMPTZ,
    UNIQUE(challenger_id, opponent_id, status) WHERE status = 'pending'
);

-- ── 2. SQUAD GOALS (Weekly Missions) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.squad_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID NOT NULL REFERENCES public.study_squads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_value INTEGER NOT NULL DEFAULT 5000,
    current_value INTEGER NOT NULL DEFAULT 0,
    reward_xp INTEGER NOT NULL DEFAULT 500,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. RLS POLICIES ───────────────────────────────────────────
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own challenges" ON public.challenges 
FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Users create challenges" ON public.challenges 
FOR INSERT WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Users update own challenges" ON public.challenges 
FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Public read squad goals" ON public.squad_goals FOR SELECT USING (true);

-- ── 4. INDEXES ────────────────────────────────────────────────
CREATE INDEX idx_challenges_users ON public.challenges(challenger_id, opponent_id);
CREATE INDEX idx_challenges_status ON public.challenges(status);
CREATE INDEX idx_squad_goals_squad ON public.squad_goals(squad_id);

-- ── 5. REALTIME ───────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_goals;
