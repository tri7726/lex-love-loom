-- ===== 00_init/00_reset.sql =====
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- ===== 00_init/01_roles.sql =====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'user');
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role public.app_role)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = p_user_id AND role = p_role
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_activity()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_today   date := CURRENT_DATE;
    v_last    date;
    v_streak  integer;
BEGIN
    IF v_user_id IS NULL THEN RETURN; END IF;
    SELECT last_activity_date, current_streak INTO v_last, v_streak
    FROM public.profiles WHERE user_id = v_user_id;
    IF v_last IS NULL OR v_last < v_today THEN
        IF v_last = (v_today - INTERVAL '1 day')::date THEN
            v_streak := COALESCE(v_streak, 0) + 1;
        ELSE
            v_streak := 1;
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

-- ===== 01_users/00_profiles_xp_streaks.sql =====
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'parent') THEN
    ALTER TYPE public.app_role ADD VALUE 'parent';
  END IF;
END $$;

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

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role    public.app_role NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.xp_events (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source     text NOT NULL,
    amount     integer NOT NULL,
    metadata   jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_id ON public.xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_date ON public.xp_events(user_id, created_at DESC);

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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profile view" ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users update own profile info" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND
        total_xp = (SELECT total_xp FROM public.profiles WHERE id = auth.uid()) AND
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
        pet_coins = (SELECT pet_coins FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manage roles" ON public.user_roles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view own xp_events" ON public.xp_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp_events" ON public.xp_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Users view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, user_id, username, full_name, display_name, avatar_url)
    VALUES (
        new.id, new.id,
        COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
        new.raw_user_meta_data->>'full_name',
        COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
        new.raw_user_meta_data->>'avatar_url'
    ) ON CONFLICT (id) DO NOTHING;
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
    v_freeze_item_id UUID;
BEGIN
    SELECT last_activity_date, current_streak INTO v_last_date, v_current_streak
    FROM public.profiles WHERE user_id = v_user_id;
    IF v_last_date IS NULL OR v_last_date < v_today THEN
        IF v_last_date < (v_today - INTERVAL '1 day')::date THEN
            v_current_streak := 1;
        ELSIF v_last_date = (v_today - INTERVAL '1 day')::date THEN
            v_current_streak := COALESCE(v_current_streak, 0) + 1;
        ELSE
            RETURN;
        END IF;
        UPDATE public.profiles
        SET current_streak = v_current_streak,
            longest_streak = GREATEST(COALESCE(longest_streak, 0), v_current_streak),
            last_activity_date = v_today,
            updated_at = NOW()
        WHERE user_id = v_user_id;
    END IF;
END;
$$;

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
        WHEN p_source IN ('pet_feed','pet_play','pet_bathe','pet_walk','pet_sleep','pet_interact') THEN 'pet'
        WHEN p_source IN ('duel') THEN 'social'
        WHEN p_source IN ('speaking_practice') THEN 'speaking'
        WHEN p_source IN ('flashcard_create','flashcard_review') THEN 'flashcard'
        WHEN p_source IN ('streak_bonus','daily_login') THEN 'streak'
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
            WHEN 'quiz_count' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source = 'quiz';
            WHEN 'quiz_perfect' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source = 'quiz' AND metadata->>'perfect' = 'true';
            WHEN 'speaking_sessions' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source = 'speaking_practice';
            WHEN 'pet_total_actions' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source IN ('pet_feed','pet_play','pet_bathe','pet_walk','pet_sleep','pet_interact');
            WHEN 'pet_feeds' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source = 'pet_feed';
            WHEN 'pet_plays' THEN
                SELECT COUNT(*) INTO v_current_value FROM public.xp_events WHERE user_id = p_user_id AND source = 'pet_play';
            ELSE
                v_current_value := 0;
        END CASE;
        IF v_current_value >= v_achievement.condition_value THEN
            SELECT EXISTS (
                SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = v_achievement.id
            ) INTO v_unlocked;
            IF NOT v_unlocked THEN
                INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
                VALUES (p_user_id, v_achievement.id, NOW()) ON CONFLICT DO NOTHING;
                IF v_achievement.xp_reward > 0 THEN
                    UPDATE public.profiles SET total_xp = total_xp + v_achievement.xp_reward WHERE user_id = p_user_id;
                    INSERT INTO public.xp_events (user_id, source, amount, metadata)
                    VALUES (p_user_id, 'achievement_unlocked', v_achievement.xp_reward,
                            jsonb_build_object('achievement_title', v_achievement.title));
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.earn_xp(p_amount integer, p_source text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id uuid;
    v_final_amount integer;
    v_dup_check integer;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
    v_final_amount := CASE p_source
        WHEN 'flashcard'    THEN LEAST(p_amount, 10)
        WHEN 'quiz'         THEN LEAST(p_amount, 50)
        WHEN 'duel_win'     THEN LEAST(p_amount, 100)
        WHEN 'reading'      THEN LEAST(p_amount, 30)
        WHEN 'speaking'     THEN LEAST(p_amount, 40)
        WHEN 'achievement'  THEN LEAST(p_amount, 500)
        WHEN 'daily_quests' THEN LEAST(p_amount, 200)
        ELSE                     LEAST(p_amount, 20)
    END;
    IF v_final_amount <= 0 THEN RETURN; END IF;
    SELECT COUNT(*) INTO v_dup_check FROM public.xp_events
    WHERE user_id = v_user_id AND source = p_source AND amount = v_final_amount AND created_at > now() - interval '5 seconds';
    IF v_dup_check > 0 THEN RETURN; END IF;
    UPDATE public.profiles
    SET total_xp = total_xp + v_final_amount,
        daily_xp_earned = COALESCE(daily_xp_earned, 0) + v_final_amount,
        weekly_xp = COALESCE(weekly_xp, 0) + v_final_amount,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    INSERT INTO public.xp_events (user_id, source, amount, metadata)
    VALUES (v_user_id, p_source, v_final_amount, p_metadata || jsonb_build_object('client_timestamp', NOW()));
    PERFORM public.record_activity();
    PERFORM public.check_achievements(v_user_id, p_source);
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_weekly_xp_all()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    UPDATE public.profiles SET weekly_xp = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.earn_xp(integer, text, jsonb) TO authenticated;

INSERT INTO public.achievements (id, title, description, icon, category, condition_type, condition_value, xp_reward, title_reward) VALUES
  ('first_steps','Bước đầu tiên','Kiếm được XP đầu tiên','⭐','general','xp_total',1,50,'Tân Thủ'),
  ('xp_100','Học viên mới','Đạt 100 XP','📚','xp','xp_total',100,50,NULL),
  ('xp_500','Chăm chỉ','Đạt 500 XP','💪','xp','xp_total',500,100,NULL),
  ('xp_1000','XP Hunter','Đạt 1000 XP','🎯','xp','xp_total',1000,150,NULL),
  ('xp_5000','XP Legend','Đạt 5000 XP','👑','xp','xp_total',5000,300,'Bậc Thầy Học Thuật'),
  ('xp_10000','Huyền thoại','Đạt 10000 XP','🌟','xp','xp_total',10000,500,'Thánh Nhân Sakura'),
  ('streak_3','Khởi đầu tốt','Streak 3 ngày','🔥','streak','streak_days',3,30,NULL),
  ('streak_7','On Fire','Streak 7 ngày','🔥','streak','streak_days',7,75,'Người Chăm Chỉ'),
  ('streak_30','Dedicated Learner','Streak 30 ngày','🏆','streak','streak_days',30,200,'Chiến Thần Streak'),
  ('streak_100','Bất khuất','Streak 100 ngày','💎','streak','streak_days',100,500,'Kẻ Không Thể Cản Phá'),
  ('quiz_perfect','Hoàn hảo','100% trong 1 quiz','💯','quiz','quiz_perfect',1,100,'Thiên Tài Quiz'),
  ('quiz_10','Quiz Addict','Hoàn thành 10 quiz','⚡','quiz','quiz_count',10,75,NULL),
  ('speaking_first','Mở miệng','Buổi luyện nói đầu tiên','🎤','speaking','speaking_sessions',1,50,NULL),
  ('speaking_10','Diễn giả','10 buổi luyện nói','🎙️','speaking','speaking_sessions',10,150,'Diễn Thuyết Gia'),
  ('pet_caretaker','Người chăm sóc','10 hành động Pet','🐾','pet','pet_total_actions',10,80,'Huấn Luyện Viên'),
  ('pet_feeder','Đầu bếp Pet','Cho Pet ăn 5 lần','🍱','pet','pet_feeds',5,60,NULL),
  ('pet_evolved','Tiến hóa!','Pet tiến hóa lần đầu','✨','pet','pet_evolution',1,200,'Tiến Hóa Sư')
ON CONFLICT (id) DO NOTHING;
