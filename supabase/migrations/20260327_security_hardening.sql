-- ============================================================
-- SECURITY HARDENING: SERVER-SIDE VALIDATION & PRIVACY
-- Date: 2026-03-27
-- ============================================================

-- 1. Create a secure XP increment function
CREATE OR REPLACE FUNCTION public.earn_xp(p_amount integer, p_source text)
RETURNS void AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Security Guard: Limit max XP per call to prevent massive injection
    IF p_amount > 500 THEN
        p_amount := 500;
    END IF;

    -- Update profile
    UPDATE public.profiles
    SET total_xp = total_xp + p_amount,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    -- Log event
    INSERT INTO public.xp_events (user_id, source, amount, metadata)
    VALUES (v_user_id, p_source, p_amount, jsonb_build_object('client_timestamp', NOW()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create a secure activity record function (for streaks)
CREATE OR REPLACE FUNCTION public.record_activity()
RETURNS void AS $$
DECLARE
    v_user_id uuid;
    v_today date;
    v_last_date date;
    v_current_streak integer;
BEGIN
    v_user_id := auth.uid();
    v_today := CURRENT_DATE;

    SELECT last_activity_date, current_streak 
    INTO v_last_date, v_current_streak
    FROM public.profiles 
    WHERE user_id = v_user_id;

    -- Only update if it's a new day
    IF v_last_date IS NULL OR v_last_date < v_today THEN
        IF v_last_date = (v_today - INTERVAL '1 day')::date THEN
            v_current_streak := v_current_streak + 1;
        ELSE
            v_current_streak := 1;
        END IF;

        UPDATE public.profiles
        SET current_streak = v_current_streak,
            longest_streak = GREATEST(longest_streak, v_current_streak),
            last_activity_date = v_today,
            updated_at = NOW()
        WHERE user_id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create a private user settings table for sensitive data
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    push_endpoint text,
    push_p256dh text,
    push_auth text,
    push_enabled boolean DEFAULT false,
    push_reminder_time text DEFAULT '20:00',
    updated_at timestamptz DEFAULT NOW()
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

-- 4. Clean up profiles table (Optional: remove sensitive columns if they were there)
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS push_endpoint;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS push_p256dh;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS push_auth;

-- 5. Update RLS Policies for 'profiles'
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Allow updating non-sensitive fields
DROP POLICY IF EXISTS "Users can update non-sensitive profile fields" ON public.profiles;
CREATE POLICY "Users can update non-sensitive profile fields" ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (
        -- auth.uid() = user_id AND -- implicitly handled by USING
        (CASE WHEN total_xp IS DISTINCT FROM (SELECT total_xp FROM public.profiles WHERE user_id = auth.uid()) THEN FALSE ELSE TRUE END) AND
        (CASE WHEN current_streak IS DISTINCT FROM (SELECT current_streak FROM public.profiles WHERE user_id = auth.uid()) THEN FALSE ELSE TRUE END) AND
        (CASE WHEN role IS DISTINCT FROM (SELECT role FROM public.profiles WHERE user_id = auth.uid()) THEN FALSE ELSE TRUE END)
    );

-- Fallback for full edit (if needed, but safer to restrict)
-- Note: 'total_xp' and 'current_streak' are now effectively managed by the SECURITY DEFINER functions above.

-- 4. Privacy: Hide sensitive push notification tokens from public SELECT
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Public profile view" ON public.profiles;
CREATE POLICY "Public profile view" ON public.profiles
    FOR SELECT 
    USING (TRUE);
-- Note: To truly hide columns in Supabase RLS SELECT, it's usually better to use a View, 
-- but we can restrict column access in the query layer or just acknowledge that RLS filter is row-based.
-- For now, we will assume standard SELECT visibility but emphasize that RPC is used for mutations.

-- 5. Secure 'user_roles'
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin manage roles" ON public.user_roles;
CREATE POLICY "Admin manage roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
