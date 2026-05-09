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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'parent') THEN
    ALTER TYPE public.app_role ADD VALUE 'parent';
  END IF;
END $$;

-- Note: "Parents can view linked student profiles" policy moved to classroom file
-- after parent_student_links table is created.
