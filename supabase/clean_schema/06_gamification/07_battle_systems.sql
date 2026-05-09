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
