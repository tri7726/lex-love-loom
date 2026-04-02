-- Automated Achievement Checking System
CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_achievement RECORD;
    v_current_value INTEGER;
    v_unlocked BOOLEAN;
BEGIN
    -- Loop through all achievement definitions
    FOR v_achievement IN SELECT * FROM public.achievements LOOP
        v_current_value := 0;
        
        -- Check condition based on type
        CASE v_achievement.condition_type
            WHEN 'xp_total' THEN
                SELECT COALESCE(total_xp, 0) INTO v_current_value FROM public.profiles WHERE user_id = p_user_id;
            WHEN 'streak_days' THEN
                SELECT COALESCE(current_streak, 0) INTO v_current_value FROM public.profiles WHERE user_id = p_user_id;
            WHEN 'flashcard_count' THEN
                -- Sub-query to handle table existence check (flashcards might be in public or SRS schema)
                SELECT COUNT(*) INTO v_current_value FROM public.flashcards WHERE user_id = p_user_id;
            WHEN 'duel_wins' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.challenges WHERE winner_id = p_user_id;
            WHEN 'speaking_sessions' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source = 'speaking_practice';
            ELSE
                v_current_value := 0;
        END CASE;

        -- If condition is met, try to unlock
        IF v_current_value >= v_achievement.condition_value THEN
            -- Check if already unlocked
            SELECT EXISTS (
                SELECT 1 FROM public.user_achievements 
                WHERE user_id = p_user_id AND achievement_id = v_achievement.id
            ) INTO v_unlocked;

            IF NOT v_unlocked THEN
                -- Unlock achievement
                INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
                VALUES (p_user_id, v_achievement.id, NOW());

                -- Reward XP (Directly to avoid recursion)
                IF v_achievement.xp_reward > 0 THEN
                    UPDATE public.profiles
                    SET total_xp = total_xp + v_achievement.xp_reward
                    WHERE user_id = p_user_id;

                    INSERT INTO public.xp_events (user_id, source, amount, metadata)
                    VALUES (p_user_id, 'achievement_unlocked', v_achievement.xp_reward, 
                            jsonb_build_object('achievement_title', v_achievement.title));
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update earn_xp to call check_achievements automatically
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
    SET total_xp = COALESCE(total_xp, 0) + p_amount,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    -- Log event
    INSERT INTO public.xp_events (user_id, source, amount, metadata)
    VALUES (v_user_id, p_source, p_amount, jsonb_build_object('client_timestamp', NOW()));

    -- Automatically record activity for streak tracking whenever XP is earned
    PERFORM public.record_activity();
    
    -- AUTOMATIC ACHIEVEMENT CHECK
    PERFORM public.check_achievements(v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
