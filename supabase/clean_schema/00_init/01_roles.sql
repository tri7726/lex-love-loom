-- ═══════════════════════════════════════════════════════════════
-- ROLES, EXTENSIONS & FOUNDATIONAL FUNCTIONS
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'user');
    END IF;
END $$;

-- ── Helper: kiểm tra role của người dùng ───────────────────────
-- Dùng trong RLS policies và RPC trên toàn hệ thống
CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role public.app_role)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = p_user_id AND role = p_role
    );
END;
$$;

-- ── Helper: ghi nhận hoạt động và cập nhật Streak ─────────────
-- Được gọi sau mỗi lần user kiếm XP (bên trong earn_xp)
CREATE OR REPLACE FUNCTION public.record_activity()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_today   date := CURRENT_DATE;
    v_last    date;
    v_streak  integer;
BEGIN
    IF v_user_id IS NULL THEN RETURN; END IF;

    SELECT last_activity_date, current_streak
    INTO v_last, v_streak
    FROM public.profiles WHERE user_id = v_user_id;

    -- Chỉ update nếu là ngày mới
    IF v_last IS NULL OR v_last < v_today THEN
        IF v_last = (v_today - INTERVAL '1 day')::date THEN
            v_streak := COALESCE(v_streak, 0) + 1;  -- Tiếp nối streak
        ELSE
            v_streak := 1;  -- Reset streak (đã bỏ lỡ ít nhất 1 ngày)
        END IF;

        UPDATE public.profiles
        SET current_streak     = v_streak,
            longest_streak     = GREATEST(COALESCE(longest_streak, 0), v_streak),
            last_activity_date = v_today,
            updated_at         = NOW()
        WHERE user_id = v_user_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_activity() TO authenticated;
