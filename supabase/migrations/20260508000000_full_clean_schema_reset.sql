-- ===== supabase/clean_schema/00_init/00_reset.sql =====
-- ═══════════════════════════════════════════════════════════════
-- RESET DATABASE
-- ═══════════════════════════════════════════════════════════════
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;


-- ===== supabase/clean_schema/00_init/01_roles.sql =====
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


-- ===== supabase/clean_schema/01_users/00_profiles_xp_streaks.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: USERS — Profiles, XP, Streaks, Achievements
-- Gộp từ: 20260224_create_user_profiles, 20260327_security_hardening,
--          20260325_phase3_xp_achievements, 20260402200000_automatic_achievement_check,
--          20260402_merge_earn_xp_and_record_activity, 20260522_consolidate_earn_xp,
--          20260511_fix_duplicate_achievements, add_furigana_mode_to_profiles,
--          add_push_columns_to_profiles, 20260326_fix_auth_trigger
-- ═══════════════════════════════════════════════════════════════

-- ── EXTENSIONS & ENUMS ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'user');
  END IF;
END $$;

-- ── PROFILES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id         uuid UNIQUE NOT NULL,
    display_name    text,
    full_name       text,
    username        text UNIQUE,
    avatar_url      text,
    role            public.app_role DEFAULT 'user',
    total_xp        integer NOT NULL DEFAULT 0,
    daily_xp_earned integer NOT NULL DEFAULT 0,
    weekly_xp       integer NOT NULL DEFAULT 0,
    current_streak  integer NOT NULL DEFAULT 0,
    longest_streak  integer NOT NULL DEFAULT 0,
    last_activity_date date,
    pet_coins       integer DEFAULT 0,
    jlpt_level      text DEFAULT 'N5',
    furigana_mode   text DEFAULT 'always',
    active_title    text,
    bio             text,
    banner_url      text,
    location        text,
    website         text,
    social_links    jsonb DEFAULT '{}'::jsonb,
    preferences     jsonb DEFAULT '{}'::jsonb,
    last_xp_reset   timestamptz NOT NULL DEFAULT NOW(),

    created_at      timestamptz DEFAULT NOW(),
    updated_at      timestamptz DEFAULT NOW()
);

-- ── USER SETTINGS (PRIVATE) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_enabled       boolean DEFAULT false,
    push_endpoint      text,
    push_p256dh        text,
    push_auth          text,
    push_reminder_time text DEFAULT '20:00',
    updated_at         timestamptz DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- Bắt buộc để Supabase PostgREST có thể JOIN profiles qua user_id
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- ── USER ROLES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role    public.app_role NOT NULL,
    PRIMARY KEY (user_id, role)
);

-- ── XP EVENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.xp_events (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source     text NOT NULL, -- 'quiz','flashcard','duel','reading','speaking','streak_bonus','achievement','pet_feed',...
    amount     integer NOT NULL,
    metadata   jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_id ON public.xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_date ON public.xp_events(user_id, created_at DESC);

-- ── ACHIEVEMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.achievements (
    id              text PRIMARY KEY,
    title           text NOT NULL,
    description     text NOT NULL,
    icon            text NOT NULL DEFAULT '🏆',
    category        text NOT NULL DEFAULT 'general',
    condition_type  text NOT NULL,
    condition_value integer NOT NULL,
    xp_reward       integer DEFAULT 0,
    title_reward    text,
    created_at      timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id text NOT NULL REFERENCES public.achievements(id),
    unlocked_at    timestamptz DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);

-- ── RLS POLICIES ───────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profile view" ON public.profiles;
CREATE POLICY "Public profile view" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own non-sensitive fields" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update non-sensitive profile fields" ON public.profiles;

-- Chính sách cập nhật Profile: Người dùng có thể cập nhật thông tin cá nhân, nhưng KHÔNG ĐƯỢC sửa XP/Role trực tiếp.
CREATE POLICY "Users update own profile info" ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND
        total_xp = (SELECT total_xp FROM public.profiles WHERE id = auth.uid()) AND
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
        pet_coins = (SELECT pet_coins FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin manage roles" ON public.user_roles;
CREATE POLICY "Admin manage roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Users can view own xp_events" ON public.xp_events;
CREATE POLICY "Users can view own xp_events" ON public.xp_events FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own xp_events" ON public.xp_events;
CREATE POLICY "Users can insert own xp_events" ON public.xp_events FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read achievements" ON public.achievements;
CREATE POLICY "Public read achievements" ON public.achievements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users view own achievements" ON public.user_achievements;
CREATE POLICY "Users view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- ── FUNCTIONS ──────────────────────────────────────────────────

-- Tự động tạo Profile khi có user mới đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, user_id, username, full_name, display_name, avatar_url)
    VALUES (
        new.id,
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
        new.raw_user_meta_data->>'full_name',
        COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
        new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_settings (user_id) VALUES (new.id) ON CONFLICT DO NOTHING;
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_user_streak(v_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_last_date DATE;
    v_current_streak INTEGER;
    v_has_freeze BOOLEAN;
    v_freeze_item_id UUID;
BEGIN
    SELECT last_activity_date, current_streak 
    INTO v_last_date, v_current_streak
    FROM public.profiles WHERE user_id = v_user_id;

    IF v_last_date IS NULL OR v_last_date < v_today THEN
        -- Kiểm tra nếu bị lỡ ngày (không phải hôm nay và không phải hôm qua)
        IF v_last_date < (v_today - INTERVAL '1 day')::date THEN
            -- Thử tìm vật phẩm Streak Freeze
            SELECT s.id INTO v_freeze_item_id 
            FROM public.shop_items s 
            JOIN public.user_inventory i ON s.id = i.item_id
            WHERE i.user_id = v_user_id AND s.item_type = 'streak_freeze' AND i.quantity > 0
            LIMIT 1;

            IF v_freeze_item_id IS NULL THEN
                v_current_streak := 1; -- Reset streak
            ELSE
                -- Sử dụng vật phẩm bảo vệ
                UPDATE public.user_inventory SET quantity = quantity - 1 
                WHERE user_id = v_user_id AND item_id = v_freeze_item_id;
                
                -- Không reset streak, coi như hôm qua đã học
                v_current_streak := COALESCE(v_current_streak, 0) + 1;
            END IF;
        ELSIF v_last_date = (v_today - INTERVAL '1 day')::date THEN
            v_current_streak := COALESCE(v_current_streak, 0) + 1;
        ELSE
            -- Đã học hôm nay, không làm gì
            RETURN;
        END IF;

        UPDATE public.profiles
        SET current_streak     = v_current_streak,
            longest_streak     = GREATEST(COALESCE(longest_streak, 0), v_current_streak),
            last_activity_date = v_today,
            updated_at         = NOW()
        WHERE user_id = v_user_id;
    END IF;
END;
$$;

-- Kiểm tra và mở khoá thành tích tự động
CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id UUID, p_source TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_achievement  RECORD;
    v_current_value INTEGER;
    v_unlocked      BOOLEAN;
    v_category_filter TEXT;
BEGIN
    v_category_filter := CASE
        WHEN p_source IN ('quiz') THEN 'quiz'
        WHEN p_source IN ('pet_feed', 'pet_play', 'pet_bathe', 'pet_walk', 'pet_sleep', 'pet_interact') THEN 'pet'
        WHEN p_source IN ('duel') THEN 'social'
        WHEN p_source IN ('speaking_practice') THEN 'speaking'
        WHEN p_source IN ('flashcard_create', 'flashcard_review') THEN 'flashcard'
        WHEN p_source IN ('streak_bonus', 'daily_login') THEN 'streak'
        ELSE NULL
    END;

    FOR v_achievement IN 
        SELECT * FROM public.achievements 
        WHERE (v_category_filter IS NULL OR category = v_category_filter OR category = 'general' OR category = 'xp')
    LOOP
        v_current_value := 0;
        CASE v_achievement.condition_type
            WHEN 'xp_total' THEN
                SELECT COALESCE(total_xp, 0) INTO v_current_value FROM public.profiles WHERE user_id = p_user_id;
            WHEN 'streak_days' THEN
                SELECT COALESCE(current_streak, 0) INTO v_current_value FROM public.profiles WHERE user_id = p_user_id;
            WHEN 'flashcard_count' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.vocabulary_progress WHERE user_id = p_user_id;
            WHEN 'quiz_count' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source = 'quiz';
            WHEN 'quiz_perfect' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source = 'quiz' AND metadata->>'perfect' = 'true';
            WHEN 'duel_wins' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.challenges WHERE winner_id = p_user_id;
            WHEN 'speaking_sessions' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source = 'speaking_practice';
            WHEN 'pet_total_actions' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source IN ('pet_feed','pet_play','pet_bathe','pet_walk','pet_sleep','pet_interact');
            WHEN 'pet_feeds' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source = 'pet_feed';
            WHEN 'pet_plays' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source = 'pet_play';
            WHEN 'pet_happiness' THEN
                SELECT COALESCE(happiness, 0) INTO v_current_value FROM public.user_pets WHERE user_id = p_user_id;
            WHEN 'pet_evolution' THEN
                SELECT COALESCE(evolution_level, 0) INTO v_current_value FROM public.user_pets WHERE user_id = p_user_id;
            ELSE
                v_current_value := 0;
        END CASE;

        IF v_current_value >= v_achievement.condition_value THEN
            SELECT EXISTS (
                SELECT 1 FROM public.user_achievements
                WHERE user_id = p_user_id AND achievement_id = v_achievement.id
            ) INTO v_unlocked;

            IF NOT v_unlocked THEN
                INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
                VALUES (p_user_id, v_achievement.id, NOW())
                ON CONFLICT DO NOTHING;

                IF v_achievement.xp_reward > 0 THEN
                    -- Pet achievements → cộng vào pet_xp, còn lại → user XP
                    IF v_achievement.condition_type LIKE 'pet_%' THEN
                        UPDATE public.user_pets SET pet_xp = pet_xp + v_achievement.xp_reward, updated_at = NOW()
                        WHERE user_id = p_user_id;
                    ELSE
                        UPDATE public.profiles SET total_xp = total_xp + v_achievement.xp_reward WHERE user_id = p_user_id;
                    END IF;

                    INSERT INTO public.xp_events (user_id, source, amount, metadata)
                    VALUES (p_user_id, 'achievement_unlocked', v_achievement.xp_reward,
                            jsonb_build_object('achievement_title', v_achievement.title));
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hàm tích luỹ XP chính thức (Final consolidated version — security definer, max 500/call)
CREATE OR REPLACE FUNCTION public.earn_xp(p_amount integer, p_source text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id uuid;
    v_tier text;
    v_limit integer;
    v_count integer;
    v_blocked_until timestamptz;
    v_dup_check integer;
    v_final_amount integer;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- ── 1. Per-source amount cap ──
    v_final_amount := CASE p_source
        WHEN 'flashcard'       THEN LEAST(p_amount, 10)
        WHEN 'quiz'            THEN LEAST(p_amount, 50)
        WHEN 'duel_win'        THEN LEAST(p_amount, 100)
        WHEN 'reading'         THEN LEAST(p_amount, 30)
        WHEN 'speaking'        THEN LEAST(p_amount, 40)
        WHEN 'achievement'     THEN LEAST(p_amount, 500)
        WHEN 'daily_quests'    THEN LEAST(p_amount, 200)
        ELSE                       LEAST(p_amount, 20)
    END;

    IF v_final_amount <= 0 THEN RETURN; END IF;

    -- ── 2. Rate limit tier lookup ──
    CASE p_source
        WHEN 'flashcard'       THEN v_tier := 'high';   v_limit := 60;
        WHEN 'quiz'            THEN v_tier := 'medium'; v_limit := 30;
        WHEN 'reading'         THEN v_tier := 'medium'; v_limit := 30;
        WHEN 'speaking'        THEN v_tier := 'medium'; v_limit := 30;
        ELSE                       v_tier := 'low';     v_limit := 10;
    END CASE;

    -- ── 3. Check if currently blocked ──
    SELECT blocked_until INTO v_blocked_until
    FROM public.rate_limits
    WHERE identifier = v_user_id::text
      AND identifier_type = 'user'
      AND endpoint = 'earn_xp'
      AND window_start = date_trunc('minute', now())
      AND blocked_until IS NOT NULL
      AND blocked_until > now()
    LIMIT 1;

    IF v_blocked_until IS NOT NULL THEN
        RAISE EXCEPTION 'Rate limited. Try again later.' USING HINT = 'Slow down your requests';
    END IF;

    -- ── 4. Increment rate counter & check ──
    v_count := public.increment_rate_limit(v_user_id::text, 'user', 'earn_xp', v_tier);

    IF v_count > v_limit THEN
        PERFORM public.block_identifier(v_user_id::text, 'user', 'earn_xp', interval '1 minute');
        INSERT INTO public.abuse_alerts (identifier, identifier_type, reason, details)
        VALUES (v_user_id::text, 'user', 'XP rate limit exceeded', jsonb_build_object('source', p_source, 'count', v_count));
        RAISE EXCEPTION 'Rate limit exceeded for source: %', p_source;
    END IF;

    -- ── 5. Duplicate prevention (last 5 seconds) ──
    SELECT COUNT(*) INTO v_dup_check FROM public.xp_events
    WHERE user_id = v_user_id AND source = p_source AND amount = v_final_amount AND created_at > now() - interval '5 seconds';

    IF v_dup_check > 0 THEN RETURN; END IF;

    -- ── 6. Award XP ──
    UPDATE public.profiles 
    SET total_xp = total_xp + v_final_amount,
        daily_xp_earned = COALESCE(daily_xp_earned, 0) + v_final_amount,
        weekly_xp = COALESCE(weekly_xp, 0) + v_final_amount,
        updated_at = NOW() 
    WHERE user_id = v_user_id;

    INSERT INTO public.xp_events (user_id, source, amount, metadata)
    VALUES (v_user_id, p_source, v_final_amount, p_metadata || jsonb_build_object('client_timestamp', NOW()));

    -- 7. Ghi nhận streak
    PERFORM public.record_activity();

    -- 8. Kiểm tra thành tích
    PERFORM public.check_achievements(v_user_id, p_source);

    -- Đồng bộ XP lên Squad nếu user đang trong squad
    UPDATE public.study_squads
    SET total_xp  = COALESCE(total_xp, 0)  + v_final_amount,
        weekly_xp = COALESCE(weekly_xp, 0) + v_final_amount
    FROM public.squad_members
    WHERE public.squad_members.user_id  = v_user_id
      AND public.squad_members.squad_id = public.study_squads.id;

    -- Đồng bộ Squad Goals
    UPDATE public.squad_goals
    SET current_value = current_value + v_final_amount
    WHERE squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = v_user_id)
      AND status = 'active'
      AND expires_at > NOW();
END;
$$;

-- Hàm reset Weekly XP (Dành cho cron job hàng tuần)
CREATE OR REPLACE FUNCTION public.reset_weekly_xp_all()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    UPDATE public.profiles SET weekly_xp = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.earn_xp(integer, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_activity() TO authenticated;

-- ── SEED: Achievement Definitions ──────────────────────────────
INSERT INTO public.achievements (id, title, description, icon, category, condition_type, condition_value, xp_reward, title_reward) VALUES
  ('first_steps',    'Bước đầu tiên',    'Kiếm được XP đầu tiên',             '⭐','general',  'xp_total',       1,     50, 'Tân Thủ'),
  ('xp_100',         'Học viên mới',     'Đạt 100 XP',                         '📚','xp',       'xp_total',       100,   50, NULL),
  ('xp_500',         'Chăm chỉ',         'Đạt 500 XP',                         '💪','xp',       'xp_total',       500,   100, NULL),
  ('xp_1000',        'XP Hunter',        'Đạt 1,000 XP',                       '🎯','xp',       'xp_total',       1000,  150, NULL),
  ('xp_5000',        'XP Legend',        'Đạt 5,000 XP',                       '👑','xp',       'xp_total',       5000,  300, 'Bậc Thầy Học Thuật'),
  ('xp_10000',       'Huyền thoại',      'Đạt 10,000 XP',                      '🌟','xp',       'xp_total',       10000, 500, 'Thánh Nhân Sakura'),
  ('streak_3',       'Khởi đầu tốt',     'Duy trì streak 3 ngày',              '🔥','streak',   'streak_days',    3,     30, NULL),
  ('streak_7',       'On Fire',          'Duy trì streak 7 ngày',              '🔥','streak',   'streak_days',    7,     75, 'Người Chăm Chỉ'),
  ('streak_30',      'Dedicated Learner','Duy trì streak 30 ngày',             '🏆','streak',   'streak_days',    30,    200, 'Chiến Thần Streak'),
  ('streak_100',     'Bất khuất',        'Duy trì streak 100 ngày',            '💎','streak',   'streak_days',    100,   500, 'Kẻ Không Thể Cản Phá'),
  ('flashcard_10',   'Tập tành',         'Tạo 10 flashcard',                   '🃏','flashcard','flashcard_count',10,    30, NULL),
  ('flashcard_50',   'Bộ sưu tập',       'Tạo 50 flashcard',                   '📖','flashcard','flashcard_count',50,    75, NULL),
  ('flashcard_100',  'Vocab Master',     'Tạo 100 flashcard',                  '🎓','flashcard','flashcard_count',100,   150, 'Vua Từ Vựng'),
  ('quiz_perfect',   'Hoàn hảo',         'Đạt 100% trong một bài quiz',        '💯','quiz',     'quiz_perfect',   1,     100, 'Thiên Tài Quiz'),
  ('quiz_10',        'Quiz Addict',      'Hoàn thành 10 bài quiz',             '⚡','quiz',     'quiz_count',     10,    75, NULL),
  ('duel_first',     'Chiến binh',       'Thắng trận duel đầu tiên',           '⚔️','social',   'duel_wins',      1,     100, 'Đấu Sĩ'),
  ('duel_10',        'Đấu sĩ',           'Thắng 10 trận duel',                 '🗡️','social',   'duel_wins',      10,    250, 'Vô Địch Arena'),
  ('speaking_first', 'Mở miệng',         'Hoàn thành buổi luyện nói đầu tiên','🎤','speaking', 'speaking_sessions',1,   50, NULL),
  ('speaking_10',    'Diễn giả',         'Hoàn thành 10 buổi luyện nói',       '🎙️','speaking','speaking_sessions',10,  150, 'Diễn Thuyết Gia'),
  -- Pet achievements
  ('pet_caretaker',  'Người chăm sóc',   'Hoàn thành 10 hành động Pet',        '🐾','pet',      'pet_total_actions',10, 80, 'Huấn Luyện Viên'),
  ('pet_feeder',     'Đầu bếp Pet',      'Cho Pet ăn 5 lần',                   '🍱','pet',      'pet_feeds',      5,     60, NULL),
  ('pet_evolved',    'Tiến hóa!',        'Pet tiến hóa lần đầu',               '✨','pet',      'pet_evolution',  1,     200, 'Tiến Hóa Sư')
ON CONFLICT (id) DO NOTHING;


-- Add 'parent' role to enum
DO  BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'parent') THEN
    ALTER TYPE public.app_role ADD VALUE 'parent';
  END IF;
END ;

-- Allow parents to view linked student profiles
CREATE POLICY "Parents can view linked student profiles" ON public.profiles FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.parent_student_links psl
        WHERE psl.parent_id = auth.uid() AND psl.student_id = profiles.id AND psl.status = 'active'
    )
);


-- ===== supabase/clean_schema/02_learning/00_full_learning_system.sql =====
-- âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
-- DOMAIN: LEARNING â Kanji, Vocab, Flashcards, Exams, AI Content
-- Gá»p tá»«: 20260207220439_create_flashcard_system, 20260209_create_kanji_system,
--          20260325_create_exam_system, 20260326_create_content_tables,
--          20260328_sensei_rag_v3, 20260403000000_community_decks,
--          20260505_create_grammar_mistakes, 20260505_create_saved_sentences,
--          20260506_add_fsrs_columns
-- âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ââ 1. KANJI SYSTEM & SM-2 ALGORITHM âââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.kanji (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character VARCHAR(10) NOT NULL UNIQUE,
    onyomi TEXT[],
    kunyomi TEXT[],
    meaning TEXT NOT NULL,
    meaning_vi TEXT,
    hanviet TEXT,
    jlpt_level VARCHAR(5) NOT NULL,
    stroke_count INTEGER,
    frequency INTEGER,
    grade INTEGER,
    radical_id UUID,
    components TEXT[],
    examples JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kanji_radicals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character VARCHAR(10) NOT NULL UNIQUE,
    strokes INTEGER NOT NULL,
    meaning TEXT NOT NULL,
    reading TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kanji_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_kanji_id UUID REFERENCES public.kanji(id) ON DELETE CASCADE,
    child_kanji_id UUID REFERENCES public.kanji(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE(parent_kanji_id, child_kanji_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS public.user_kanji_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    kanji_id UUID REFERENCES public.kanji(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'learning',
    ease_factor REAL DEFAULT 2.5,
    interval INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    next_review TIMESTAMPTZ DEFAULT NOW(),
    last_review TIMESTAMPTZ,
    consecutive_correct INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, kanji_id)
);

CREATE INDEX IF NOT EXISTS idx_kanji_jlpt ON public.kanji(jlpt_level);
CREATE INDEX IF NOT EXISTS idx_user_kanji_next_review ON public.user_kanji_progress(user_id, next_review);

ALTER TABLE public.kanji ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanji_radicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_kanji_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view kanji" ON public.kanji FOR SELECT USING (true);
CREATE POLICY "Anyone can view radicals" ON public.kanji_radicals FOR SELECT USING (true);
CREATE POLICY "Users can manage own progress" ON public.user_kanji_progress FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_kanji_progress(
    p_kanji_id UUID,
    p_quality INTEGER -- 0-5
) RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_progress public.user_kanji_progress%ROWTYPE;
    v_new_ease_factor REAL;
    v_new_interval INTEGER;
    v_new_repetitions INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    SELECT * INTO v_progress FROM public.user_kanji_progress WHERE user_id = v_user_id AND kanji_id = p_kanji_id;

    IF NOT FOUND THEN
        INSERT INTO public.user_kanji_progress (user_id, kanji_id) VALUES (v_user_id, p_kanji_id) RETURNING * INTO v_progress;
    END IF;

    IF p_quality < 3 THEN
        v_new_repetitions := 0; v_new_interval := 1;
    ELSE
        v_new_repetitions := v_progress.repetitions + 1;
        IF v_progress.repetitions = 0 THEN v_new_interval := 1;
        ELSIF v_progress.repetitions = 1 THEN v_new_interval := 6;
        ELSE v_new_interval := ROUND(v_progress.interval * v_progress.ease_factor);
        END IF;
    END IF;

    v_new_ease_factor := v_progress.ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
    IF v_new_ease_factor < 1.3 THEN v_new_ease_factor := 1.3; END IF;

    UPDATE public.user_kanji_progress
    SET ease_factor = v_new_ease_factor, interval = v_new_interval, repetitions = v_new_repetitions,
        last_review = NOW(), next_review = NOW() + (v_new_interval || ' days')::INTERVAL,
        status = CASE WHEN v_new_interval > 21 THEN 'mastered' ELSE 'learning' END,
        consecutive_correct = CASE WHEN p_quality >= 3 THEN consecutive_correct + 1 ELSE 0 END,
        updated_at = NOW()
    WHERE id = v_progress.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ââ 2. FLASHCARDS & FSRS SYSTEM ââââââââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'ð',
  color TEXT DEFAULT '#3b82f6',
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vocabulary_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.vocabulary_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'ð',
  color TEXT DEFAULT '#10b981',
  order_index INT DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  clone_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  jlpt_level TEXT DEFAULT 'N5',
  language TEXT DEFAULT 'ja-vi',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_reference CHECK (id != parent_id)
);

CREATE INDEX IF NOT EXISTS idx_vocab_folders_tags ON public.vocabulary_folders USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_vocab_folders_fts ON public.vocabulary_folders USING GIN (to_tsvector('simple', name || ' ' || COALESCE(description, '')));

CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  reading TEXT,
  hanviet TEXT,
  meaning TEXT NOT NULL,
  example_sentence TEXT,
  example_translation TEXT,
  audio_url TEXT,
  image_url TEXT,
  notes TEXT,
  jlpt_level TEXT,
  word_type TEXT,
  tags TEXT[],
  
  -- FSRS Fields
  ease_factor FLOAT DEFAULT 2.5,
  interval INT DEFAULT 0,
  repetitions INT DEFAULT 0,
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  state INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  due TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vocabulary_folder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.vocabulary_folders(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  order_index INT DEFAULT 0,
  UNIQUE (folder_id, flashcard_id)
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_folder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own modules" ON public.course_modules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone read public folders" ON public.vocabulary_folders FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users manage own folders" ON public.vocabulary_folders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own flashcards" ON public.flashcards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone read public folder items" ON public.vocabulary_folder_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.vocabulary_folders WHERE id = folder_id AND (is_public = true OR user_id = auth.uid())));
CREATE POLICY "Users manage own folder items" ON public.vocabulary_folder_items FOR ALL USING (EXISTS (SELECT 1 FROM public.vocabulary_folders WHERE id = folder_id AND user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_folder_flashcard_count(folder_uuid UUID) RETURNS INT AS $$
  SELECT COUNT(*)::INT FROM public.vocabulary_folder_items WHERE folder_id = folder_uuid;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.get_folder_flashcards(folder_uuid UUID)
RETURNS TABLE (
  id UUID,
  word TEXT,
  reading TEXT,
  hanviet TEXT,
  meaning TEXT,
  example_sentence TEXT,
  example_translation TEXT,
  audio_url TEXT,
  image_url TEXT,
  notes TEXT,
  jlpt_level TEXT,
  word_type TEXT,
  tags TEXT[]
) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    f.id, f.word, f.reading, f.hanviet, f.meaning, 
    f.example_sentence, f.example_translation, f.audio_url, 
    f.image_url, f.notes, f.jlpt_level, f.word_type, f.tags
  FROM public.flashcards f
  JOIN public.vocabulary_folder_items i ON i.flashcard_id = f.id
  WHERE i.folder_id = folder_uuid;
$$;


-- ââ 3. EXAM SYSTEM âââââââââââââââââââââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.mock_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'N5',
  duration INTEGER NOT NULL DEFAULT 120,
  passing_total INTEGER DEFAULT 100,
  section_benchmarks JSONB DEFAULT '{"vocabulary": 19, "grammar": 19, "reading": 19, "listening": 19}'::jsonb,
  difficulty TEXT DEFAULT 'Cơ bản',
  description TEXT,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mock_exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'Kiến thức ngôn ngữ',
  section_type TEXT,
  question TEXT NOT NULL,
  passage TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  correct_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  order_index INTEGER DEFAULT 0,
  point_weight INTEGER DEFAULT 1,
  category TEXT DEFAULT 'General', -- 'Kanji', 'Grammar', 'Listening', 'Reading'
  image_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mock_exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER DEFAULT 180,
  time_taken INTEGER,
  level TEXT,
  answers JSONB DEFAULT '{}',
  category_scores JSONB DEFAULT '{}', -- LÆ°u káº¿t quáº£ bÃ³c tÃ¡ch theo skill
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ââ 3.5 SKILL METRICS ââââââââââââââââââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.user_skill_metrics (
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category    TEXT NOT NULL, -- 'Kanji', 'Grammar',...
    total_correct   INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    last_updated    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, category)
);

ALTER TABLE public.user_skill_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own metrics" ON public.user_skill_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers view student metrics" ON public.user_skill_metrics FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.class_members cm JOIN public.classrooms c ON cm.class_id = c.id WHERE cm.user_id = user_skill_metrics.user_id AND c.teacher_id = auth.uid())
);

ALTER TABLE public.mock_exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_results ENABLE ROW LEVEL SECURITY;

-- RLS disabled for exams and questions as requested
-- CREATE POLICY "Anyone read published exams" ON public.mock_exams FOR SELECT USING (is_published = true OR created_by = auth.uid());
-- CREATE POLICY "Creator manage own exams" ON public.mock_exams FOR ALL USING (created_by = auth.uid());
-- CREATE POLICY "Admin full access exams" ON public.mock_exams FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
-- CREATE POLICY "Anyone read questions" ON public.mock_exam_questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.mock_exams WHERE id = exam_id AND (is_published = true OR created_by = auth.uid())));
-- CREATE POLICY "Creator manage own questions" ON public.mock_exam_questions FOR ALL USING (EXISTS (SELECT 1 FROM public.mock_exams WHERE id = exam_id AND created_by = auth.uid()));
CREATE POLICY "Users manage own results" ON public.mock_exam_results FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read passages" ON public.reading_passages FOR SELECT USING (true);
CREATE POLICY "Users manage own reading progress" ON public.user_reading_progress FOR ALL USING (auth.uid() = user_id);



-- ââ 4. CONTENT TABLES & GRAMMAR ââââââââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.reading_passages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    furigana_content TEXT,
    translation TEXT,
    level TEXT NOT NULL DEFAULT 'N5',
    category TEXT DEFAULT 'Graded Reader', -- Graded Reader, News, Manga, Story
    topic TEXT,
    image_url TEXT,
    vocabulary JSONB DEFAULT '[]',
    grammar JSONB DEFAULT '[]',
    questions JSONB DEFAULT '[]', -- [{question: string, options: string[], answer: number, explanation: string}]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_reading_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    passage_id UUID REFERENCES public.reading_passages(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    quiz_score INTEGER,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, passage_id)
);


CREATE TABLE IF NOT EXISTS public.roleplay_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    setting TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'N5',
    personas JSONB NOT NULL DEFAULT '[]',
    goals JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shadowing_practices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    transcript TEXT NOT NULL,
    translation TEXT,
    audio_url TEXT,
    level TEXT NOT NULL DEFAULT 'N5',
    speed REAL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grammar_mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sentence_id UUID,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    grammar_point TEXT NOT NULL,
    explanation TEXT,
    mistake_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_sentences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    japanese TEXT NOT NULL,
    reading TEXT,
    meaning TEXT NOT NULL,
    notes TEXT,
    source_type TEXT NOT NULL,
    source_id UUID,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analysis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    analysis JSONB NOT NULL,
    engine TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON public.analysis_history(user_id);

-- ââ 4.1 TIáº¾N Äá» Ná»I DUNG (CONTENT PROGRESS) ââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.user_reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    passage_id UUID NOT NULL REFERENCES public.reading_passages(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    score INTEGER,
    last_read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, passage_id)
);

CREATE TABLE IF NOT EXISTS public.user_shadowing_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    practice_id UUID NOT NULL REFERENCES public.shadowing_practices(id) ON DELETE CASCADE,
    best_score REAL DEFAULT 0,
    attempts_count INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, practice_id)
);

ALTER TABLE public.user_reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shadowing_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reading progress" ON public.user_reading_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own shadowing progress" ON public.user_shadowing_progress FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roleplay_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadowing_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read content" ON public.reading_passages FOR SELECT USING (true);
CREATE POLICY "Public read roleplay" ON public.roleplay_scenarios FOR SELECT USING (true);
CREATE POLICY "Public read shadowing" ON public.shadowing_practices FOR SELECT USING (true);
CREATE POLICY "Users manage own grammar" ON public.grammar_mistakes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sentences" ON public.saved_sentences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own analysis" ON public.analysis_history FOR ALL USING (auth.uid() = user_id);


-- ââ 5. SENSEI RAG KNOWLEDGE ââââââââââââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.sensei_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[],
    embedding vector(1536),
    jlpt_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HÃ m tÃ¬m kiáº¿m kiáº¿n thá»©c Sensei (Vector Search)
CREATE OR REPLACE FUNCTION public.match_sensei_knowledge (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  tags text[],
  jlpt_level text,
  similarity float
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    sk.id, sk.title, sk.content, sk.category, sk.tags, sk.jlpt_level,
    1 - (sk.embedding <=> query_embedding) AS similarity
  FROM public.sensei_knowledge sk
  WHERE (p_category IS NULL OR sk.category = p_category)
    AND 1 - (sk.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

ALTER TABLE public.sensei_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sensei knowledge" ON public.sensei_knowledge FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS sensei_knowledge_embedding_idx ON public.sensei_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS sensei_knowledge_trgm_idx ON public.sensei_knowledge USING gin (content gin_trgm_ops);


-- ââ 7. ADVANCED BUSINESS LOGIC ââââââââââââââââââââââââââââââââ
-- RPC to fetch public community decks
CREATE OR REPLACE FUNCTION public.get_community_decks()
RETURNS TABLE (
  id UUID, name TEXT, description TEXT, clone_count INT, owner_name TEXT, card_count BIGINT, created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id, f.name, f.description, f.clone_count,
    p.display_name AS owner_name,
    COUNT(i.flashcard_id) AS card_count,
    f.created_at
  FROM public.vocabulary_folders f
  LEFT JOIN public.profiles p ON p.user_id = f.user_id
  LEFT JOIN public.vocabulary_folder_items i ON i.folder_id = f.id
  WHERE f.is_public = true
  GROUP BY f.id, f.name, f.description, f.clone_count, p.display_name, f.created_at
  ORDER BY f.clone_count DESC, f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC to clone a public deck
CREATE OR REPLACE FUNCTION public.clone_public_deck(p_folder_id UUID)
RETURNS UUID AS $$
DECLARE
  v_new_folder_id UUID; v_source public.vocabulary_folders%ROWTYPE; v_new_flashcard_id UUID; rec RECORD;
BEGIN
  SELECT * INTO v_source FROM public.vocabulary_folders WHERE id = p_folder_id;
  IF NOT FOUND OR v_source.is_public = false THEN RAISE EXCEPTION 'Folder not found or not public'; END IF;

  INSERT INTO public.vocabulary_folders (user_id, name, description, icon, color, is_public)
  VALUES (auth.uid(), v_source.name || ' (Báº£n sao)', v_source.description, v_source.icon, v_source.color, false)
  RETURNING id INTO v_new_folder_id;

  UPDATE public.vocabulary_folders SET clone_count = clone_count + 1 WHERE id = p_folder_id;

  FOR rec IN SELECT f.* FROM public.flashcards f JOIN public.vocabulary_folder_items i ON i.flashcard_id = f.id WHERE i.folder_id = p_folder_id LOOP
    INSERT INTO public.flashcards (
      user_id, word, reading, hanviet, meaning, example_sentence, example_translation, audio_url, image_url, notes, jlpt_level, word_type, tags
    ) VALUES (
      auth.uid(), rec.word, rec.reading, rec.hanviet, rec.meaning, rec.example_sentence, rec.example_translation, rec.audio_url, rec.image_url, rec.notes, rec.jlpt_level, rec.word_type, rec.tags
    ) RETURNING id INTO v_new_flashcard_id;

    INSERT INTO public.vocabulary_folder_items (folder_id, flashcard_id) VALUES (v_new_folder_id, v_new_flashcard_id);
  END LOOP;
  RETURN v_new_folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC to get recommended reading based on user vocabulary
CREATE OR REPLACE FUNCTION public.get_recommended_reading(p_limit INT DEFAULT 3)
RETURNS TABLE (
  passage_id UUID, title TEXT, level TEXT, match_percentage FLOAT, learning_count INT, mastered_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_vocab AS (
    SELECT word, repetitions FROM public.flashcards WHERE user_id = auth.uid()
  ),
  passage_vocab AS (
    SELECT 
      rp.id AS p_id, rp.title AS p_title, rp.level AS p_level,
      jsonb_array_length(rp.vocabulary) AS total_words,
      v->>'word' AS passage_word
    FROM public.reading_passages rp,
    jsonb_array_elements(rp.vocabulary) AS v
    WHERE rp.vocabulary IS NOT NULL
  ),
  passage_matches AS (
    SELECT 
      pv.p_id, pv.p_title, pv.p_level,
      MAX(pv.total_words) as total_words,
      COUNT(uv.word) AS matched_words,
      SUM(CASE WHEN uv.repetitions < 4 THEN 1 ELSE 0 END) AS learning_count,
      SUM(CASE WHEN uv.repetitions >= 4 THEN 1 ELSE 0 END) AS mastered_count
    FROM passage_vocab pv
    LEFT JOIN user_vocab uv ON pv.passage_word = uv.word
    GROUP BY pv.p_id, pv.p_title, pv.p_level
  )
  SELECT 
    p_id, p_title, p_level,
    COALESCE(CAST(matched_words AS FLOAT) / NULLIF(total_words, 0) * 100, 0) AS match_percentage,
    CAST(COALESCE(learning_count, 0) AS INT) AS learning_count,
    CAST(COALESCE(mastered_count, 0) AS INT) AS mastered_count
  FROM passage_matches
  WHERE matched_words > 0
  ORDER BY match_percentage DESC, learning_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE public.sensei_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read knowledge" ON public.sensei_knowledge FOR SELECT USING (true);

-- HÃ m Hybrid Search (RAG)
CREATE OR REPLACE FUNCTION public.hybrid_match_sensei_knowledge(
    query_embedding vector(1536),
    query_text text,
    match_count int DEFAULT 5,
    full_text_weight float DEFAULT 1.0,
    semantic_weight float DEFAULT 1.0,
    rrf_k int DEFAULT 50,
    time_weight float DEFAULT 0.1
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    category text,
    tags text[],
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH semantic_search AS (
        SELECT sk.id, RANK() OVER (ORDER BY sk.embedding <=> query_embedding) as rank, (1 - (sk.embedding <=> query_embedding)) as raw_score
        FROM public.sensei_knowledge sk
        ORDER BY sk.embedding <=> query_embedding LIMIT match_count * 2
    ),
    keyword_search AS (
        SELECT sk.id, RANK() OVER (ORDER BY word_similarity(query_text, sk.content) DESC) as rank, word_similarity(query_text, sk.content) as raw_score
        FROM public.sensei_knowledge sk
        WHERE sk.content % query_text LIMIT match_count * 2
    ),
    combined_scores AS (
        SELECT
            sk.id, sk.title, sk.content, sk.category, sk.tags, sk.created_at,
            COALESCE(ss.raw_score, 0) as semantic_score,
            COALESCE(ks.raw_score, 0) as keyword_score,
            (COALESCE(1.0 / (rrf_k + ss.rank), 0.0) * semantic_weight) +
            (COALESCE(1.0 / (rrf_k + ks.rank), 0.0) * full_text_weight) as base_score
        FROM public.sensei_knowledge sk
        LEFT JOIN semantic_search ss ON sk.id = ss.id
        LEFT JOIN keyword_search ks ON sk.id = ks.id
        WHERE ss.id IS NOT NULL OR ks.id IS NOT NULL
    )
    SELECT
        c.id, c.title, c.content, c.category, c.tags,
        (c.base_score * (1 + (EXTRACT(EPOCH FROM c.created_at) / EXTRACT(EPOCH FROM NOW())) * time_weight))::float as similarity
    FROM combined_scores c
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;


-- ââ 6. COMMUNITY DECKS âââââââââââââââââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.community_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    jlpt_level TEXT,
    downloads_count INTEGER DEFAULT 0,
    upvotes_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_deck_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.community_decks(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    reading TEXT,
    meaning TEXT NOT NULL,
    example_sentence TEXT,
    example_translation TEXT,
    notes TEXT,
    order_index INTEGER DEFAULT 0
);

ALTER TABLE public.community_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_deck_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read published decks" ON public.community_decks FOR SELECT USING (is_published = true);
CREATE POLICY "Users manage own decks" ON public.community_decks FOR ALL USING (auth.uid() = author_id);
CREATE POLICY "Anyone read deck cards" ON public.community_deck_cards FOR SELECT USING (EXISTS (SELECT 1 FROM public.community_decks WHERE id = deck_id AND is_published = true));
CREATE POLICY "Users manage own deck cards" ON public.community_deck_cards FOR ALL USING (EXISTS (SELECT 1 FROM public.community_decks WHERE id = deck_id AND author_id = auth.uid()));

-- ââ 7. RPC TO FETCH PUBLIC COMMUNITY DECKS (UPGRADED) ââââââââââ
CREATE OR REPLACE FUNCTION public.get_community_decks()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  clone_count INT,
  owner_name TEXT,
  card_count BIGINT,
  tags TEXT[],
  jlpt_level TEXT,
  language TEXT,
  is_premium BOOLEAN,
  price_xp INTEGER,
  avg_rating DECIMAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.id,
    pd.title AS name,
    pd.description,
    pd.total_clones AS clone_count,
    p.display_name AS owner_name,
    (SELECT COUNT(*) FROM public.public_deck_items pdi WHERE pdi.deck_id = pd.id) AS card_count,
    pd.tags,
    pd.category AS jlpt_level,
    'ja-vi'::TEXT AS language,
    pd.is_premium,
    pd.price_xp,
    pd.avg_rating,
    pd.created_at
  ORDER BY pd.total_clones DESC, pd.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ââ 8. SEED DATA FOR CONTENT ââââââââââââââââââââââââââââââââââ
INSERT INTO public.reading_passages (title, content, translation, level, topic, vocabulary) VALUES
('NgÃ´i nhÃ  cá»§a tÃ´i', 'ç§ã®å®¶ã¯ããã¤ã«ããã¾ããã¨ã¦ããããã§ãã', 'NhÃ  cá»§a tÃ´i á» HÃ  Ná»i. NÃ³ ráº¥t Äáº¹p.', 'N5', 'Daily Life', '[{"word": "å®¶", "reading": "ãã¡", "meaning": "nhÃ "}, {"word": "ããã", "reading": "ããã", "meaning": "Äáº¹p"}]'),
('Sá» thÃ­ch cá»§a tÃ´i', 'ç§ã®è¶£å³ã¯æ¥æ¬èªãåå¼·ãããã¨ã§ãã', 'Sá» thÃ­ch cá»§a tÃ´i lÃ  há»c tiáº¿ng Nháº­t.', 'N5', 'Hobby', '[{"word": "è¶£å³", "reading": "ããã¿", "meaning": "sá» thÃ­ch"}, {"word": "åå¼·", "reading": "ã¹ãããã", "meaning": "há»c táº­p"}]')
ON CONFLICT DO NOTHING;

INSERT INTO public.shadowing_practices (title, transcript, translation, level) VALUES
('ChÃ o há»i buá»i sÃ¡ng', 'ãã¯ãããããã¾ãããåæ°ã§ããï¼', 'ChÃ o buá»i sÃ¡ng. Báº¡n cÃ³ khá»e khÃ´ng?', 'N5'),
('Giá»i thiá»u báº£n thÃ¢n', 'ã¯ããã¾ãã¦ããããã ããæ¥ã¾ããããããããé¡ããã¾ãã', 'Ráº¥t vui ÄÆ°á»£c gáº·p báº¡n. TÃ´i Äáº¿n tá»« Viá»t Nam. Ráº¥t mong ÄÆ°á»£c giÃºp Äá»¡.', 'N5')
ON CONFLICT DO NOTHING;

INSERT INTO public.roleplay_scenarios (title, description, setting, level, personas, goals) VALUES
('Táº¡i quÃ¡n cÃ  phÃª', 'Äáº·t Äá» uá»ng táº¡i má»t quÃ¡n cÃ  phÃª á» Tokyo.', 'Coffee Shop', 'N5', '[{"name": "Phá»¥c vá»¥", "role": "AI"}, {"name": "KhÃ¡ch hÃ ng", "role": "User"}]', '["Äáº·t má»t cá»c Cafe Latte", "Há»i vá» máº­t kháº©u Wifi"]'),
('Há»i ÄÆ°á»ng', 'Há»i ÄÆ°á»ng Äáº¿n ga Shinjuku.', 'Street', 'N4', '[{"name": "NgÆ°á»i qua ÄÆ°á»ng", "role": "AI"}, {"name": "KhÃ¡ch du lá»ch", "role": "User"}]', '["Há»i ÄÆ°á»ng Äáº¿n ga gáº§n nháº¥t", "Há»i máº¥t bao lÃ¢u Äá» Äi bá» Äáº¿n ÄÃ³"]')
ON CONFLICT DO NOTHING;


-- Seed Data for Reading Passages
INSERT INTO public.reading_passages (title, content, furigana_content, translation, level, category, topic, vocabulary, grammar, questions)
VALUES 
(
  'Con mèo l?c', 
  '????????????????????????????', 
  '<ruby>??<rt>????</rt></ruby>?<ruby>?<rt>??</rt></ruby>?<ruby>?<rt>??</rt></ruby>??????<ruby>?<rt>??</rt></ruby>?????<ruby>?<rt>??</rt></ruby>?<ruby>?<rt>?</rt></ruby>???????',
  'Có m?t con mèo tr?ng ? công viên. Con mèo dang r?t dói.',
  'N5',
  'Graded Reader',
  'Ð?ng v?t',
  '[{"word": "??", "reading": "????", "meaning": "công viên"}, {"word": "?", "reading": "??", "meaning": "con mèo"}]',
  '[{"pattern": "~?~????", "meaning": "Có ~ ? ~"}]',
  '[{"question": "Con mèo màu gì?", "options": ["Tr?ng", "Ðen", "Vàng"], "answer": 0, "explanation": "Trong bài vi?t ''???'' (mèo tr?ng)."}, {"question": "Con mèo dang ? dâu?", "options": ["Nhà", "Công viên", "Tru?ng h?c"], "answer": 1, "explanation": "Trong bài vi?t ''???'' (? công viên)."}]'
),
(
  'Mùa hoa anh dào',
  '????????????????????????????',
  '<ruby>??<rt>???</rt></ruby>?<ruby>?<rt>???</rt></ruby>????<ruby>??<rt>???</rt></ruby>????????<ruby>?<rt>??</rt></ruby>?<ruby>??<rt>???</rt></ruby>?<ruby>?<rt>?</rt></ruby>????',
  'Hoa anh dào nam nay r?t d?p. R?t nhi?u ngu?i di ng?m hoa.',
  'N3',
  'News',
  'Van hóa',
  '[{"word": "?", "reading": "???", "meaning": "hoa anh dào"}, {"word": "??", "reading": "???", "meaning": "ng?m hoa"}]',
  '[{"pattern": "~?????", "meaning": "Ði d? làm gì dó"}]',
  '[{"question": "M?i ngu?i di dâu?", "options": ["Ði làm", "Ði ng?m hoa", "Ði ng?"], "answer": 1, "explanation": "''???????'' nghia là di ng?m hoa."}]'
);

CREATE TABLE IF NOT EXISTS public.grammar_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    level VARCHAR(5) NOT NULL,
    usage TEXT,
    explanation TEXT NOT NULL,
    structure TEXT,
    examples JSONB DEFAULT '[]',
    comparisons JSONB DEFAULT '[]',
    category TEXT,
    lesson INTEGER,
    related_ids TEXT[] DEFAULT '{}',
    pitfall TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_grammar_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    grammar_id UUID REFERENCES public.grammar_points(id) ON DELETE CASCADE,
    mastery_score INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, grammar_id)
);

ALTER TABLE public.grammar_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_grammar_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read grammar points" ON public.grammar_points FOR SELECT USING (true);
CREATE POLICY "Users manage own grammar progress" ON public.user_grammar_progress FOR ALL USING (auth.uid() = user_id);

-- Seed Data for Grammar Points
INSERT INTO public.grammar_points (title, level, usage, explanation, examples, comparisons, category)
VALUES (
  '? vs ?', 
  'N5', 
  'N1 ? ... / N1 ? ...', 
  '? dùng d? nêu ch? d? (topic marker), ? dùng d? nh?n m?nh ch? th? hành d?ng ho?c thông tin m?i (subject marker).',
  '[{"japanese": "???????", "vietnamese": "Tôi là sinh viên. (Ch? d? là ''tôi'')", "reading": "???????????"}, {"japanese": "???????", "vietnamese": "CHÍNH TÔI là sinh viên. (Nh?n m?nh ''ai'' là sinh viên)", "reading": "???????????"}]',
  '[{"target": "?", "difference": "? nh?n m?nh ph?n v? ng? phía sau, ? nh?n m?nh ph?n ch? ng? phía tru?c."}]',
  'Tr? t?'
);


-- ===== supabase/clean_schema/02_learning/01_minna_no_nihongo.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: LEARNING — Minna No Nihongo System
-- Gộp từ: 20260501213926_cf845a59-bf9b-490c-a69e-85d042bccfd3
--         20260502111158_bf1eea33-0f3f-4204-9ab0-679cb9183bd3
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.minna_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook TEXT NOT NULL DEFAULT 'minna_n5',
  lesson_number INTEGER NOT NULL,
  title_jp TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📖',
  color TEXT DEFAULT '#3b82f6',
  jlpt_level TEXT DEFAULT 'N5',
  word_count INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT minna_lessons_textbook_lesson_unique UNIQUE(textbook, lesson_number)
);

CREATE TABLE IF NOT EXISTS public.minna_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.minna_lessons(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  textbook TEXT NOT NULL DEFAULT 'minna_n5',
  kanji TEXT,
  word TEXT NOT NULL,
  kana TEXT NOT NULL,
  romaji TEXT,
  hanviet TEXT,
  meaning_vi TEXT NOT NULL,
  meaning_en TEXT,
  example_jp TEXT,
  example_vi TEXT,
  example_en TEXT,
  part_of_speech TEXT,
  jlpt_level TEXT DEFAULT 'N5',
  tags TEXT[] DEFAULT '{}',
  audio_url TEXT,
  image_url TEXT,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_vocabulary_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES public.minna_vocabulary(id) ON DELETE CASCADE,
  mastery_level SMALLINT NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_earned INTEGER NOT NULL DEFAULT 0,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uvp_user_vocab_unique UNIQUE(user_id, vocabulary_id)
);

CREATE INDEX IF NOT EXISTS idx_minna_vocab_lesson ON public.minna_vocabulary(lesson_id);
CREATE INDEX IF NOT EXISTS idx_minna_vocab_lesson_num ON public.minna_vocabulary(textbook, lesson_number);
CREATE INDEX IF NOT EXISTS idx_uvp_user_next ON public.user_vocabulary_progress(user_id, next_review_at);

ALTER TABLE public.minna_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minna_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocabulary_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lessons readable" ON public.minna_lessons FOR SELECT USING (true);
CREATE POLICY "Vocab readable" ON public.minna_vocabulary FOR SELECT USING (true);
CREATE POLICY "Users view own progress" ON public.user_vocabulary_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.user_vocabulary_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.user_vocabulary_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own progress" ON public.user_vocabulary_progress FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_minna_lesson_word_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  IF (TG_OP = 'INSERT') AND NEW.lesson_id IS NOT NULL THEN
    UPDATE public.minna_lessons SET word_count = word_count + 1 WHERE id = NEW.lesson_id;
  ELSIF (TG_OP = 'DELETE') AND OLD.lesson_id IS NOT NULL THEN
    UPDATE public.minna_lessons SET word_count = GREATEST(0, word_count - 1) WHERE id = OLD.lesson_id;
  END IF;
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_minna_vocab_count ON public.minna_vocabulary;
CREATE TRIGGER trg_minna_vocab_count AFTER INSERT OR DELETE ON public.minna_vocabulary
  FOR EACH ROW EXECUTE FUNCTION public.update_minna_lesson_word_count();

CREATE OR REPLACE FUNCTION public.update_vocab_progress(p_vocabulary_id UUID, p_quality INTEGER)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_user_id UUID := auth.uid(); v_prog public.user_vocabulary_progress; v_new_interval INTEGER; v_new_ef REAL; v_new_reps INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_prog FROM public.user_vocabulary_progress WHERE user_id = v_user_id AND vocabulary_id = p_vocabulary_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_vocabulary_progress (user_id, vocabulary_id) VALUES (v_user_id, p_vocabulary_id) RETURNING * INTO v_prog;
  END IF;
  
  IF p_quality >= 3 THEN
    IF v_prog.repetitions = 0 THEN v_new_interval := 1;
    ELSIF v_prog.repetitions = 1 THEN v_new_interval := 6;
    ELSE v_new_interval := ROUND(v_prog.interval_days * v_prog.ease_factor); END IF;
    v_new_reps := v_prog.repetitions + 1;
    v_new_ef := v_prog.ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
  ELSE
    v_new_interval := 1; v_new_reps := 0; v_new_ef := v_prog.ease_factor;
  END IF;
  v_new_ef := GREATEST(1.3, v_new_ef);
  
  UPDATE public.user_vocabulary_progress SET
    ease_factor = v_new_ef, interval_days = v_new_interval, repetitions = v_new_reps,
    mastery_level = LEAST(5, GREATEST(0, v_new_reps))::SMALLINT,
    last_reviewed_at = NOW(), next_review_at = NOW() + (v_new_interval || ' days')::INTERVAL,
    correct_count = correct_count + CASE WHEN p_quality >= 3 THEN 1 ELSE 0 END,
    incorrect_count = incorrect_count + CASE WHEN p_quality < 3 THEN 1 ELSE 0 END,
    xp_earned = xp_earned + CASE WHEN p_quality >= 3 THEN 10 ELSE 2 END
  WHERE user_id = v_user_id AND vocabulary_id = p_vocabulary_id
  RETURNING * INTO v_prog;
  
  RETURN row_to_json(v_prog);
END;
$fn$;


-- ===== supabase/clean_schema/02_learning/02_video_learning.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: VIDEO LEARNING — Sources, Segments, Progress, Saved Content
-- ═══════════════════════════════════════════════════════════════

-- ── 1. VIDEO SOURCES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.video_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER, -- in seconds
  thumbnail_url TEXT,
  jlpt_level TEXT DEFAULT 'N5',
  processed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. VIDEO SEGMENTS (AI Processed) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.video_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.video_sources(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  start_time FLOAT NOT NULL,
  end_time FLOAT NOT NULL,
  japanese_text TEXT NOT NULL,
  vietnamese_text TEXT,
  grammar_notes JSONB DEFAULT '[]',
  vocabulary JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(video_id, segment_index)
);

-- ── 3. USER PROGRESS & SAVED CONTENT ──────────────────────────
CREATE TABLE IF NOT EXISTS public.user_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.video_segments(id) ON DELETE CASCADE,
  user_input TEXT,
  score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 1,
  status TEXT DEFAULT 'learning' CHECK (status IN ('learning', 'mastered')),
  last_practiced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, segment_id)
);

CREATE TABLE IF NOT EXISTS public.saved_sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  japanese_text TEXT NOT NULL,
  vietnamese_text TEXT,
  video_id UUID REFERENCES public.video_sources(id) ON DELETE SET NULL,
  segment_id UUID REFERENCES public.video_segments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. FAVORITE VIDEOS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorite_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.video_sources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- ── 5. PUBLIC VIEW (hides creator info) ─────────────────────────
CREATE OR REPLACE VIEW public.video_sources_public
WITH (security_invoker=on) AS
  SELECT
    id,
    youtube_id,
    title,
    description,
    duration,
    thumbnail_url,
    jlpt_level,
    processed,
    created_at,
    updated_at
  FROM public.video_sources
  WHERE processed = true;

GRANT SELECT ON public.video_sources_public TO anon, authenticated;

-- ── 6. RLS POLICIES ───────────────────────────────────────────
ALTER TABLE public.video_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_videos ENABLE ROW LEVEL SECURITY;

-- video_sources: public can view processed; creators can view & manage their own
DROP POLICY IF EXISTS "Anyone view processed videos" ON public.video_sources;
CREATE POLICY "Public view processed videos" ON public.video_sources FOR SELECT USING (processed = true OR auth.uid() = created_by);
CREATE POLICY "Creators manage own videos" ON public.video_sources FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Anyone view segments of processed videos" ON public.video_segments FOR SELECT
USING (EXISTS (SELECT 1 FROM public.video_sources WHERE id = video_id AND processed = true));

CREATE POLICY "Users manage own video progress" ON public.user_video_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own saved sentences" ON public.saved_sentences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own favorites" ON public.favorite_videos FOR ALL USING (auth.uid() = user_id);

-- ── 7. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_video_segments_video_id ON public.video_segments(video_id);
CREATE INDEX IF NOT EXISTS idx_user_video_progress_user ON public.user_video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_sentences_user ON public.saved_sentences(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_videos_user ON public.favorite_videos(user_id);



-- ===== supabase/clean_schema/03_classroom/00_full_classroom_system.sql =====
-- âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
-- DOMAIN: CLASSROOM & LESSONS â Classrooms, Members, Assignments, Progress
-- Gá»p tá»«: 20260508_classroom_system, 20260508_lesson_system
-- âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

-- ââ 1. THÃM ROLE TEACHER âââââââââââââââââââââââââââââââââââââââ
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'teacher') THEN
    ALTER TYPE public.app_role ADD VALUE 'teacher';
  END IF;
END $$;

-- ââ 2. Báº¢NG Lá»P Há»C ââââââââââââââââââââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.classrooms (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          text NOT NULL,
    description   text,
    jlpt_level    text DEFAULT 'N5',
    invite_code   text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    is_active     boolean DEFAULT true,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON public.classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_invite_code ON public.classrooms(invite_code);

-- ââ 3. THÃNH VIÃN Lá»P ââââââââââââââââââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.class_members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at   timestamptz DEFAULT now(),
    UNIQUE(class_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_class_members_class ON public.class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user  ON public.class_members(user_id);

-- ââ 4. NHIá»M Vá»¤ GIAO (ASSIGNMENTS) ââââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.class_assignments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id      uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         text NOT NULL,
    description   text,
    assignment_type  text NOT NULL DEFAULT 'exam', -- 'exam' | 'vocab' | 'reading'
    exam_id       uuid REFERENCES public.mock_exams(id) ON DELETE SET NULL,
    vocab_config  jsonb DEFAULT '{}',
    deadline      timestamptz,
    is_active     boolean DEFAULT true,
    created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_class_assignments_class ON public.class_assignments(class_id);

-- ââ 5. TIáº¾N Äá» NHIá»M Vá»¤ Cá»¦A Há»C SINH ââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.class_assignment_progress (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   uuid NOT NULL REFERENCES public.class_assignments(id) ON DELETE CASCADE,
    class_id        uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_result_id  uuid REFERENCES public.mock_exam_results(id) ON DELETE SET NULL,
    score           integer,
    max_score       integer,
    is_completed    boolean DEFAULT false,
    completed_at    timestamptz,
    UNIQUE(assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cap_assignment ON public.class_assignment_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_cap_user       ON public.class_assignment_progress(user_id);

-- ââ 6. BÃI GIáº¢NG (LESSONS) âââââââââââââââââââââââââââââââââââââ
CREATE TABLE IF NOT EXISTS public.lessons (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id         uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title            text NOT NULL,
    description      text,
    cover_image_url  text,
    is_published     boolean DEFAULT false,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON public.lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class   ON public.lessons(class_id);

CREATE TABLE IF NOT EXISTS public.lesson_slides (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id      uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    order_index    integer NOT NULL DEFAULT 0,
    slide_type     text NOT NULL DEFAULT 'content' CHECK (slide_type IN ('content', 'question')),
    title          text,
    body           text,
    image_url      text,
    image_caption  text,
    question_text  text,
    options        jsonb DEFAULT '[]',
    correct_index  integer,
    explanation    text,
    created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_slides_lesson ON public.lesson_slides(lesson_id);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
    lesson_id         uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_slide_index  integer DEFAULT 0,
    answers           jsonb DEFAULT '{}',
    completed_at      timestamptz,
    updated_at        timestamptz DEFAULT now(),
    PRIMARY KEY (lesson_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);


-- ââ 7. RLS & POLICIES ââââââââââââââââââââââââââââââââââââââââââ
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_assignment_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher manages own classrooms" ON public.classrooms FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Members can view their classrooms" ON public.classrooms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.class_members WHERE class_id = classrooms.id AND user_id = auth.uid()));
CREATE POLICY "Admin full access classrooms" ON public.classrooms FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teacher views class members" ON public.class_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.classrooms WHERE id = class_members.class_id AND teacher_id = auth.uid()));
CREATE POLICY "Teacher deletes class members" ON public.class_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.classrooms WHERE id = class_members.class_id AND teacher_id = auth.uid()));
CREATE POLICY "Student views own membership" ON public.class_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Student leaves class" ON public.class_members FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin full access class_members" ON public.class_members FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teacher manages assignments" ON public.class_assignments FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Student views class assignments" ON public.class_assignments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.class_members WHERE class_id = class_assignments.class_id AND user_id = auth.uid()));

CREATE POLICY "Student views own progress" ON public.class_assignment_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Teacher views all progress" ON public.class_assignment_progress FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.classrooms WHERE id = class_assignment_progress.class_id AND teacher_id = auth.uid()));
CREATE POLICY "System upsert progress" ON public.class_assignment_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ââ 12. SKILL ANALYTICS LOGIC (UPGRADED) ââââââââââââââââââââââ
CREATE OR REPLACE FUNCTION public.process_exam_skill_metrics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_q RECORD;
    v_user_answer INT;
    v_cat TEXT;
    v_is_correct BOOLEAN;
    v_metrics JSONB := '{}'::jsonb;
BEGIN
    FOR v_q IN SELECT * FROM public.mock_exam_questions WHERE exam_id = NEW.exam_id LOOP
        v_user_answer := (NEW.answers->>v_q.id::text)::int;
        v_cat := COALESCE(v_q.category, 'General');
        
        IF v_user_answer IS NOT NULL THEN
            v_is_correct := (v_user_answer = v_q.correct_index);
            
            -- Update local exam summary
            v_metrics := v_metrics || jsonb_build_object(
                v_cat, 
                jsonb_build_object(
                    'correct', COALESCE((v_metrics->v_cat->>'correct')::int, 0) + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
                    'total', COALESCE((v_metrics->v_cat->>'total')::int, 0) + 1
                )
            );

            -- Update global user metrics
            INSERT INTO public.user_skill_metrics (user_id, category, total_correct, total_questions, last_updated)
            VALUES (NEW.user_id, v_cat, (CASE WHEN v_is_correct THEN 1 ELSE 0 END), 1, NOW())
            ON CONFLICT (user_id, category) DO UPDATE SET
                total_correct = user_skill_metrics.total_correct + EXCLUDED.total_correct,
                total_questions = user_skill_metrics.total_questions + EXCLUDED.total_questions,
                last_updated = NOW();
        END IF;
    END LOOP;

    -- Update the result record with category breakdown
    UPDATE public.mock_exam_results SET category_scores = v_metrics WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_exam_metrics ON public.mock_exam_results;
CREATE TRIGGER trg_process_exam_metrics AFTER INSERT ON public.mock_exam_results FOR EACH ROW EXECUTE FUNCTION public.process_exam_skill_metrics();

-- RPC cho giÃ¡o viÃªn xem bÃ¡o cÃ¡o chi tiáº¿t
CREATE OR REPLACE FUNCTION public.get_class_skill_analytics(p_class_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    skills JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.display_name,
        jsonb_object_agg(usm.category, jsonb_build_object(
            'correct', usm.total_correct,
            'total', usm.total_questions,
            'percent', CASE WHEN usm.total_questions > 0 THEN (usm.total_correct::float / usm.total_questions * 100) ELSE 0 END
        )) as skills
    FROM public.class_members cm
    JOIN public.profiles p ON cm.user_id = p.user_id
    LEFT JOIN public.user_skill_metrics usm ON cm.user_id = usm.user_id
    WHERE cm.class_id = p_class_id
    GROUP BY p.user_id, p.display_name;
END;
$$;

CREATE POLICY "Teacher manages own lessons" ON public.lessons FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Class members view published lessons" ON public.lessons FOR SELECT TO authenticated USING (is_published = true AND (class_id IS NULL OR EXISTS (SELECT 1 FROM public.class_members WHERE class_id = lessons.class_id AND user_id = auth.uid())));
CREATE POLICY "Admin full access lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teacher manages own slides" ON public.lesson_slides FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.lessons WHERE id = lesson_slides.lesson_id AND teacher_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.lessons WHERE id = lesson_slides.lesson_id AND teacher_id = auth.uid()));
CREATE POLICY "Members view slides of published lessons" ON public.lesson_slides FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_slides.lesson_id AND l.is_published = true AND (l.class_id IS NULL OR EXISTS (SELECT 1 FROM public.class_members cm WHERE cm.class_id = l.class_id AND cm.user_id = auth.uid()))));

CREATE POLICY "Student manages own progress" ON public.lesson_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Teacher views class progress" ON public.lesson_progress FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_progress.lesson_id AND l.teacher_id = auth.uid()));


-- ââ 8. RPCS / FUNCTIONS âââââââââââââââââââââââââââââââââââââââââ
CREATE OR REPLACE FUNCTION public.join_class_by_code(p_code text)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid; v_class public.classrooms%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
    SELECT * INTO v_class FROM public.classrooms WHERE invite_code = upper(trim(p_code)) AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'MÃ£ lá»p khÃ´ng há»£p lá» hoáº·c lá»p ÄÃ£ ÄÃ³ng'; END IF;
    IF EXISTS (SELECT 1 FROM public.class_members WHERE class_id = v_class.id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Báº¡n ÄÃ£ lÃ  thÃ nh viÃªn cá»§a lá»p nÃ y';
    END IF;
    IF v_class.teacher_id = v_user_id THEN RAISE EXCEPTION 'Báº¡n lÃ  giÃ¡o viÃªn cá»§a lá»p nÃ y'; END IF;

    INSERT INTO public.class_members (class_id, user_id) VALUES (v_class.id, v_user_id);
    INSERT INTO public.class_assignment_progress (assignment_id, class_id, user_id)
    SELECT id, v_class.id, v_user_id FROM public.class_assignments WHERE class_id = v_class.id AND is_active = true
    ON CONFLICT (assignment_id, user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'class_id', v_class.id, 'class_name', v_class.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_class_student_progress(p_class_id uuid)
RETURNS TABLE (
    user_id uuid, display_name text, avatar_url text, total_xp integer, current_streak integer, weekly_xp integer, exams_done bigint, avg_score numeric
) AS $$
DECLARE v_teacher_id uuid;
BEGIN
    SELECT teacher_id INTO v_teacher_id FROM public.classrooms WHERE id = p_class_id;
    IF v_teacher_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Access denied'; END IF;

    RETURN QUERY
    SELECT
        p.user_id, p.display_name, p.avatar_url, COALESCE(p.total_xp, 0), COALESCE(p.current_streak, 0),
        COALESCE(p.weekly_xp, 0)::integer,
        COALESCE(
            (SELECT COUNT(*) 
             FROM public.mock_exam_results mer
             JOIN public.class_assignments ca ON ca.exam_id = mer.exam_id 
             WHERE mer.user_id = p.user_id AND ca.class_id = p_class_id), 0
        )::bigint,
        COALESCE(
            (SELECT AVG(score)
             FROM public.mock_exam_results mer
             JOIN public.class_assignments ca ON ca.exam_id = mer.exam_id 
             WHERE mer.user_id = p.user_id AND ca.class_id = p_class_id), 0.0
        )::numeric
    FROM public.class_members cm
    JOIN public.profiles p ON p.user_id = cm.user_id
    WHERE cm.class_id = p_class_id ORDER BY total_xp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: create progress for new assignment
CREATE OR REPLACE FUNCTION public.create_progress_for_new_assignment() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.class_assignment_progress (assignment_id, class_id, user_id)
    SELECT NEW.id, NEW.class_id, cm.user_id FROM public.class_members cm WHERE cm.class_id = NEW.class_id
    ON CONFLICT (assignment_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_new_assignment_progress ON public.class_assignments;
CREATE TRIGGER trg_new_assignment_progress AFTER INSERT ON public.class_assignments FOR EACH ROW EXECUTE FUNCTION public.create_progress_for_new_assignment();

CREATE OR REPLACE FUNCTION public.sync_exam_result_to_assignment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.class_assignment_progress cap
    SET
        exam_result_id = NEW.id,
        score          = NEW.score,
        max_score      = NEW.max_score,
        is_completed   = true,
        completed_at   = NOW()
    FROM public.class_assignments ca
    WHERE ca.exam_id = NEW.exam_id
      AND cap.assignment_id = ca.id
      AND cap.user_id = NEW.user_id
      AND cap.is_completed = false;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_exam_to_assignment ON public.mock_exam_results;
CREATE TRIGGER trg_sync_exam_to_assignment
    AFTER INSERT ON public.mock_exam_results
    FOR EACH ROW EXECUTE FUNCTION public.sync_exam_result_to_assignment();

-- -- 9. PH? HUYNH & H?C SINH (PARENT-STUDENT) -------------------
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token  text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    status        text DEFAULT 'pending', -- 'pending' | 'active'
    created_at    timestamptz DEFAULT now(),
    UNIQUE(parent_id, student_id)
);

-- -- 10. L?P H?C TR?C TUY?N (LIVE SESSIONS) ----------------------
CREATE TABLE IF NOT EXISTS public.live_sessions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id      uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         text NOT NULL,
    description   text,
    start_time    timestamptz NOT NULL,
    end_time      timestamptz,
    meeting_link  text NOT NULL,
    platform      text DEFAULT 'Google Meet', -- Zoom, Google Meet, etc.
    is_active     boolean DEFAULT true,
    created_at    timestamptz DEFAULT now()
);

-- -- 11. C?P NH?T LO?I BÀI T?P ----------------------------------
-- Thêm c?t tham chi?u bài d?c và ng? pháp cho assignments
ALTER TABLE public.class_assignments ADD COLUMN IF NOT EXISTS reading_id uuid REFERENCES public.reading_passages(id) ON DELETE SET NULL;
ALTER TABLE public.class_assignments ADD COLUMN IF NOT EXISTS grammar_id uuid REFERENCES public.grammar_points(id) ON DELETE SET NULL;

-- RLS cho b?ng m?i
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage own links" ON public.parent_student_links FOR ALL TO authenticated USING (parent_id = auth.uid());
CREATE POLICY "Students see their parent links" ON public.parent_student_links FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Teacher manages live sessions" ON public.live_sessions FOR ALL TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Members view class live sessions" ON public.live_sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.class_members WHERE class_id = live_sessions.class_id AND user_id = auth.uid()));


-- ===== supabase/clean_schema/04_social_pets/00_full_pet_system.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: SOCIAL & PETS — Pet System, Inventory, Crafting, Squads
-- Gộp từ: 20260505_create_pet_system, 20260506_pet_expansion,
--          20260508_pet_recipes, 20260509_pet_cooldown_fix,
--          20260510_unlimited_pet_evolution, 20260402000000_create_evolved_skills,
--          20260526_fix_evolved_skills_columns, 20260301_create_social_features,
--          20260402210000_advanced_squad_features
-- ═══════════════════════════════════════════════════════════════

-- ── 1. CẤU HÌNH TIẾN HÓA CƠ BẢN ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_evolution_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_type TEXT NOT NULL,
  evolution_level INTEGER NOT NULL,
  xp_required INTEGER NOT NULL,
  form_name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  UNIQUE (pet_type, evolution_level)
);

INSERT INTO public.pet_evolution_config (pet_type, evolution_level, xp_required, form_name, emoji) VALUES
  ('kitune', 3, 2000, 'Cửu Vĩ Hồ',      '🦊🔥'),
  ('dragon', 0, 0,    'Trứng Rồng',    '🥚'),
  ('dragon', 1, 200,  'Rồng con',      '🐲'),
  ('dragon', 2, 800,  'Hỏa Long',      '🐉')
ON CONFLICT (pet_type, evolution_level) DO NOTHING;

-- ── 2. BẢNG PET CỦA NGƯỜI DÙNG ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_type TEXT NOT NULL DEFAULT 'kitune',
  pet_name TEXT,
  evolution_level INTEGER NOT NULL DEFAULT 0,
  pet_xp INTEGER NOT NULL DEFAULT 0,
  happiness INTEGER NOT NULL DEFAULT 100,
  hunger INTEGER NOT NULL DEFAULT 100,
  energy INTEGER NOT NULL DEFAULT 100,
  status TEXT DEFAULT 'active',
  active_buffs JSONB DEFAULT '[]'::jsonb,
  attribute_points INTEGER NOT NULL DEFAULT 0,
  str INTEGER NOT NULL DEFAULT 5,
  int INTEGER NOT NULL DEFAULT 5,
  luk INTEGER NOT NULL DEFAULT 5,
  def INTEGER NOT NULL DEFAULT 0,
  hp INTEGER NOT NULL DEFAULT 100,
  max_hp INTEGER NOT NULL DEFAULT 100,
  last_fed_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_pet UNIQUE (user_id)
);

-- ── 3. DANH MỤC THỨC ĂN (FOOD ITEMS) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.food_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  cost_coins INTEGER NOT NULL DEFAULT 0,
  happiness_bonus INTEGER NOT NULL DEFAULT 0,
  pet_xp_bonus INTEGER NOT NULL DEFAULT 0,
  hunger_restore INTEGER NOT NULL DEFAULT 0,
  energy_restore INTEGER NOT NULL DEFAULT 0,
  hp_restore INTEGER DEFAULT 0,
  is_revive BOOLEAN DEFAULT false
);

INSERT INTO public.food_items (id, name, emoji, description, cost_coins, happiness_bonus, pet_xp_bonus, hunger_restore, energy_restore) VALUES
  ('onigiri',  'Onigiri',  '🍙', 'Cơm nắm truyền thống, no bụng và ngon miệng',       50,  15, 20, 50, 10),
  ('sushi',    'Sushi',    '🍣', 'Sushi cao cấp, bổ sung nhiều XP cho Pet',           150, 20, 60, 40, 20),
  ('ramen',    'Ramen',    '🍜', 'Tô mì nóng hổi, bổ sung năng lượng',              100, 25, 40, 70, 30),
  ('dango',    'Dango',    '🍡', 'Bánh tròn ngọt ngào, pet nhảy múa vui vẻ',         60,  18, 25, 30, 15),
  ('matcha',   'Matcha',   '🍵', 'Trà xanh thư giãn, giúp pet tỉnh táo',             40,  10, 15, 20, 25),
  ('taiyaki',  'Taiyaki',  '🐟', 'Bánh cá nướng thơm lừng, pet cực kỳ yêu thích',    120, 30, 50, 60, 20),
  ('mochi',    'Mochi',    '🍡', 'Bánh mochi dẻo thơm, pet cảm thấy ấm áp',          70,  22, 20, 40, 10),
  ('tempura',      'Tempura',      '🍤', 'Tôm chiên giòn rụm, pet thích mê',               90,  22, 35, 55, 15),
  ('soba',         'Soba',         '🍜', 'Mì soba mát lạnh, thanh nhẹ',                     60,  15, 25, 45, 20),
  ('udon',         'Udon',         '🍝', 'Mì udon dai ngon, nước dùng đậm đà',              85,  20, 30, 60, 20),
  ('takoyaki',     'Takoyaki',     '🐙', 'Bánh bạch tuộc nóng hổi, pet nhảy cẫng lên',      75,  25, 28, 35, 10),
  ('yakisoba',     'Yakisoba',     '🥟', 'Mì xào thập cẩm thơm ngon',                       80,  18, 32, 50, 15),
  ('sakura_mochi', 'Sakura Mochi', '🌸', 'Bánh mochi vị hoa anh đào, tinh tế và ngọt ngào', 65,  28, 22, 25, 10),
  ('ramune',       'Ramune',       '🥤', 'Nước ngọt Nhật Bản, giải khát mùa hè',             30,  8,  10, 10, 15),
  ('calpis',       'Calpis',       '🥛', 'Sữa chua uống thơm mát, pet yêu thích',           35,  10, 12, 15, 15),
  ('kakigori',     'Kakigori',     '🍧', 'Đá bào Nhật Bản, ngọt lạnh và vui nhộn',           45,  20, 18, 20, 5),
  ('dorayaki',     'Dorayaki',     '🥞', 'Bánh rán truyền thống, thơm mùi đậu đỏ',          55,  25, 20, 35, 10),
  ('anmitsu',      'Anmitsu',      '🍨', 'Tráng miệng thạch thập cẩm, ngọt mát',            70,  22, 25, 30, 10),
  ('omurice',      'Omurice',      '🍳', 'Cơm trứng bọc bên ngoài, sốt cà chua ngon tuyệt', 95,  25, 35, 65, 25)
ON CONFLICT (id) DO UPDATE SET cost_coins = EXCLUDED.cost_coins, happiness_bonus = EXCLUDED.happiness_bonus, pet_xp_bonus = EXCLUDED.pet_xp_bonus, hunger_restore = EXCLUDED.hunger_restore, energy_restore = EXCLUDED.energy_restore;

-- ── 4. KHO ĐỒ PET (INVENTORY) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.food_items(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

-- ── 5. CÔNG THỨC CHẾ TẠO (RECIPES) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_recipes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  ingredients JSONB NOT NULL,
  result_item_id TEXT REFERENCES public.food_items(id),
  special_effect TEXT,
  craft_coins_cost INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.pet_recipes (id, name, emoji, description, ingredients, result_item_id, special_effect, craft_coins_cost) VALUES
  ('bento_co_ban',   'Bento Cơ Bản',    '🍱', 'Cơm hộp đơn giản từ onigiri và tempura',        '[{"itemId":"onigiri","quantity":1},{"itemId":"tempura","quantity":1}]',  NULL,        'feast',   40),
  ('set_tra_dao',    'Set Trà Đạo',     '🍵', 'Set trà đạo thanh lịch với matcha và mochi',     '[{"itemId":"matcha","quantity":1},{"itemId":"mochi","quantity":1}]',    NULL,        'bliss',   50),
  ('dai_tiec',       'Đại Tiệc',        '🎉', 'Bữa đại tiệc xa hoa với sushi, tempura và ramune','[{"itemId":"sushi","quantity":1},{"itemId":"tempura","quantity":1},{"itemId":"ramune","quantity":1}]', NULL, 'feast',  100),
  ('banh_trang_mieng','Bánh Tráng Miệng','🍰', 'Bộ sưu tập đồ ngọt: dorayaki + anmitsu + kakigori','[{"itemId":"dorayaki","quantity":1},{"itemId":"anmitsu","quantity":1},{"itemId":"kakigori","quantity":1}]', NULL, 'bliss', 70),
  ('omurice_dac_biet','Omurice Đặc Biệt','🍳', 'Omurice cao cấp kèm takoyaki và calpis',         '[{"itemId":"omurice","quantity":1},{"itemId":"takoyaki","quantity":1},{"itemId":"calpis","quantity":1}]', NULL, 'energy', 80)
ON CONFLICT (id) DO UPDATE SET craft_coins_cost = EXCLUDED.craft_coins_cost;

ON CONFLICT (id) DO NOTHING;

-- ── 6. CÁC BẢNG TRACKING (COOLDOWN & STATS) ────────────────────
CREATE TABLE IF NOT EXISTS public.pet_action_cooldowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    last_action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, action_type)
);

CREATE TABLE IF NOT EXISTS public.pet_tickle_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_tickle_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    daily_xp_count INTEGER NOT NULL DEFAULT 0,
    last_reset_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pet_history (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_type      TEXT        NOT NULL,
  pet_name      TEXT,
  evolution_level INTEGER   DEFAULT 1,
  max_pet_xp    INTEGER     DEFAULT 0,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pet_history_user_id ON public.pet_history (user_id);

-- ── 7. EVOLVED SKILLS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_evolved_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('vocabulary', 'pronunciation', 'grammar')),
    status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered', 'in_progress', 'mastered')),
    challenge_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    xp_reward INTEGER DEFAULT 50,
    jlpt_level TEXT CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours')
);

CREATE INDEX IF NOT EXISTS idx_evolved_skills_user_status ON public.user_evolved_skills(user_id, status);
CREATE INDEX IF NOT EXISTS idx_evolved_skills_expires ON public.user_evolved_skills(expires_at);

-- ── 8. STUDY SQUADS (Nhóm học tập) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_squads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp BIGINT DEFAULT 0,
    weekly_xp BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.squad_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID REFERENCES public.study_squads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(squad_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.squad_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id UUID NOT NULL REFERENCES public.study_squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Bật Realtime cho squad_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_messages;

-- ── 8.5 SQUAD TOURNAMENT LOGIC (UPGRADED) ─────────────────────
CREATE OR REPLACE FUNCTION public.reward_top_squads()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_squad RECORD; v_reward_coins INT; v_ranking INT := 1; v_results JSONB := '[]'::jsonb;
BEGIN
  -- Note: This should be called by a cron job or admin
  FOR v_squad IN 
    SELECT * FROM public.study_squads WHERE weekly_xp > 0 ORDER BY weekly_xp DESC LIMIT 3
  LOOP
    IF v_ranking = 1 THEN v_reward_coins := 1000;
    ELSIF v_ranking = 2 THEN v_reward_coins := 500;
    ELSE v_reward_coins := 250; END IF;

    -- Thưởng cho toàn bộ thành viên trong nhóm
    UPDATE public.profiles 
    SET pet_coins = pet_coins + v_reward_coins 
    WHERE user_id IN (SELECT user_id FROM public.squad_members WHERE squad_id = v_squad.id);

    v_results := v_results || jsonb_build_object('squad_name', v_squad.name, 'rank', v_ranking, 'reward', v_reward_coins);
    v_ranking := v_ranking + 1;
  END LOOP;

  -- Reset weekly XP cho tất cả Squad
  UPDATE public.study_squads SET weekly_xp = 0;
  
  RETURN v_results;
END;
$$;

-- ── 9. CHALLENGES (Thách đấu) ──────────────────────────────────
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

-- ── 10. RLS & POLICIES ─────────────────────────────────────────
ALTER TABLE public.user_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_tickle_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_evolved_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pet" ON public.user_pets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read food_items" ON public.food_items FOR SELECT USING (true);
CREATE POLICY "Users can manage own inventory" ON public.pet_inventory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read recipes" ON public.pet_recipes FOR SELECT USING (true);
CREATE POLICY "Users can manage own tickle stats" ON public.pet_tickle_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own pet history" ON public.pet_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pet history" ON public.pet_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own evolved skills" ON public.user_evolved_skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own evolved skills" ON public.user_evolved_skills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Services can insert evolved skills" ON public.user_evolved_skills FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
CREATE POLICY "Anyone can view squads" ON public.study_squads FOR SELECT USING (true);
CREATE POLICY "Squad members can view fellow members" ON public.squad_members FOR SELECT USING (EXISTS (SELECT 1 FROM public.squad_members sm WHERE sm.squad_id = squad_id AND sm.user_id = auth.uid()));
CREATE POLICY "Squad members can manage own messages" ON public.squad_messages FOR ALL USING (EXISTS (SELECT 1 FROM public.squad_members WHERE squad_id = squad_messages.squad_id AND user_id = auth.uid()));
CREATE POLICY "Public read squad goals" ON public.squad_goals FOR SELECT USING (true);
CREATE POLICY "Users can view their own challenges" ON public.challenges FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);


-- ── 11. HÀM TIỆN ÍCH (HELPER FUNCTIONS) ────────────────────────
-- Hàm kiểm tra cooldown động
CREATE OR REPLACE FUNCTION public.check_pet_cooldown(p_action TEXT DEFAULT 'general', p_interval INTERVAL DEFAULT '1 second')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_last_action TIMESTAMPTZ;
BEGIN
  SELECT last_action_at INTO v_last_action FROM public.pet_action_cooldowns WHERE user_id = auth.uid() AND action_type = p_action;
  IF v_last_action IS NOT NULL AND now() - v_last_action < p_interval THEN
    RAISE EXCEPTION 'Pet action on cooldown' USING HINT = format('Wait for %s', p_interval);
  END IF;
  INSERT INTO public.pet_action_cooldowns (user_id, action_type, last_action_at) 
  VALUES (auth.uid(), p_action, now()) 
  ON CONFLICT (user_id, action_type) DO UPDATE SET last_action_at = now();
END;
$$;

-- Các hàm tính toán level tiến hóa không giới hạn
CREATE OR REPLACE FUNCTION public.get_pet_level_requirement(p_level INTEGER)
RETURNS BIGINT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    v_total_xp BIGINT := 0;
    v_req BIGINT := 500;
    i INTEGER;
BEGIN
    IF p_level <= 0 THEN RETURN 0; END IF;
    IF p_level = 1 THEN RETURN 500; END IF;
    FOR i IN 2..p_level LOOP
        v_total_xp := v_total_xp + v_req;
        v_req := v_total_xp + (v_req * 1.5)::BIGINT;
    END LOOP;
    RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pet_level_from_xp(p_xp BIGINT)
RETURNS INTEGER LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    v_level INTEGER := 0;
    v_total_needed BIGINT := 0;
    v_current_req BIGINT := 500;
BEGIN
    WHILE p_xp >= (v_total_needed + v_current_req) LOOP
        v_total_needed := v_total_needed + v_current_req;
        v_level := v_level + 1;
        v_current_req := v_total_needed + (v_current_req * 1.5)::BIGINT;
    END LOOP;
    RETURN v_level;
END;
$$;


-- ── 12. RPCs (TƯƠNG TÁC PET) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_pet()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pet JSONB;
BEGIN
  SELECT row_to_json(up) INTO v_pet FROM public.user_pets up WHERE up.user_id = auth.uid();
  RETURN v_pet;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_pet(p_pet_type TEXT DEFAULT 'kitune')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_xp INTEGER;
  v_initial_pet_xp INTEGER;
  v_pet JSONB;
BEGIN
  SELECT COALESCE(total_xp, 0) INTO v_user_xp FROM public.profiles WHERE user_id = auth.uid();
  v_initial_pet_xp := GREATEST(0, FLOOR(v_user_xp / 10));
  INSERT INTO public.user_pets (user_id, pet_type, pet_name, pet_xp)
  VALUES (auth.uid(), p_pet_type, 'Kitsune', v_initial_pet_xp)
  ON CONFLICT (user_id) DO UPDATE SET pet_type = EXCLUDED.pet_type, pet_name = EXCLUDED.pet_name, updated_at = now()
  RETURNING row_to_json(user_pets) INTO v_pet;
  RETURN v_pet;
END;
$$;

CREATE OR REPLACE FUNCTION public.rename_pet(p_name TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pet JSONB;
BEGIN
  UPDATE public.user_pets SET pet_name = p_name, updated_at = now() WHERE user_id = auth.uid() RETURNING row_to_json(user_pets) INTO v_pet;
  RETURN v_pet;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_inventory()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT COALESCE((SELECT jsonb_agg(jsonb_build_object('item_id', pi.item_id, 'quantity', pi.quantity)) FROM public.pet_inventory pi WHERE pi.user_id = auth.uid()), '[]'::jsonb) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.feed_pet()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pet JSONB; v_coins_cost INTEGER := 50;
BEGIN
  PERFORM check_pet_cooldown('feed', '3 hours');
  UPDATE public.profiles SET pet_coins = pet_coins - v_coins_cost WHERE user_id = auth.uid() AND pet_coins >= v_coins_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not enough Pet Coins' USING HINT = format('need %s coins', v_coins_cost); END IF;
  
  INSERT INTO public.xp_events (user_id, source, amount, metadata) VALUES (auth.uid(), 'pet_feed', 0, jsonb_build_object('action', 'feed_pet', 'coins_cost', v_coins_cost));
  UPDATE public.user_pets SET happiness = LEAST(100, happiness + 15), pet_xp = pet_xp + 20, energy = LEAST(100, energy + 10), last_fed_at = now(), last_interaction_at = now(), updated_at = now() WHERE user_id = auth.uid() RETURNING row_to_json(user_pets) INTO v_pet;
  RETURN v_pet;
END;
$$;

CREATE OR REPLACE FUNCTION public.pet_interact()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pet JSONB;
BEGIN
  PERFORM check_pet_cooldown('interact', '10 minutes');
  UPDATE public.user_pets SET happiness = LEAST(100, happiness + 5), last_interaction_at = now(), updated_at = now() WHERE user_id = auth.uid() RETURNING row_to_json(user_pets) INTO v_pet;
  INSERT INTO public.xp_events (user_id, source, amount, metadata) VALUES (auth.uid(), 'pet_interact', 0, jsonb_build_object('action', 'pet_interact'));
  RETURN v_pet;
END;
$$;

CREATE OR REPLACE FUNCTION public.play_with_pet()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pet public.user_pets%ROWTYPE; v_coins_cost INTEGER := 10; v_energy_cost INTEGER := 15;
BEGIN
  PERFORM check_pet_cooldown('play', '1 hour');
  SELECT * INTO v_pet FROM public.user_pets WHERE user_id = auth.uid();
  IF v_pet.energy < v_energy_cost THEN RAISE EXCEPTION 'Pet is too tired to play' USING HINT = 'need 15 Energy'; END IF;

  UPDATE public.profiles SET pet_coins = pet_coins - v_coins_cost WHERE user_id = auth.uid() AND pet_coins >= v_coins_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not enough Pet Coins' USING HINT = format('need %s coins', v_coins_cost); END IF;

  INSERT INTO public.xp_events (user_id, source, amount, metadata) VALUES (auth.uid(), 'pet_play', 0, jsonb_build_object('action', 'play_with_pet', 'coins_cost', v_coins_cost));
  
  UPDATE public.user_pets 
  SET happiness = LEAST(100, happiness + 15), 
      pet_xp = pet_xp + 20, 
      energy = energy - v_energy_cost, 
      last_interaction_at = now(), 
      updated_at = now() 
  WHERE user_id = auth.uid() RETURNING * INTO v_pet;
  
  RETURN row_to_json(v_pet);
END;
$$;

CREATE OR REPLACE FUNCTION public.bathe_pet()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pet public.user_pets%ROWTYPE; v_coins_cost INTEGER := 15;
BEGIN
  PERFORM check_pet_cooldown('bathe', '6 hours');
  
  UPDATE public.profiles SET pet_coins = pet_coins - v_coins_cost WHERE user_id = auth.uid() AND pet_coins >= v_coins_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not enough Pet Coins' USING HINT = format('need %s coins', v_coins_cost); END IF;

  INSERT INTO public.xp_events (user_id, source, amount, metadata) VALUES (auth.uid(), 'pet_bathe', 0, jsonb_build_object('action', 'bathe_pet', 'coins_cost', v_coins_cost));
  
  UPDATE public.user_pets 
  SET happiness = LEAST(100, happiness + 10), 
      energy = LEAST(100, energy + 25), 
      last_interaction_at = now(), 
      updated_at = now() 
  WHERE user_id = auth.uid() RETURNING * INTO v_pet;
  
  RETURN row_to_json(v_pet);
END;
$$;

CREATE OR REPLACE FUNCTION public.walk_pet()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pet public.user_pets%ROWTYPE; v_coins_cost INTEGER := 5; v_energy_cost INTEGER := 30;
BEGIN
  PERFORM check_pet_cooldown('walk', '4 hours');
  SELECT * INTO v_pet FROM public.user_pets WHERE user_id = auth.uid();
  IF v_pet.energy < v_energy_cost THEN RAISE EXCEPTION 'Pet is too tired for a walk' USING HINT = 'need 30 Energy'; END IF;

  UPDATE public.profiles SET pet_coins = pet_coins - v_coins_cost WHERE user_id = auth.uid() AND pet_coins >= v_coins_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not enough Pet Coins' USING HINT = format('need %s coins', v_coins_cost); END IF;

  INSERT INTO public.xp_events (user_id, source, amount, metadata) VALUES (auth.uid(), 'pet_walk', 0, jsonb_build_object('action', 'walk_pet', 'coins_cost', v_coins_cost));
  
  UPDATE public.user_pets 
  SET happiness = LEAST(100, happiness + 20), 
      pet_xp = pet_xp + 40, 
      energy = energy - v_energy_cost, 
      last_interaction_at = now(), 
      updated_at = now() 
  WHERE user_id = auth.uid() RETURNING * INTO v_pet;
  
  RETURN row_to_json(v_pet);
END;
$$;

CREATE OR REPLACE FUNCTION public.pet_sleep()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pet JSONB;
BEGIN
  PERFORM check_pet_cooldown('sleep', '12 hours');
  UPDATE public.user_pets SET energy = LEAST(100, energy + 30), happiness = GREATEST(0, happiness - 3), last_interaction_at = now(), updated_at = now() WHERE user_id = auth.uid() RETURNING row_to_json(user_pets) INTO v_pet;
  INSERT INTO public.xp_events (user_id, source, amount, metadata) VALUES (auth.uid(), 'pet_sleep', 0, jsonb_build_object('action', 'pet_sleep'));
  RETURN v_pet;
END;
$$;

CREATE OR REPLACE FUNCTION public.pet_tickle_game(p_score INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_happiness_gain INT; v_pet_xp_gain INT; v_pet JSONB; v_stats public.pet_tickle_stats%ROWTYPE;
  v_cooldown INTERVAL := '30 seconds'; v_daily_max INTEGER := 500;
BEGIN
  SELECT * INTO v_stats FROM public.pet_tickle_stats WHERE user_id = auth.uid();
  IF v_stats.user_id IS NULL THEN INSERT INTO public.pet_tickle_stats (user_id) VALUES (auth.uid()) RETURNING * INTO v_stats; END IF;
  IF v_stats.last_reset_at < date_trunc('day', now()) THEN v_stats.daily_xp_count := 0; v_stats.last_reset_at := now(); END IF;
  IF now() - v_stats.last_tickle_at < v_cooldown THEN RAISE EXCEPTION 'Tickle game on cooldown' USING HINT = 'wait 30 seconds'; END IF;
  IF v_stats.daily_xp_count >= v_daily_max THEN RAISE EXCEPTION 'Daily tickle XP limit reached' USING HINT = 'try again tomorrow'; END IF;

  v_happiness_gain := LEAST(p_score, 20);
  v_pet_xp_gain := LEAST(FLOOR(p_score / 2), v_daily_max - v_stats.daily_xp_count);

  UPDATE public.user_pets SET happiness = LEAST(100, happiness + v_happiness_gain), pet_xp = pet_xp + v_pet_xp_gain, last_interaction_at = now(), updated_at = now() WHERE user_id = auth.uid() RETURNING row_to_json(user_pets) INTO v_pet;
  UPDATE public.pet_tickle_stats SET last_tickle_at = now(), daily_xp_count = daily_xp_count + v_pet_xp_gain, last_reset_at = v_stats.last_reset_at WHERE user_id = auth.uid();
  INSERT INTO public.xp_events (user_id, source, amount, metadata) VALUES (auth.uid(), 'pet_play', 0, jsonb_build_object('action', 'tickle_game', 'score', p_score, 'happiness_gain', v_happiness_gain, 'pet_xp_gain', v_pet_xp_gain));
  RETURN v_pet;
END;
$$;

CREATE OR REPLACE FUNCTION public.use_food_item(p_item_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item public.food_items%ROWTYPE; v_pet JSONB;
BEGIN
  PERFORM check_pet_cooldown('feed', '3 hours');
  SELECT * INTO v_item FROM public.food_items WHERE id = p_item_id;
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Food item not found'; END IF;
  UPDATE public.pet_inventory SET quantity = quantity - 1 WHERE user_id = auth.uid() AND item_id = p_item_id AND quantity > 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not in inventory'; END IF;
  
  UPDATE public.user_pets 
  SET happiness = LEAST(100, happiness + v_item.happiness_bonus), 
      pet_xp = pet_xp + v_item.pet_xp_bonus, 
      hunger = LEAST(100, hunger + v_item.hunger_restore), 
      energy = LEAST(100, energy + v_item.energy_restore),
      last_fed_at = now(), 
      last_interaction_at = now(), 
      updated_at = now() 
  WHERE user_id = auth.uid() RETURNING row_to_json(user_pets) INTO v_pet;
  
  INSERT INTO public.xp_events (user_id, source, amount, metadata) VALUES (auth.uid(), 'pet_feed', 0, jsonb_build_object('action', 'use_food_item', 'item_id', p_item_id));
  DELETE FROM public.pet_inventory WHERE user_id = auth.uid() AND quantity <= 0;
  RETURN v_pet;
END;
$$;

CREATE OR REPLACE FUNCTION public.buy_food_item(p_item_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cost INTEGER; v_result JSONB;
BEGIN
  PERFORM check_pet_cooldown('shop', '1 second');
  SELECT cost_coins INTO v_cost FROM public.food_items WHERE id = p_item_id;
  IF v_cost IS NULL THEN RAISE EXCEPTION 'Food item not found'; END IF;
  
  UPDATE public.profiles SET pet_coins = pet_coins - v_cost WHERE user_id = auth.uid() AND pet_coins >= v_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not enough Pet Coins' USING HINT = format('need %s coins', v_cost); END IF;
  
  INSERT INTO public.xp_events (user_id, source, amount, metadata) VALUES (auth.uid(), 'pet_shop', 0, jsonb_build_object('action', 'buy_food', 'item_id', p_item_id, 'cost', v_cost));
  INSERT INTO public.pet_inventory (user_id, item_id, quantity) VALUES (auth.uid(), p_item_id, 1) ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = pet_inventory.quantity + 1;
  SELECT jsonb_build_object('item_id', pi.item_id, 'quantity', pi.quantity) INTO v_result FROM public.pet_inventory pi WHERE pi.user_id = auth.uid() AND pi.item_id = p_item_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.craft_item(p_recipe_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_recipe public.pet_recipes%ROWTYPE; v_ingredient JSONB; v_item_id TEXT; v_qty INTEGER; v_pet JSONB;
BEGIN
  PERFORM check_pet_cooldown('craft', '2 seconds');
  SELECT * INTO v_recipe FROM public.pet_recipes WHERE id = p_recipe_id;
  IF v_recipe.id IS NULL THEN RAISE EXCEPTION 'Recipe not found'; END IF;
  
  UPDATE public.profiles SET pet_coins = pet_coins - v_recipe.craft_coins_cost WHERE user_id = auth.uid() AND pet_coins >= v_recipe.craft_coins_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not enough Pet Coins' USING HINT = format('need %s coins', v_recipe.craft_coins_cost); END IF;

  FOR v_ingredient IN SELECT * FROM jsonb_array_elements(v_recipe.ingredients) LOOP
    v_item_id := v_ingredient->>'itemId'; v_qty := (v_ingredient->>'quantity')::INTEGER;
    UPDATE public.pet_inventory SET quantity = quantity - v_qty WHERE user_id = auth.uid() AND item_id = v_item_id AND quantity >= v_qty;
    IF NOT FOUND THEN RAISE EXCEPTION 'Missing ingredient: %', v_item_id; END IF;
  END LOOP;

  INSERT INTO public.xp_events (user_id, source, amount, metadata) VALUES (auth.uid(), 'pet_craft', 0, jsonb_build_object('recipe_id', p_recipe_id, 'cost', v_recipe.craft_coins_cost));

  IF v_recipe.special_effect = 'feast' THEN
    UPDATE public.user_pets SET happiness = LEAST(100, happiness + 20), pet_xp = pet_xp + 40, hunger = LEAST(100, hunger + 50), last_interaction_at = now(), updated_at = now() WHERE user_id = auth.uid() RETURNING row_to_json(user_pets) INTO v_pet;
  ELSIF v_recipe.special_effect = 'bliss' THEN
    UPDATE public.user_pets SET happiness = LEAST(100, happiness + 35), pet_xp = pet_xp + 30, hunger = LEAST(100, hunger + 30), last_interaction_at = now(), updated_at = now() WHERE user_id = auth.uid() RETURNING row_to_json(user_pets) INTO v_pet;
  ELSIF v_recipe.special_effect = 'energy' THEN
    UPDATE public.user_pets SET happiness = LEAST(100, happiness + 15), pet_xp = pet_xp + 35, energy = LEAST(100, energy + 40), hunger = LEAST(100, hunger + 45), last_interaction_at = now(), updated_at = now() WHERE user_id = auth.uid() RETURNING row_to_json(user_pets) INTO v_pet;
  END IF;

  DELETE FROM public.pet_inventory WHERE user_id = auth.uid() AND quantity <= 0;
  RETURN jsonb_build_object('pet', v_pet, 'recipe', row_to_json(v_recipe));
END;
$$;


-- ── 13. TRIGGERS (SYNC XP & EVOLUTION) ─────────────────────────
CREATE OR REPLACE FUNCTION public.sync_pet_xp_from_events()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pet_xp_gain INTEGER;
BEGIN
  IF NEW.amount <= 0 THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_pets WHERE user_id = NEW.user_id) THEN RETURN NEW; END IF;
  v_pet_xp_gain := FLOOR(NEW.amount * 0.1);
  IF v_pet_xp_gain <= 0 THEN RETURN NEW; END IF;
  UPDATE public.user_pets SET pet_xp = pet_xp + v_pet_xp_gain, updated_at = now() WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pet_xp ON public.xp_events;
CREATE TRIGGER trg_sync_pet_xp AFTER INSERT ON public.xp_events FOR EACH ROW EXECUTE FUNCTION public.sync_pet_xp_from_events();

CREATE OR REPLACE FUNCTION public.check_pet_evolution()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
  v_new_evolution INTEGER;
  v_levels_gained INTEGER;
  v_str_gain INT := 0; v_int_gain INT := 0; v_luk_gain INT := 0; v_hp_gain INT := 0;
BEGIN
  v_new_evolution := public.get_pet_level_from_xp(NEW.pet_xp);
  IF v_new_evolution > NEW.evolution_level THEN 
    v_levels_gained := v_new_evolution - NEW.evolution_level;
    
    -- Dynamic Growth based on pet_type (Kitsune: INT/LUK, Dragon: STR/HP)
    IF NEW.pet_type = 'kitune' THEN
      v_int_gain := v_levels_gained * 2; v_luk_gain := v_levels_gained * 1; v_hp_gain := v_levels_gained * 10;
    ELSIF NEW.pet_type = 'dragon' THEN
      v_str_gain := v_levels_gained * 2; v_hp_gain := v_levels_gained * 25;
    ELSE
      v_str_gain := v_levels_gained; v_int_gain := v_levels_gained; v_luk_gain := v_levels_gained; v_hp_gain := v_levels_gained * 15;
    END IF;

    NEW.evolution_level := v_new_evolution;
    NEW.attribute_points := COALESCE(NEW.attribute_points, 0) + (v_levels_gained * 3);
    NEW.str := NEW.str + v_str_gain;
    NEW.int := NEW.int + v_int_gain;
    NEW.luk := NEW.luk + v_luk_gain;
    NEW.max_hp := NEW.max_hp + v_hp_gain;
    NEW.hp := NEW.max_hp; -- Restore HP on level up
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_pet_evolution ON public.user_pets;
CREATE TRIGGER trg_check_pet_evolution BEFORE UPDATE OF pet_xp ON public.user_pets FOR EACH ROW EXECUTE FUNCTION public.check_pet_evolution();

-- Trigger tự động kiểm tra thành tựu khi Pet tiến hóa
CREATE OR REPLACE FUNCTION public.trigger_check_pet_achievements()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.evolution_level > OLD.evolution_level THEN
    PERFORM public.check_achievements(NEW.user_id, 'pet_evolution');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pet_achievement_check ON public.user_pets;
CREATE TRIGGER trg_pet_achievement_check AFTER UPDATE OF evolution_level ON public.user_pets FOR EACH ROW EXECUTE FUNCTION public.trigger_check_pet_achievements();


-- ===== supabase/clean_schema/04_social_pets/01_rpg_combat_adventure.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: SOCIAL & PETS — RPG, Combat, Adventure, Gear, Materials
-- Gộp từ: 20260516_pet_combat_monsters, 20260518_pet_consumables,
--          20260522_pet_attributes_and_materials, 20260525_pet_crafting_system,
--          a6913d59-0bb2-4da8-8a34-d380d530e6fc (pet_adventure)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. VẬT LIỆU (MATERIALS) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    rarity TEXT DEFAULT 'common'
);

INSERT INTO public.pet_materials (id, name, description, emoji, rarity) VALUES
('wood_scrap', 'Gỗ Vụn', 'Nguyên liệu cơ bản từ rừng.', '🪵', 'common'),
('iron_ore', 'Quặng Sắt', 'Dùng để rèn vũ khí và giáp.', '🪨', 'uncommon'),
('magic_crystal', 'Pha Lê Phép Thuật', 'Chứa sức mạnh bí ẩn.', '💎', 'rare'),
('dragon_scale', 'Vảy Rồng', 'Rất hiếm, dùng để rèn đồ huyền thoại.', '🐉', 'epic')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_pet_materials (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    material_id TEXT REFERENCES public.pet_materials(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, material_id)
);

-- ── 2. TRANG BỊ (GEAR) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_gear (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- weapon, armor, accessory
    description TEXT,
    emoji TEXT,
    image_url TEXT,
    str_bonus INTEGER DEFAULT 0,
    int_bonus INTEGER DEFAULT 0,
    luk_bonus INTEGER DEFAULT 0,
    hp_bonus INTEGER DEFAULT 0
);

INSERT INTO public.pet_gear (id, name, type, description, emoji, str_bonus, int_bonus, luk_bonus, hp_bonus) VALUES
('wooden_sword', 'Kiếm Gỗ', 'weapon', 'Thô sơ nhưng hiệu quả.', '🗡️', 2, 0, 0, 0),
('iron_shield', 'Khiên Sắt', 'armor', 'Bảo vệ Pet tốt hơn.', '🛡️', 0, 1, 0, 50),
('lucky_amulet', 'Bùa May Mắn', 'accessory', 'Tăng vận may khi thám hiểm.', '🧿', 0, 0, 5, 0),
('magic_wand', 'Trượng Phép', 'weapon', 'Tăng uy lực tuyệt chiêu.', '🪄', 0, 4, 0, 10)
ON CONFLICT (id) DO UPDATE SET
    str_bonus = EXCLUDED.str_bonus, int_bonus = EXCLUDED.int_bonus,
    luk_bonus = EXCLUDED.luk_bonus, hp_bonus = EXCLUDED.hp_bonus;

CREATE TABLE IF NOT EXISTS public.user_pet_gear (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gear_id TEXT REFERENCES public.pet_gear(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, gear_id)
);

-- Cập nhật bảng pet_recipes (đã tạo ở file 00_full_pet_system) để thêm 레시피 chế tạo Gear
-- (Dùng chung bảng pet_recipes nhưng thêm cột output_gear_id và cost_coins nếu chưa có)
ALTER TABLE public.pet_recipes ADD COLUMN IF NOT EXISTS output_gear_id TEXT REFERENCES public.pet_gear(id);
ALTER TABLE public.pet_recipes ADD COLUMN IF NOT EXISTS cost_coins INTEGER DEFAULT 0;

INSERT INTO public.pet_recipes (id, name, emoji, description, ingredients, output_gear_id, cost_coins) VALUES
('recipe_wooden_sword', 'Chế Kiếm Gỗ', '🗡️', 'Cần gỗ', '{"wood_scrap": 5}', 'wooden_sword', 100),
('recipe_iron_shield', 'Chế Khiên Sắt', '🛡️', 'Cần sắt', '{"wood_scrap": 2, "iron_ore": 8}', 'iron_shield', 300),
('recipe_lucky_amulet', 'Chế Bùa May Mắn', '🧿', 'Cần pha lê', '{"magic_crystal": 3, "wood_scrap": 5}', 'lucky_amulet', 500),
('recipe_magic_wand', 'Chế Trượng Phép', '🪄', 'Cần pha lê và sắt', '{"magic_crystal": 10, "iron_ore": 2}', 'magic_wand', 800)
ON CONFLICT (id) DO NOTHING;

-- ── 3. QUÁI VẬT (MONSTERS) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_monsters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '👾',
    image_url TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    hp INTEGER NOT NULL DEFAULT 100,
    attack INTEGER NOT NULL DEFAULT 10,
    defense INTEGER NOT NULL DEFAULT 5,
    element TEXT DEFAULT 'neutral', -- fire, water, grass, neutral
    xp_reward INTEGER DEFAULT 50,
    coin_reward INTEGER DEFAULT 20,
    loot_table JSONB DEFAULT '[]' -- [{"item_id": "wood_scrap", "chance": 0.5}]
);

INSERT INTO public.pet_monsters (name, description, emoji, level, hp, attack, element, xp_reward, coin_reward) VALUES
('Slime Lười Biếng', 'Rất yếu, thích hợp để khởi động.', '💧', 1, 50, 5, 'water', 20, 10),
('Mộc Nhân', 'Bù nhìn gỗ dùng để tập luyện.', '🪵', 2, 100, 8, 'grass', 40, 15),
('Tiểu Hỏa Hồ', 'Cáo lửa nhỏ, có thể phun lửa.', '🔥', 3, 150, 15, 'fire', 80, 30),
('Goblin Trộm Cắp', 'Nhanh nhẹn và hay ăn trộm đồ.', '👺', 4, 120, 20, 'neutral', 100, 50)
ON CONFLICT DO NOTHING;

-- ── 4. THÁM HIỂM (ADVENTURE) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_adventure_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    level_req INTEGER DEFAULT 1,
    energy_cost INTEGER DEFAULT 10,
    duration_minutes INTEGER DEFAULT 30,
    emoji TEXT DEFAULT '🗺️',
    image_url TEXT,
    base_xp_reward INTEGER DEFAULT 50,
    base_coin_reward INTEGER DEFAULT 20,
    possible_loot JSONB DEFAULT '[]' -- Danh sách ID quái vật hoặc vật phẩm
);

INSERT INTO public.pet_adventure_areas (name, description, level_req, energy_cost, duration_minutes, emoji, base_xp_reward, base_coin_reward) VALUES
('Khu Rừng Khởi Đầu', 'Nơi an toàn cho các Pet mới tập thám hiểm.', 1, 10, 15, '🌲', 50, 20),
('Hang Động Tối Tăm', 'Nhiều quặng sắt nhưng nguy hiểm hơn.', 3, 20, 30, '🦇', 100, 50),
('Thung Lũng Tinh Thể', 'Nơi tìm thấy Pha lê phép thuật.', 5, 30, 60, '💎', 200, 100)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.pet_expeditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    area_id UUID REFERENCES public.pet_adventure_areas(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'exploring' CHECK (status IN ('exploring', 'completed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT now(),
    ends_at TIMESTAMPTZ,
    loot_obtained JSONB DEFAULT '{}', -- {"coins": 50, "items": {"wood_scrap": 2}}
    xp_gained INTEGER DEFAULT 0
);

-- ── 5. CỬA HÀNG & VẬT PHẨM TIÊU HAO ────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    type TEXT NOT NULL, -- consumable, cosmetic
    category TEXT,
    effect_value INTEGER,
    image_url TEXT
);

INSERT INTO public.pet_shop_items (name, description, price, type, category, effect_value, image_url) VALUES 
('Thuốc Hồi Phục', 'Hồi phục 50 HP ngay lập tức.', 200, 'consumable', 'health', 50, 'https://cdn-icons-png.flaticon.com/512/1043/1043445.png'),
('Nước Tăng Lực', 'Hồi 30 Thể lực để tiếp tục viễn chinh.', 150, 'consumable', 'stamina', 30, 'https://cdn-icons-png.flaticon.com/512/3121/3121784.png'),
('Cỏ Hồi Sinh', 'Hồi sinh Pet từ trạng thái ngất xỉu.', 500, 'consumable', 'revive', 20, 'https://cdn-icons-png.flaticon.com/512/1043/1043441.png'),
('Sách Kinh Nghiệm', 'Tặng 500 Pet XP ngay lập tức.', 1000, 'consumable', 'xp', 500, 'https://cdn-icons-png.flaticon.com/512/3308/3308562.png')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_pet_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.pet_shop_items(id),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE public.pet_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pet_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pet_gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_monsters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_adventure_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_expeditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pet_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read materials" ON public.pet_materials FOR SELECT USING (true);
CREATE POLICY "Users manage own materials" ON public.user_pet_materials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public read gear" ON public.pet_gear FOR SELECT USING (true);
CREATE POLICY "Users manage own gear" ON public.user_pet_gear FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public read monsters" ON public.pet_monsters FOR SELECT USING (true);
CREATE POLICY "Public read adventure areas" ON public.pet_adventure_areas FOR SELECT USING (true);
CREATE POLICY "Users manage own expeditions" ON public.pet_expeditions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public read shop items" ON public.pet_shop_items FOR SELECT USING (true);
CREATE POLICY "Users manage own inventory" ON public.user_pet_inventory FOR ALL USING (auth.uid() = user_id);

-- ── 10.5 OPTIMIZATIONS (INDEXES & REALTIME) ───────────────────
CREATE INDEX IF NOT EXISTS idx_user_pet_gear_user ON public.user_pet_gear(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pet_materials_user ON public.user_pet_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_expeditions_user_status ON public.pet_expeditions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pet_monsters_level ON public.pet_monsters(level);

-- Bật Realtime để UI cập nhật thanh tiến trình thám hiểm và máu Pet
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_pets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pet_expeditions;

-- ── 11. RPG CALCULATION & CRAFTING (UPGRADED) ──────────────────
-- Hàm tính toán chỉ số tổng (Base + Gear + Buffs)
CREATE OR REPLACE FUNCTION public.calculate_pet_total_stats(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pet RECORD; v_gear RECORD; v_total_hp INT; v_total_str INT; v_total_def INT; v_total_luk INT;
BEGIN
  SELECT * INTO v_pet FROM public.user_pets WHERE user_id = p_user_id;
  SELECT COALESCE(SUM(pg.str_bonus), 0) as str, COALESCE(SUM(pg.def_bonus), 0) as def, COALESCE(SUM(pg.luk_bonus), 0) as luk, COALESCE(SUM(pg.hp_bonus), 0) as hp
  INTO v_gear FROM public.user_pet_gear upg JOIN public.pet_gear pg ON pg.id = upg.gear_id
  WHERE upg.user_id = p_user_id AND upg.is_equipped = true;

  v_total_hp := v_pet.max_hp + v_gear.hp;
  v_total_str := v_pet.str + v_gear.str;
  v_total_def := v_pet.def + v_gear.def;
  v_total_luk := v_pet.luk + v_gear.luk;

  RETURN jsonb_build_object('str', v_total_str, 'def', v_total_def, 'luk', v_total_luk, 'hp', v_pet.hp, 'max_hp', v_total_hp);
END;
$$;

-- Hàm chế tạo trang bị (Upgrade: Luck-based success)
CREATE OR REPLACE FUNCTION public.craft_pet_gear(p_gear_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_gear RECORD; v_pet RECORD; v_user_coins INT; v_success_chance FLOAT; v_recipe RECORD; v_mat_id TEXT; v_mat_qty INT;
BEGIN
  SELECT * INTO v_gear FROM public.pet_gear WHERE id = p_gear_id;
  SELECT * INTO v_recipe FROM public.pet_recipes WHERE output_gear_id = p_gear_id;
  SELECT * INTO v_pet FROM public.user_pets WHERE user_id = auth.uid();
  SELECT pet_coins INTO v_user_coins FROM public.profiles WHERE user_id = auth.uid();
  
  IF v_recipe.id IS NULL THEN RAISE EXCEPTION 'No recipe found for this gear'; END IF;
  IF v_user_coins < v_recipe.cost_coins THEN RAISE EXCEPTION 'Not enough coins (need %)', v_recipe.cost_coins; END IF;
  
  -- Check materials
  FOR v_mat_id, v_mat_qty IN SELECT * FROM jsonb_each_text(v_recipe.ingredients) LOOP
    IF NOT EXISTS (SELECT 1 FROM public.user_pet_materials WHERE user_id = auth.uid() AND material_id = v_mat_id AND quantity >= v_mat_qty::INTEGER) THEN
      RAISE EXCEPTION 'Not enough material: %', v_mat_id;
    END IF;
  END LOOP;

  -- Consume coins and materials
  UPDATE public.profiles SET pet_coins = pet_coins - v_recipe.cost_coins WHERE user_id = auth.uid();
  FOR v_mat_id, v_mat_qty IN SELECT * FROM jsonb_each_text(v_recipe.ingredients) LOOP
    UPDATE public.user_pet_materials SET quantity = quantity - v_mat_qty::INTEGER WHERE user_id = auth.uid() AND material_id = v_mat_id;
  END LOOP;
  
  -- Tỷ lệ thành công: 70% + (LUK * 1%)
  v_success_chance := 0.7 + (v_pet.luk * 0.01);
  
  IF random() < v_success_chance THEN
    INSERT INTO public.user_pet_gear (user_id, gear_id, quantity) VALUES (auth.uid(), p_gear_id, 1) ON CONFLICT (user_id, gear_id) DO UPDATE SET quantity = user_pet_gear.quantity + 1;
    RETURN jsonb_build_object('success', true, 'message', 'Chế tạo thành công!', 'gear', v_gear.name);
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Chế tạo thất bại... Nguyên liệu đã mất.');
  END IF;
END;
$$;

-- Hàm mặc trang bị
CREATE OR REPLACE FUNCTION public.equip_pet_gear(p_gear_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_gear_type TEXT;
BEGIN
  SELECT pg.type INTO v_gear_type FROM public.pet_gear pg WHERE pg.id = p_gear_id;
  -- Tháo các đồ cùng loại đang mặc
  UPDATE public.user_pet_gear SET is_equipped = false FROM public.pet_gear pg WHERE public.user_pet_gear.gear_id = pg.id AND pg.type = v_gear_type AND public.user_pet_gear.user_id = auth.uid();
  -- Mặc đồ mới
  UPDATE public.user_pet_gear SET is_equipped = true WHERE gear_id = p_gear_id AND user_id = auth.uid() AND quantity > 0;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── HÀM NHẬN THƯỞNG VIỄN CHINH ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_expedition_rewards(p_expedition_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expedition RECORD; v_area RECORD; v_pet RECORD; v_luck INTEGER; v_loot_id TEXT; v_loot_chance FLOAT; v_result JSONB;
  v_rarity_roll FLOAT; v_rarity TEXT;
BEGIN
  SELECT * INTO v_expedition FROM public.pet_expeditions WHERE id = p_expedition_id AND user_id = auth.uid() AND status = 'exploring';
  IF NOT FOUND THEN RAISE EXCEPTION 'Expedition not found or already claimed'; END IF;
  IF v_expedition.ends_at > now() THEN RAISE EXCEPTION 'Expedition not finished yet'; END IF;

  SELECT * INTO v_area FROM public.pet_adventure_areas WHERE id = v_expedition.area_id;
  SELECT * INTO v_pet FROM public.user_pets WHERE user_id = auth.uid();
  v_luck := COALESCE(v_pet.luk, 5);

  UPDATE public.pet_expeditions SET status = 'completed' WHERE id = p_expedition_id;
  UPDATE public.user_pets SET pet_xp = pet_xp + COALESCE(v_area.base_xp_reward, 50) WHERE user_id = auth.uid();
  UPDATE public.profiles SET pet_coins = COALESCE(pet_coins, 0) + COALESCE(v_area.base_coin_reward, 20) WHERE user_id = auth.uid();

  v_loot_chance := 0.2 + (v_luck * 0.01);
  IF random() < v_loot_chance THEN
    v_rarity_roll := random() + (v_luck * 0.005);
    IF v_rarity_roll > 0.95 THEN v_rarity := 'epic';
    ELSIF v_rarity_roll > 0.80 THEN v_rarity := 'rare';
    ELSIF v_rarity_roll > 0.50 THEN v_rarity := 'uncommon';
    ELSE v_rarity := 'common'; END IF;

    SELECT id INTO v_loot_id FROM public.pet_materials WHERE rarity = v_rarity ORDER BY random() LIMIT 1;
    IF v_loot_id IS NULL THEN SELECT id INTO v_loot_id FROM public.pet_materials WHERE rarity = 'common' ORDER BY random() LIMIT 1; END IF;

    INSERT INTO public.user_pet_materials (user_id, material_id, quantity) VALUES (auth.uid(), v_loot_id, 1) ON CONFLICT (user_id, material_id) DO UPDATE SET quantity = user_pet_materials.quantity + 1;
    v_result := jsonb_build_object('xp', v_area.base_xp_reward, 'coins', v_area.base_coin_reward, 'loot_id', v_loot_id, 'rarity', v_rarity);
  ELSE
    v_result := jsonb_build_object('xp', v_area.base_xp_reward, 'coins', v_area.base_coin_reward, 'loot_id', null);
  END IF;

  RETURN v_result;
END;
$$;

-- ── HÀM TĂNG ĐIỂM KỸ NĂNG CƠ BẢN ────────────────────────────────
CREATE OR REPLACE FUNCTION public.spend_attribute_point(p_attr TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pet JSONB;
BEGIN
  IF NOT (p_attr IN ('str', 'int', 'luk')) THEN RAISE EXCEPTION 'Invalid attribute'; END IF;
  UPDATE public.user_pets SET 
    attribute_points = attribute_points - 1,
    str = CASE WHEN p_attr = 'str' THEN str + 1 ELSE str END,
    int = CASE WHEN p_attr = 'int' THEN int + 1 ELSE int END,
    luk = CASE WHEN p_attr = 'luk' THEN luk + 1 ELSE luk END
  WHERE user_id = auth.uid() AND attribute_points > 0
  RETURNING row_to_json(user_pets) INTO v_pet;
  RETURN v_pet;
END;
$$;


-- ===== supabase/clean_schema/04_social_pets/02_pvp_and_social_expansion.sql =====
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


-- ===== supabase/clean_schema/04_social_pets/03_friendships_and_activity.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: SOCIAL INTERACTIONS — Friendships, Followers, Activity Feed
-- ═══════════════════════════════════════════════════════════════

-- ── 1. FRIENDSHIPS & FOLLOWERS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

CREATE INDEX idx_friendships_users ON public.friendships(sender_id, receiver_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);

-- ── 2. ACTIVITY FEED (Learning Events) ────────────────────────
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'exam_completed', 'achievement_unlocked', 'streak_milestone', 'pet_evolved', 'class_joined'
    content JSONB NOT NULL, -- { title, description, value, link }
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activities_user_date ON public.user_activities(user_id, created_at DESC);

-- ── 3. RLS POLICIES ───────────────────────────────────────────
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Friendships: Users see their own relationships
CREATE POLICY "Users view own friendships" ON public.friendships 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users manage own friendships" ON public.friendships 
FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Activities: Public can see public, Friends see friends, Owners see private
CREATE POLICY "Activity visibility policy" ON public.user_activities
FOR SELECT USING (
    visibility = 'public' OR
    (visibility = 'friends' AND EXISTS (
        SELECT 1 FROM public.friendships 
        WHERE status = 'accepted' 
        AND ((sender_id = auth.uid() AND receiver_id = user_id) OR (sender_id = user_id AND receiver_id = auth.uid()))
    )) OR
    auth.uid() = user_id
);

CREATE POLICY "Users create own activities" ON public.user_activities 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 4. HELPER FUNCTIONS ────────────────────────────────────────

-- Hàm tự động ghi lại hoạt động khi có thành tựu mới
CREATE OR REPLACE FUNCTION public.log_achievement_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_activities (user_id, type, content)
    VALUES (
        NEW.user_id, 
        'achievement_unlocked', 
        jsonb_build_object(
            'title', 'Đã mở khóa thành tựu!',
            'achievement_id', NEW.achievement_id,
            'timestamp', NOW()
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_achievement_activity
AFTER INSERT ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION public.log_achievement_activity();

-- ── 5. STORAGE BUCKETS (Metadata only - creation via dashboard) ──
-- Note: Policy for 'avatars' and 'banners' buckets
/*
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars', 'banners'));
CREATE POLICY "Users Upload own files" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('avatars', 'banners') AND (storage.foldername(name))[1] = auth.uid()::text);
*/


-- ===== supabase/clean_schema/04_social_pets/04_realtime_chat.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: REAL-TIME CHAT — Conversations, Messaging, Presence
-- ═══════════════════════════════════════════════════════════════

-- ── 1. CONVERSATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_1 UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    user_2 UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    last_message_preview TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_1, user_2)
);

CREATE INDEX idx_conversations_users ON public.conversations(user_1, user_2);
CREATE INDEX idx_conversations_last_at ON public.conversations(last_message_at DESC);

-- ── 2. UPGRADE MESSAGES ────────────────────────────────────────
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- ── 3. RLS POLICIES ───────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conversations" ON public.conversations 
FOR SELECT USING (auth.uid() = user_1 OR auth.uid() = user_2);

-- ── 4. FUNCTIONS ───────────────────────────────────────────────

-- Tự động tạo conversation nếu chưa có khi gửi tin nhắn
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_conversation_id UUID;
    v_user_1 UUID;
    v_user_2 UUID;
BEGIN
    -- Xác định user_1 < user_2 để tránh trùng lặp
    IF NEW.sender_id < NEW.receiver_id THEN
        v_user_1 := NEW.sender_id; v_user_2 := NEW.receiver_id;
    ELSE
        v_user_1 := NEW.receiver_id; v_user_2 := NEW.sender_id;
    END IF;

    -- Tìm hoặc tạo conversation
    INSERT INTO public.conversations (user_1, user_2, last_message_preview, last_message_at)
    VALUES (v_user_1, v_user_2, LEFT(NEW.content, 100), NOW())
    ON CONFLICT (user_1, user_2) DO UPDATE 
    SET last_message_preview = EXCLUDED.last_message_preview,
        last_message_at = EXCLUDED.last_message_at
    RETURNING id INTO v_conversation_id;

    NEW.conversation_id := v_conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_handle_new_message
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- ── 5. REALTIME ───────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;


-- ===== supabase/clean_schema/05_system/00_security_and_limits.sql =====
-- ═══════════════════════════════════════════════════════════════
-- SYSTEM SECURITY & LIMITS
-- ═══════════════════════════════════════════════════════════════

-- Hệ thống Giới hạn tốc độ (Rate Limits)
CREATE TABLE public.rate_limits (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier    text NOT NULL, -- user_id or ip
    identifier_type text NOT NULL, -- 'user', 'ip'
    endpoint      text NOT NULL, -- 'earn_xp', 'ai_chat'
    count         integer DEFAULT 0,
    window_start  timestamptz DEFAULT date_trunc('minute', now()),
    blocked_until timestamptz,
    UNIQUE(identifier, identifier_type, endpoint, window_start)
);

CREATE TABLE public.abuse_alerts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier    text NOT NULL,
    identifier_type text NOT NULL,
    reason        text NOT NULL,
    details       jsonb DEFAULT '{}',
    created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);

-- Hàm tăng rate limit và trả về count mới
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
    p_id text, 
    p_type text, 
    p_endpoint text,
    p_tier text DEFAULT 'medium'
) RETURNS integer AS $$
DECLARE
    v_count integer;
    v_window timestamptz := date_trunc('minute', now());
BEGIN
    INSERT INTO public.rate_limits (identifier, identifier_type, endpoint, window_start, count)
    VALUES (p_id, p_type, p_endpoint, v_window, 1)
    ON CONFLICT (identifier, identifier_type, endpoint, window_start) 
    DO UPDATE SET count = rate_limits.count + 1
    RETURNING count INTO v_count;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hàm chặn identifier
CREATE OR REPLACE FUNCTION public.block_identifier(
    p_id text,
    p_type text,
    p_endpoint text,
    p_duration interval
) RETURNS void AS $$
BEGIN
    UPDATE public.rate_limits 
    SET blocked_until = now() + p_duration
    WHERE identifier = p_id 
      AND identifier_type = p_type 
      AND endpoint = p_endpoint
      AND window_start = date_trunc('minute', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bảo mật nâng cao: Ẩn email người dùng khỏi các query public
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- ═══════════════════════════════════════════════════════════════
-- SENSEI RAG: Hybrid Search (Vector + Trigram)
-- ═══════════════════════════════════════════════════════════════

-- Enable trigram extension for keyword-level fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fast keyword/trigram search on sensei_knowledge
CREATE INDEX IF NOT EXISTS idx_sensei_knowledge_content_trgm
ON public.sensei_knowledge USING gin(content gin_trgm_ops);

-- Hybrid Search: Vector similarity (semantic) + Trigram (keyword) + Time-weight
-- Catches exact terms like particle names, kanji, katakana that vector search alone misses.
CREATE OR REPLACE FUNCTION public.hybrid_search_sensei(
    query_embedding vector(1536),
    query_text TEXT,
    match_count INT DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT
        sk.id,
        sk.content,
        sk.metadata,
        -- Combined score: 60% vector similarity + 40% trigram similarity
        (0.6 * (1 - (sk.embedding <=> query_embedding)) +
         0.4 * similarity(sk.content, query_text))::FLOAT AS similarity
    FROM public.sensei_knowledge sk
    WHERE
        sk.embedding IS NOT NULL
        AND (
            (1 - (sk.embedding <=> query_embedding)) > similarity_threshold
            OR similarity(sk.content, query_text) > 0.2
        )
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;



-- ===== supabase/clean_schema/05_system/01_performance.sql =====
-- ═══════════════════════════════════════════════════════════════
-- PERFORMANCE OPTIMIZATION & INDEXES
-- ═══════════════════════════════════════════════════════════════

-- Indexes cho các bảng dữ liệu lớn (Big Data)
CREATE INDEX IF NOT EXISTS idx_xp_events_user_date ON public.xp_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_results_user ON public.mock_exam_results (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_vocabulary_progress_user ON public.vocabulary_progress (user_id, next_review);

-- View thống kê nhanh cho Dashboard (Học sinh)
CREATE OR REPLACE VIEW public.user_learning_stats AS
SELECT 
    user_id,
    COUNT(DISTINCT vocab_id) as total_vocab_learned,
    (SELECT COUNT(*) FROM public.mock_exam_results mer WHERE mer.user_id = vp.user_id) as total_exams_taken,
    (SELECT SUM(amount) FROM public.xp_events xe WHERE xe.user_id = vp.user_id AND xe.created_at > now() - interval '7 days') as weekly_xp
FROM public.vocabulary_progress vp
GROUP BY user_id;

-- Cấp quyền view
GRANT SELECT ON public.user_learning_stats TO authenticated;


-- ===== supabase/clean_schema/05_system/01_cron_jobs.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: SYSTEM — Cron Jobs, Maintenance, Extensions
-- ═══════════════════════════════════════════════════════════════

-- ── 1. EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 2. PRIVATE SETTINGS ────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- ── 3. CRON JOBS ───────────────────────────────────────────────

-- Job 1: Reset Weekly XP every Monday at 00:00
SELECT cron.schedule(
    'reset-weekly-xp-monday',
    '0 0 * * 1',
    $$ SELECT public.reset_weekly_xp_all(); $$
);

-- Job 2: Scheduled Reminders (Edge Function)
-- Gửi thông báo nhắc học bài mỗi 30 phút
SELECT cron.schedule(
    'lex-study-reminder-cron',
    '0,30 * * * *',
    $$
    SELECT net.http_post(
        url := (SELECT value FROM private.settings WHERE key = 'api_url') || '/functions/v1/scheduled-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM private.settings WHERE key = 'service_role_key')
        )
    );
    $$
);

-- ── 4. RLS & SECURITY ──────────────────────────────────────────
-- Private schema is inherently private (not exposed via PostgREST),
-- but we should ensure no public access just in case.
REVOKE ALL ON SCHEMA private FROM anon, authenticated;


-- ===== supabase/clean_schema/05_system/02_notifications.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: SYSTEM — Notifications
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'follow', 'challenge', 'system', 'squad'
    content TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications 
FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to automatically create a notification on new friendship (follow)
-- Note: Uses the sender/receiver model from 04_social_pets/03_friendships_and_activity.sql
CREATE OR REPLACE FUNCTION public.handle_new_friendship_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, content, link)
    VALUES (
        NEW.receiver_id, 
        'follow', 
        'Bạn có một lời mời kết bạn mới!', 
        '/friends'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friendship_notification ON public.friendships;
CREATE TRIGGER on_friendship_notification
    AFTER INSERT ON public.friendships
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_friendship_notification();


-- ===== supabase/clean_schema/05_system/03_helper_functions.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: SYSTEM — Helper Functions & RPCs
-- ═══════════════════════════════════════════════════════════════

-- ── 1. READING RECOMMENDATIONS ────────────────────────────────
-- Tìm các bài đọc phù hợp dựa trên vốn từ vựng Flashcard của user
CREATE OR REPLACE FUNCTION public.get_recommended_reading(p_user_id UUID, p_limit INT DEFAULT 3)
RETURNS TABLE (
  passage_id UUID,
  title TEXT,
  level TEXT,
  category TEXT,
  match_percentage FLOAT,
  learning_count INT,
  mastered_count INT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH user_vocab AS (
    SELECT word, repetitions
    FROM public.flashcards
    WHERE user_id = p_user_id
  ),
  passage_vocab AS (
    SELECT 
      id AS p_id,
      title AS p_title,
      level AS p_level,
      category AS p_category,
      jsonb_array_length(vocabulary_list) AS total_words,
      v->>'word' AS passage_word
    FROM public.reading_passages,
    jsonb_array_elements(vocabulary_list) AS v
    WHERE vocabulary_list IS NOT NULL
  ),
  passage_matches AS (
    SELECT 
      pv.p_id,
      pv.p_title,
      pv.p_level,
      pv.p_category,
      MAX(pv.total_words) as total_words,
      COUNT(uv.word) AS matched_words,
      SUM(CASE WHEN uv.repetitions < 4 THEN 1 ELSE 0 END) AS learning_count,
      SUM(CASE WHEN uv.repetitions >= 4 THEN 1 ELSE 0 END) AS mastered_count
    FROM passage_vocab pv
    LEFT JOIN user_vocab uv ON pv.passage_word = uv.word
    GROUP BY pv.p_id, pv.p_title, pv.p_level, pv.p_category
  )
  SELECT 
    p_id, 
    p_title, 
    p_level, 
    p_category, 
    COALESCE(CAST(matched_words AS FLOAT) / NULLIF(total_words, 0) * 100, 0) AS match_percentage,
    CAST(COALESCE(learning_count, 0) AS INT) AS learning_count,
    CAST(COALESCE(mastered_count, 0) AS INT) AS mastered_count
  FROM passage_matches
  WHERE matched_words > 0
  ORDER BY 
    match_percentage DESC,
    learning_count DESC
  LIMIT p_limit;
END;
$$;

-- ── 2. STREAK PROTECTION ──────────────────────────────────────
-- Kiểm tra và sử dụng Streak Freeze tự động
CREATE OR REPLACE FUNCTION public.check_and_apply_streak_protection()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_freeze_item_id UUID;
    v_has_freeze BOOLEAN := FALSE;
BEGIN
    IF v_user_id IS NULL THEN RETURN jsonb_build_object('status', 'error', 'message', 'Not authenticated'); END IF;

    SELECT last_activity_date, current_streak INTO v_last_activity, v_current_streak
    FROM public.profiles WHERE user_id = v_user_id;

    IF v_last_activity >= (CURRENT_DATE - INTERVAL '1 day')::DATE THEN
        RETURN jsonb_build_object('status', 'safe', 'message', 'Streak is still valid');
    END IF;

    SELECT id INTO v_freeze_item_id FROM public.shop_items WHERE item_type = 'streak_freeze' LIMIT 1;
    
    SELECT EXISTS (
        SELECT 1 FROM public.user_inventory 
        WHERE user_id = v_user_id AND item_id = v_freeze_item_id AND quantity > 0
    ) INTO v_has_freeze;

    IF v_has_freeze THEN
        UPDATE public.user_inventory SET quantity = quantity - 1 
        WHERE user_id = v_user_id AND item_id = v_freeze_item_id;

        UPDATE public.profiles 
        SET last_activity_date = (CURRENT_DATE - INTERVAL '1 day')::DATE
        WHERE user_id = v_user_id;

        RETURN jsonb_build_object('status', 'protected', 'message', 'Đã sử dụng Băng giá Sakura để bảo vệ chuỗi Streak!');
    ELSE
        RETURN jsonb_build_object('status', 'lost', 'message', 'Bạn đã mất chuỗi Streak. Hãy mua Băng giá Sakura để phòng ngừa!');
    END IF;
END;
$$;

-- ── 3. GLOBAL LEADERBOARD (AGGREGATED) ────────────────────────
-- Tính toán bảng xếp hạng XP tuần (từ Thứ 2 gần nhất)
CREATE OR REPLACE FUNCTION public.get_global_leaderboard()
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    total_xp BIGINT,
    current_streak INTEGER,
    jlpt_level TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_monday DATE := date_trunc('week', now())::DATE;
BEGIN
    RETURN QUERY
    WITH weekly_xp AS (
        SELECT e.user_id, SUM(e.amount) as week_total
        FROM public.xp_events e
        WHERE e.created_at >= v_monday
        GROUP BY e.user_id
    )
    SELECT 
        p.user_id,
        p.display_name,
        p.avatar_url,
        COALESCE(w.week_total, 0) as total_xp,
        p.current_streak,
        p.jlpt_level
    FROM public.profiles p
    LEFT JOIN weekly_xp w ON p.user_id = w.user_id
    ORDER BY total_xp DESC
    LIMIT 50;
END;
$$;

-- ── 4. MARKETPLACE HELPERS ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.clone_public_deck_v2(p_public_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_deck public.public_decks%ROWTYPE;
    v_user_xp INTEGER;
    v_new_folder_id UUID;
    v_creator_share INTEGER;
BEGIN
    SELECT * INTO v_deck FROM public.public_decks WHERE id = p_public_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bộ thẻ không tồn tại.'; END IF;

    IF v_deck.is_premium AND v_deck.price_xp > 0 THEN
        SELECT total_xp INTO v_user_xp FROM public.profiles WHERE user_id = auth.uid();
        IF v_user_xp < v_deck.price_xp THEN
            RAISE EXCEPTION 'Bạn không đủ XP để tải bộ thẻ Premium này.';
        END IF;

        UPDATE public.profiles SET total_xp = total_xp - v_deck.price_xp WHERE user_id = auth.uid();
        v_creator_share := floor(v_deck.price_xp * 0.7);
        UPDATE public.profiles SET total_xp = total_xp + v_creator_share WHERE user_id = v_deck.creator_id;
    END IF;

    INSERT INTO public.vocabulary_folders (user_id, name, description, is_public)
    VALUES (auth.uid(), v_deck.title || ' (Clone)', v_deck.description, FALSE)
    RETURNING id INTO v_new_folder_id;

    WITH inserted_cards AS (
        INSERT INTO public.flashcards (user_id, word, reading, meaning)
        SELECT auth.uid(), word, reading, meaning
        FROM public.public_deck_items
        WHERE deck_id = p_public_id
        RETURNING id
    )
    INSERT INTO public.vocabulary_folder_items (folder_id, flashcard_id)
    SELECT v_new_folder_id, id FROM inserted_cards;

    UPDATE public.public_decks SET total_clones = total_clones + 1 WHERE id = p_public_id;
    RETURN v_new_folder_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_deck(p_public_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    DELETE FROM public.public_decks WHERE id = p_public_id AND creator_id = auth.uid();
END;
$$;


-- ===== supabase/clean_schema/06_gamification/00_quests_and_systems.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: GAMIFICATION & SOCIAL SYSTEMS — Quests, Messages, Rewards
-- ═══════════════════════════════════════════════════════════════

-- ── 1. DAILY QUESTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL,
    quest_type TEXT NOT NULL, -- 'vocab', 'reading', 'speaking', 'login', 'perfect_quiz'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES public.daily_quests(id) ON DELETE CASCADE,
    current_value INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, quest_id)
);

-- Bảng theo dõi tiến độ quest theo ngày (dùng cho DailyQuests dashboard)
CREATE TABLE IF NOT EXISTS public.daily_quest_progress (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quest_id TEXT NOT NULL, -- matches daily_quests.quest_type or a fixed string ID
    is_completed BOOLEAN DEFAULT FALSE,
    is_claimed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, quest_date, quest_id)
);

ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quest_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quests" ON public.daily_quests FOR SELECT USING (true);
CREATE POLICY "Users can manage own quests" ON public.user_quests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own quest progress" ON public.daily_quest_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert/update own quest progress" ON public.daily_quest_progress FOR ALL USING (auth.uid() = user_id);

-- ── 2. DIRECT MESSAGES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own conversation" ON public.messages 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages" ON public.messages 
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ── 3. FUNCTIONS ───────────────────────────────────────────────

-- Hàm tự động tạo/reset nhiệm vụ hằng ngày cho user
CREATE OR REPLACE FUNCTION public.sync_user_quests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Chèn các nhiệm vụ mới nếu chưa có trong ngày
    INSERT INTO public.user_quests (user_id, quest_id)
    SELECT auth.uid(), id FROM public.daily_quests
    ON CONFLICT (user_id, quest_id) DO UPDATE
    SET current_value = 0, is_completed = false, completed_at = NULL, last_reset_at = NOW()
    WHERE user_quests.last_reset_at::date < CURRENT_DATE;
END;
$$;

-- ── 4. SEED DATA ───────────────────────────────────────────────
INSERT INTO public.daily_quests (id, title, description, target_value, reward_xp, quest_type) VALUES
  (gen_random_uuid(), 'Văn ôn võ luyện', 'Học 10 từ vựng mới', 10, 200, 'vocab'),
  (gen_random_uuid(), 'Mọt sách Nhật Bản', 'Đọc 2 bài báo Sakura', 2, 300, 'reading'),
  (gen_random_uuid(), 'Bậc thầy đàm thoại', 'Luyện nói 5 câu hoàn hảo', 5, 500, 'speaking'),
  (gen_random_uuid(), 'Chiến thần Quiz', 'Đạt 100% trong 1 bài Quiz', 1, 400, 'perfect_quiz')
ON CONFLICT DO NOTHING;


-- ===== supabase/clean_schema/06_gamification/01_shop_and_marketplace.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: ADVANCED GAMIFICATION & COMMUNITY — Shop, Inventory, Marketplace
-- ═══════════════════════════════════════════════════════════════

-- ── 1. SAKURA SHOP & INVENTORY ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price_xp INTEGER NOT NULL DEFAULT 0,
    price_coins INTEGER NOT NULL DEFAULT 0,
    icon TEXT, -- Lucide icon name
    item_type TEXT NOT NULL CHECK (item_type IN ('streak_freeze', 'streak_insurance', 'xp_boost', 'pet_food')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- ── 2. COMMUNITY MARKETPLACE (Public Decks) ────────────────────
CREATE TABLE IF NOT EXISTS public.public_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_deck_id UUID, -- Optional link to original
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General',
    tags TEXT[],
    total_clones INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    is_premium BOOLEAN DEFAULT FALSE,
    price_xp INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lưu các thẻ thuộc về bộ thẻ công khai (để tránh bị xóa khi user xóa bộ thẻ gốc)
CREATE TABLE IF NOT EXISTS public.public_deck_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.public_decks(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    reading TEXT,
    hanviet TEXT,
    meaning TEXT,
    example_sentence TEXT,
    example_translation TEXT,
    audio_url TEXT,
    image_url TEXT,
    notes TEXT,
    jlpt_level TEXT,
    word_type TEXT,
    tags TEXT[]
);

CREATE TABLE IF NOT EXISTS public.deck_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.public_decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deck_id, user_id)
);

-- ── 3. RLS POLICIES ───────────────────────────────────────────
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_deck_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view shop" ON public.shop_items FOR SELECT USING (true);
CREATE POLICY "Users view own inventory" ON public.user_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone view public decks" ON public.public_decks FOR SELECT USING (true);
CREATE POLICY "Anyone view public deck items" ON public.public_deck_items FOR SELECT USING (true);
CREATE POLICY "Anyone view ratings" ON public.deck_ratings FOR SELECT USING (true);

-- ── 4. BUSINESS LOGIC (RPCs) ───────────────────────────────────

-- Mua vật phẩm bằng XP
CREATE OR REPLACE FUNCTION public.purchase_item_with_xp(p_item_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_price INTEGER;
    v_user_xp INTEGER;
BEGIN
    SELECT price_xp INTO v_price FROM public.shop_items WHERE id = p_item_id;
    SELECT total_xp INTO v_user_xp FROM public.profiles WHERE user_id = auth.uid();

    IF v_user_xp < v_price THEN
        RAISE EXCEPTION 'Không đủ XP để mua vật phẩm này.';
    END IF;

    -- Trừ XP
    UPDATE public.profiles SET total_xp = total_xp - v_price WHERE user_id = auth.uid();

    -- Thêm vào kho đồ
    INSERT INTO public.user_inventory (user_id, item_id, quantity)
    VALUES (auth.uid(), p_item_id, 1)
    ON CONFLICT (user_id, item_id) DO UPDATE
    SET quantity = user_inventory.quantity + 1;
END;
$$;

-- Kiểm tra và sử dụng vật phẩm bảo vệ Streak (Freeze hoặc Insurance)
CREATE OR REPLACE FUNCTION public.check_and_apply_streak_protection()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_item_id UUID;
    v_protected BOOLEAN := FALSE;
    v_item_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN RETURN jsonb_build_object('status', 'error', 'message', 'Not authenticated'); END IF;

    SELECT last_activity_date, current_streak INTO v_last_activity, v_current_streak
    FROM public.profiles WHERE user_id = v_user_id;

    -- Nếu hôm nay đã học rồi hoặc mới học hôm qua -> Không cần bảo vệ
    IF v_last_activity >= (CURRENT_DATE - INTERVAL '1 day')::DATE THEN
        RETURN jsonb_build_object('status', 'safe', 'message', 'Streak is still valid');
    END IF;

    -- 1. Ưu tiên kiểm tra Streak Freeze (Băng giá Sakura)
    SELECT i.id, i.name INTO v_item_id, v_item_name 
    FROM public.shop_items i
    JOIN public.user_inventory inv ON i.id = inv.item_id
    WHERE inv.user_id = v_user_id AND i.item_type = 'streak_freeze' AND inv.quantity > 0
    LIMIT 1;

    -- 2. Nếu không có Freeze, kiểm tra Streak Insurance (Bảo hiểm vĩnh cửu)
    IF v_item_id IS NULL THEN
        SELECT i.id, i.name INTO v_item_id, v_item_name 
        FROM public.shop_items i
        JOIN public.user_inventory inv ON i.id = inv.item_id
        WHERE inv.user_id = v_user_id AND i.item_type = 'streak_insurance' AND inv.quantity > 0
        LIMIT 1;
    END IF;

    IF v_item_id IS NOT NULL THEN
        -- Sử dụng vật phẩm
        UPDATE public.user_inventory SET quantity = quantity - 1 
        WHERE user_id = v_user_id AND item_id = v_item_id;

        -- Nối lại streak
        UPDATE public.profiles SET last_activity_date = (CURRENT_DATE - INTERVAL '1 day')::DATE
        WHERE user_id = v_user_id;

        RETURN jsonb_build_object(
            'status', 'protected', 
            'message', format('Đã sử dụng %s để bảo vệ chuỗi Streak của bạn!', v_item_name)
        );
    ELSE
        RETURN jsonb_build_object('status', 'lost', 'message', 'Bạn đã mất chuỗi Streak. Hãy mua vật phẩm bảo vệ trong Sakura Shop!');
    END IF;
END;
$$;

-- Công khai bộ thẻ
CREATE OR REPLACE FUNCTION public.publish_deck(
    p_folder_id UUID, 
    p_title TEXT, 
    p_description TEXT
)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_public_id UUID;
BEGIN
    -- Verify ownership
    IF NOT EXISTS (SELECT 1 FROM public.vocabulary_folders WHERE id = p_folder_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Bạn không có quyền công khai bộ thẻ này.';
    END IF;

    -- Tạo bộ thẻ công khai
    INSERT INTO public.public_decks (original_deck_id, creator_id, title, description)
    VALUES (p_folder_id, auth.uid(), p_title, p_description)
    RETURNING id INTO v_public_id;

    -- Copy nội dung từ flashcards thông qua folder_items (Giữ nguyên toàn bộ metadata)
    INSERT INTO public.public_deck_items (
        deck_id, word, reading, hanviet, meaning, 
        example_sentence, example_translation, audio_url, 
        image_url, notes, jlpt_level, word_type, tags
    )
    SELECT 
        v_public_id, f.word, f.reading, f.hanviet, f.meaning, 
        f.example_sentence, f.example_translation, f.audio_url, 
        f.image_url, f.notes, f.jlpt_level, f.word_type, f.tags
    FROM public.flashcards f
    JOIN public.vocabulary_folder_items vfi ON f.id = vfi.flashcard_id
    WHERE vfi.folder_id = p_folder_id;

    -- Mark folder as public (optional, for visibility in existing systems)
    UPDATE public.vocabulary_folders SET is_public = TRUE WHERE id = p_folder_id;

    RETURN v_public_id;
END;
$$;

-- Clone bộ thẻ công khai về máy (với logic thanh toán)
CREATE OR REPLACE FUNCTION public.clone_public_deck(p_public_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_deck public.public_decks%ROWTYPE;
    v_user_xp INTEGER;
    v_new_folder_id UUID;
    v_creator_share INTEGER;
BEGIN
    SELECT * INTO v_deck FROM public.public_decks WHERE id = p_public_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bộ thẻ không tồn tại.'; END IF;

    IF v_deck.is_premium AND v_deck.price_xp > 0 THEN
        SELECT total_xp INTO v_user_xp FROM public.profiles WHERE user_id = auth.uid();
        IF v_user_xp < v_deck.price_xp THEN
            RAISE EXCEPTION 'Bạn không đủ XP để tải bộ thẻ Premium này.';
        END IF;

        UPDATE public.profiles SET total_xp = total_xp - v_deck.price_xp WHERE user_id = auth.uid();
        v_creator_share := floor(v_deck.price_xp * 0.7);
        UPDATE public.profiles SET total_xp = total_xp + v_creator_share WHERE user_id = v_deck.creator_id;
    END IF;

    INSERT INTO public.vocabulary_folders (user_id, name, description, is_public)
    VALUES (auth.uid(), v_deck.title || ' (Clone)', v_deck.description, FALSE)
    RETURNING id INTO v_new_folder_id;

    WITH inserted_cards AS (
        INSERT INTO public.flashcards (
            user_id, word, reading, hanviet, meaning, 
            example_sentence, example_translation, audio_url, 
            image_url, notes, jlpt_level, word_type, tags
        )
        SELECT 
            auth.uid(), word, reading, hanviet, meaning, 
            example_sentence, example_translation, audio_url, 
            image_url, notes, jlpt_level, word_type, tags
        FROM public.public_deck_items
        WHERE deck_id = p_public_id
        RETURNING id
    )
    INSERT INTO public.vocabulary_folder_items (folder_id, flashcard_id)
    SELECT v_new_folder_id, id FROM inserted_cards;

    UPDATE public.public_decks SET total_clones = total_clones + 1 WHERE id = p_public_id;
    RETURN v_new_folder_id;
END;
$$;

-- Gỡ bộ thẻ khỏi Marketplace
CREATE OR REPLACE FUNCTION public.unpublish_deck(p_public_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    DELETE FROM public.public_decks WHERE id = p_public_id AND creator_id = auth.uid();
END;
$$;

-- Đánh giá bộ thẻ
CREATE OR REPLACE FUNCTION public.rate_public_deck(p_deck_id UUID, p_rating INTEGER, p_comment TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'Đánh giá phải từ 1 đến 5 sao.'; END IF;

    INSERT INTO public.deck_ratings (deck_id, user_id, rating, comment)
    VALUES (p_deck_id, auth.uid(), p_rating, p_comment)
    ON CONFLICT (deck_id, user_id) DO UPDATE
    SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW();

    UPDATE public.public_decks
    SET avg_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.deck_ratings WHERE deck_id = p_deck_id)
    WHERE id = p_deck_id;
END;
$$;

-- ── 5. SEED DATA ───────────────────────────────────────────────
INSERT INTO public.shop_items (name, description, price_xp, icon, item_type) VALUES
  ('Băng giá Sakura', 'Bảo vệ Streak của bạn trong 1 ngày nếu lỡ quên học.', 500, 'Flame', 'streak_freeze'),
  ('Bảo hiểm vĩnh cửu', 'Tự động kích hoạt khi Streak sắp mất (dùng 1 lần).', 1200, 'Shield', 'streak_insurance'),
  ('Nước tăng lực XP', 'Tăng 50% XP nhận được trong 1 giờ.', 300, 'Zap', 'xp_boost'),
  ('Lương thực linh thú', 'Hồi phục năng lượng cho Pet ngay lập tức.', 200, 'Apple', 'pet_food')
ON CONFLICT DO NOTHING;


-- ===== supabase/clean_schema/06_gamification/07_battle_systems.sql =====
-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: GAMIFICATION EXPANSION — Battle Systems
-- ═══════════════════════════════════════════════════════════════

-- ── 1. KANJI BATTLE ARENA ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kanji_battle_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    max_combo INTEGER NOT NULL DEFAULT 0,
    difficulty TEXT NOT NULL,
    kanji_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard function for Kanji Battle
CREATE OR REPLACE FUNCTION public.get_kanji_battle_leaderboard(p_period TEXT DEFAULT 'daily')
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    max_score INTEGER
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.user_id,
        p.display_name,
        p.avatar_url,
        MAX(s.score) as max_score
    FROM public.kanji_battle_scores s
    JOIN public.profiles p ON s.user_id = p.user_id
    WHERE 
        CASE 
            WHEN p_period = 'daily' THEN s.created_at >= CURRENT_DATE
            WHEN p_period = 'weekly' THEN s.created_at >= CURRENT_DATE - INTERVAL '7 days'
            ELSE TRUE
        END
    GROUP BY s.user_id, p.display_name, p.avatar_url
    ORDER BY max_score DESC
    LIMIT 20;
END;
$$;

-- ── 2. BOSS BATTLES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bosses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    max_hp INTEGER NOT NULL,
    avatar_url TEXT,
    difficulty TEXT DEFAULT 'normal',
    reward_xp INTEGER DEFAULT 1000,
    reward_item_id UUID REFERENCES public.shop_items(id) ON DELETE SET NULL,
    unlock_condition_folder_id UUID REFERENCES public.vocabulary_folders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_boss_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    boss_id UUID NOT NULL REFERENCES public.bosses(id) ON DELETE CASCADE,
    current_hp INTEGER NOT NULL,
    is_defeated BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    last_attack_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, boss_id)
);

-- Function to handle boss attack
CREATE OR REPLACE FUNCTION public.attack_boss(
    p_boss_id UUID,
    p_damage INTEGER DEFAULT 1, -- Default to 1 to prevent cheating
    p_is_correct BOOLEAN DEFAULT TRUE
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_progress public.user_boss_progress%ROWTYPE;
    v_boss public.bosses%ROWTYPE;
    v_reward_received BOOLEAN := FALSE;
    v_actual_damage INTEGER := 1; -- Force 1 damage for now
BEGIN
    -- Verify authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_boss FROM public.bosses WHERE id = p_boss_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Boss not found');
    END IF;

    SELECT * INTO v_progress FROM public.user_boss_progress WHERE user_id = auth.uid() AND boss_id = p_boss_id;

    IF NOT FOUND THEN
        INSERT INTO public.user_boss_progress (user_id, boss_id, current_hp)
        VALUES (auth.uid(), p_boss_id, v_boss.max_hp)
        RETURNING * INTO v_progress;
    END IF;

    IF v_progress.is_defeated THEN
        RETURN jsonb_build_object('error', 'Boss already defeated');
    END IF;

    -- Update progress
    IF p_is_correct THEN
        v_progress.current_hp := GREATEST(0, v_progress.current_hp - v_actual_damage);
    ELSE
        -- User takes damage or other penalties can be added here
    END IF;

    v_progress.attempts := v_progress.attempts + 1;
    v_progress.last_attack_at := NOW();

    IF v_progress.current_hp = 0 THEN
        v_progress.is_defeated := TRUE;
        v_reward_received := TRUE;

        -- Award XP
        UPDATE public.profiles SET total_xp = total_xp + v_boss.reward_xp WHERE user_id = auth.uid();

        -- Award Item if exists
        IF v_boss.reward_item_id IS NOT NULL THEN
            INSERT INTO public.user_inventory (user_id, item_id, quantity)
            VALUES (auth.uid(), v_boss.reward_item_id, 1)
            ON CONFLICT (user_id, item_id) DO UPDATE
            SET quantity = user_inventory.quantity + 1;
        END IF;
    END IF;

    UPDATE public.user_boss_progress
    SET current_hp = v_progress.current_hp,
        is_defeated = v_progress.is_defeated,
        attempts = v_progress.attempts,
        last_attack_at = v_progress.last_attack_at
    WHERE id = v_progress.id;

    RETURN jsonb_build_object(
        'current_hp', v_progress.current_hp,
        'max_hp', v_boss.max_hp,
        'is_defeated', v_progress.is_defeated,
        'reward_received', v_reward_received,
        'xp_gained', CASE WHEN v_reward_received THEN v_boss.reward_xp ELSE 0 END
    );
END;
$$;

-- ── 3. SEED BOSSES ──────────────────────────────────────────────
INSERT INTO public.bosses (name, description, max_hp, avatar_url, difficulty, reward_xp) VALUES
  ('Quỷ Kanji N5', 'Kẻ canh giữ cổng sơ cấp. Phải vượt qua 10 câu hỏi để đánh bại hắn!', 10, '👹', 'easy', 500),
  ('Vua Trợ Từ', 'Hắn sẽ làm bạn rối loạn với は và が. Cẩn thận!', 15, '👑', 'normal', 1000),
  ('Rồng Thụ Động', 'Chuyên gia thể bị động và sai khiến. Chỉ dành cho bậc thầy N3!', 25, '🐲', 'hard', 2500)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.kanji_battle_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bosses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_boss_progress ENABLE ROW LEVEL SECURITY;

-- Leaderboard cần đọc được điểm của TẤT CẢ người chơi (get_kanji_battle_leaderboard dùng SECURITY DEFINER)
-- INSERT vẫn được bảo vệ: chỉ user của chính mình mới thêm được
CREATE POLICY "Anyone view battle scores for leaderboard" ON public.kanji_battle_scores FOR SELECT USING (true);
CREATE POLICY "Users insert own battle scores" ON public.kanji_battle_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone view bosses" ON public.bosses FOR SELECT USING (true);
CREATE POLICY "Users view own boss progress" ON public.user_boss_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own boss progress" ON public.user_boss_progress FOR ALL USING (auth.uid() = user_id);

