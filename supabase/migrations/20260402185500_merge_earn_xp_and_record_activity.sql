-- Merge record_activity into earn_xp so that every XP gain automatically tracks the streak
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

    -- Automatically record activity for streak tracking whenever XP is earned
    PERFORM public.record_activity();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
