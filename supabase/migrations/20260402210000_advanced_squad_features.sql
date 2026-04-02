-- Advanced Squad Features
-- 1. Create squad_messages for chat
CREATE TABLE IF NOT EXISTS public.squad_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id UUID NOT NULL REFERENCES public.study_squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create squad_goals for weekly missions
CREATE TABLE IF NOT EXISTS public.squad_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 3. Add XP cache to study_squads
ALTER TABLE public.study_squads ADD COLUMN IF NOT EXISTS total_xp BIGINT DEFAULT 0;
ALTER TABLE public.study_squads ADD COLUMN IF NOT EXISTS weekly_xp BIGINT DEFAULT 0;

-- 4. Enable RLS
ALTER TABLE public.squad_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_goals ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Members can read and send messages
CREATE POLICY "Squad members can manage own messages" 
ON public.squad_messages FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.squad_members WHERE squad_id = squad_messages.squad_id AND user_id = auth.uid())
);

-- Anyone can read goals
CREATE POLICY "Public read squad goals" ON public.squad_goals FOR SELECT USING (true);

-- 6. Update earn_xp to also sync squad XP
CREATE OR REPLACE FUNCTION public.earn_xp(p_amount integer, p_source text)
RETURNS void AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Security Guard: Limit max XP per call
    IF p_amount > 500 THEN
        p_amount := 500;
    END IF;

    -- Update user profile
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + p_amount,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    -- Log event
    INSERT INTO public.xp_events (user_id, source, amount, metadata)
    VALUES (v_user_id, p_source, p_amount, jsonb_build_object('client_timestamp', NOW()));

    -- Automatically record activity for streak
    PERFORM public.record_activity();
    
    -- AUTOMATIC ACHIEVEMENT CHECK
    PERFORM public.check_achievements(v_user_id);
    
    -- NEW: UPDATE SQUAD XP
    UPDATE public.study_squads
    SET total_xp = COALESCE(total_xp, 0) + p_amount,
        weekly_xp = COALESCE(weekly_xp, 0) + p_amount
    FROM public.squad_members
    WHERE public.squad_members.user_id = v_user_id
      AND public.squad_members.squad_id = public.study_squads.id;

    -- Sync squad goals (if any active XP goal exists)
    UPDATE public.squad_goals
    SET current_value = current_value + p_amount
    WHERE squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = v_user_id)
      AND status = 'active'
      AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable Realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_messages;
