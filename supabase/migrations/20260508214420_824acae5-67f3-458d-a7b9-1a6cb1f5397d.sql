DROP FUNCTION IF EXISTS public.clone_public_deck(uuid);
DROP FUNCTION IF EXISTS public.publish_deck(uuid, text, text);
DROP FUNCTION IF EXISTS public.unpublish_deck(uuid);
DROP FUNCTION IF EXISTS public.rate_public_deck(uuid, integer, text);

-- ── PART 6.1: DAILY QUESTS ──
CREATE TABLE IF NOT EXISTS public.daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL, description TEXT NOT NULL,
    target_value INTEGER NOT NULL, reward_xp INTEGER NOT NULL,
    quest_type TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.user_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES public.daily_quests(id) ON DELETE CASCADE,
    current_value INTEGER DEFAULT 0, is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ, last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, quest_id)
);
CREATE TABLE IF NOT EXISTS public.daily_quest_progress (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quest_id TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE, is_claimed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, quest_date, quest_id)
);
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view quests" ON public.daily_quests FOR SELECT USING (true);
CREATE POLICY "Users manage own user_quests" ON public.user_quests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own quest progress" ON public.daily_quest_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own quest progress" ON public.daily_quest_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_user_quests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.user_quests (user_id, quest_id)
    SELECT auth.uid(), id FROM public.daily_quests
    ON CONFLICT (user_id, quest_id) DO UPDATE
    SET current_value = 0, is_completed = false, completed_at = NULL, last_reset_at = NOW()
    WHERE user_quests.last_reset_at::date < CURRENT_DATE;
END; $$;

INSERT INTO public.daily_quests (title, description, target_value, reward_xp, quest_type) VALUES
  ('Văn ôn võ luyện', 'Học 10 từ vựng mới', 10, 200, 'vocab'),
  ('Mọt sách Nhật Bản', 'Đọc 2 bài báo Sakura', 2, 300, 'reading'),
  ('Bậc thầy đàm thoại', 'Luyện nói 5 câu hoàn hảo', 5, 500, 'speaking'),
  ('Chiến thần Quiz', 'Đạt 100% trong 1 bài Quiz', 1, 400, 'perfect_quiz')
ON CONFLICT DO NOTHING;

-- ── PART 6.2: SHOP ──
CREATE TABLE IF NOT EXISTS public.shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, description TEXT,
    price_xp INTEGER NOT NULL DEFAULT 0, price_coins INTEGER NOT NULL DEFAULT 0,
    icon TEXT, item_type TEXT NOT NULL CHECK (item_type IN ('streak_freeze','streak_insurance','xp_boost','pet_food')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1, purchased_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- ── PART 6.3: MARKETPLACE ──
CREATE TABLE IF NOT EXISTS public.public_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_deck_id UUID,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL, description TEXT,
    category TEXT DEFAULT 'General', tags TEXT[],
    total_clones INTEGER DEFAULT 0, avg_rating DECIMAL(3,2) DEFAULT 0,
    is_premium BOOLEAN DEFAULT FALSE, price_xp INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.public_deck_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.public_decks(id) ON DELETE CASCADE,
    word TEXT NOT NULL, reading TEXT, hanviet TEXT, meaning TEXT,
    example_sentence TEXT, example_translation TEXT,
    audio_url TEXT, image_url TEXT, notes TEXT,
    jlpt_level TEXT, word_type TEXT, tags TEXT[]
);
CREATE TABLE IF NOT EXISTS public.deck_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.public_decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deck_id, user_id)
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_deck_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view shop" ON public.shop_items FOR SELECT USING (true);
CREATE POLICY "Users view own inventory" ON public.user_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone view public decks" ON public.public_decks FOR SELECT USING (true);
CREATE POLICY "Creator manages own deck" ON public.public_decks FOR ALL USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Anyone view public deck items" ON public.public_deck_items FOR SELECT USING (true);
CREATE POLICY "Anyone view ratings" ON public.deck_ratings FOR SELECT USING (true);
CREATE POLICY "Users manage own ratings" ON public.deck_ratings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE FUNCTION public.purchase_item_with_xp(p_item_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_price INTEGER; v_user_xp INTEGER;
BEGIN
    SELECT price_xp INTO v_price FROM public.shop_items WHERE id = p_item_id;
    SELECT total_xp INTO v_user_xp FROM public.profiles WHERE user_id = auth.uid();
    IF v_user_xp < v_price THEN RAISE EXCEPTION 'Không đủ XP để mua vật phẩm này.'; END IF;
    UPDATE public.profiles SET total_xp = total_xp - v_price WHERE user_id = auth.uid();
    INSERT INTO public.user_inventory (user_id, item_id, quantity)
    VALUES (auth.uid(), p_item_id, 1)
    ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = user_inventory.quantity + 1;
END; $$;

CREATE OR REPLACE FUNCTION public.check_and_apply_streak_protection()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
        v_last_activity DATE; v_current_streak INTEGER;
        v_freeze_item_id UUID; v_has_freeze BOOLEAN := FALSE;
BEGIN
    IF v_user_id IS NULL THEN RETURN jsonb_build_object('status','error','message','Not authenticated'); END IF;
    SELECT last_activity_date, current_streak INTO v_last_activity, v_current_streak FROM public.profiles WHERE user_id = v_user_id;
    IF v_last_activity >= (CURRENT_DATE - INTERVAL '1 day')::DATE THEN
        RETURN jsonb_build_object('status','safe','message','Streak is still valid');
    END IF;
    SELECT id INTO v_freeze_item_id FROM public.shop_items WHERE item_type = 'streak_freeze' LIMIT 1;
    SELECT EXISTS (SELECT 1 FROM public.user_inventory WHERE user_id = v_user_id AND item_id = v_freeze_item_id AND quantity > 0) INTO v_has_freeze;
    IF v_has_freeze THEN
        UPDATE public.user_inventory SET quantity = quantity - 1 WHERE user_id = v_user_id AND item_id = v_freeze_item_id;
        UPDATE public.profiles SET last_activity_date = (CURRENT_DATE - INTERVAL '1 day')::DATE WHERE user_id = v_user_id;
        RETURN jsonb_build_object('status','protected','message','Đã sử dụng Băng giá Sakura để bảo vệ chuỗi Streak!');
    ELSE
        RETURN jsonb_build_object('status','lost','message','Bạn đã mất chuỗi Streak. Hãy mua Băng giá Sakura để phòng ngừa!');
    END IF;
END; $$;

CREATE FUNCTION public.publish_deck(p_folder_id UUID, p_title TEXT, p_description TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_public_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.vocabulary_folders WHERE id = p_folder_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Bạn không có quyền công khai bộ thẻ này.';
    END IF;
    INSERT INTO public.public_decks (original_deck_id, creator_id, title, description)
    VALUES (p_folder_id, auth.uid(), p_title, p_description) RETURNING id INTO v_public_id;
    INSERT INTO public.public_deck_items (deck_id, word, reading, hanviet, meaning,
        example_sentence, example_translation, audio_url, image_url, notes, jlpt_level, word_type, tags)
    SELECT v_public_id, f.word, f.reading, f.hanviet, f.meaning,
        f.example_sentence, f.example_translation, f.audio_url, f.image_url, f.notes, f.jlpt_level, f.word_type, f.tags
    FROM public.flashcards f
    JOIN public.vocabulary_folder_items vfi ON f.id = vfi.flashcard_id
    WHERE vfi.folder_id = p_folder_id;
    UPDATE public.vocabulary_folders SET is_public = TRUE WHERE id = p_folder_id;
    RETURN v_public_id;
END; $$;

CREATE FUNCTION public.clone_public_deck(p_public_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deck public.public_decks%ROWTYPE; v_user_xp INTEGER; v_new_folder_id UUID; v_creator_share INTEGER;
BEGIN
    SELECT * INTO v_deck FROM public.public_decks WHERE id = p_public_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bộ thẻ không tồn tại.'; END IF;
    IF v_deck.is_premium AND v_deck.price_xp > 0 THEN
        SELECT total_xp INTO v_user_xp FROM public.profiles WHERE user_id = auth.uid();
        IF v_user_xp < v_deck.price_xp THEN RAISE EXCEPTION 'Bạn không đủ XP để tải bộ thẻ Premium này.'; END IF;
        UPDATE public.profiles SET total_xp = total_xp - v_deck.price_xp WHERE user_id = auth.uid();
        v_creator_share := floor(v_deck.price_xp * 0.7);
        UPDATE public.profiles SET total_xp = total_xp + v_creator_share WHERE user_id = v_deck.creator_id;
    END IF;
    INSERT INTO public.vocabulary_folders (user_id, name, description, is_public)
    VALUES (auth.uid(), v_deck.title || ' (Clone)', v_deck.description, FALSE)
    RETURNING id INTO v_new_folder_id;
    WITH inserted_cards AS (
        INSERT INTO public.flashcards (user_id, word, reading, hanviet, meaning,
            example_sentence, example_translation, audio_url, image_url, notes, jlpt_level, word_type, tags)
        SELECT auth.uid(), word, reading, hanviet, meaning, example_sentence, example_translation,
            audio_url, image_url, notes, jlpt_level, word_type, tags
        FROM public.public_deck_items WHERE deck_id = p_public_id RETURNING id
    )
    INSERT INTO public.vocabulary_folder_items (folder_id, flashcard_id)
    SELECT v_new_folder_id, id FROM inserted_cards;
    UPDATE public.public_decks SET total_clones = total_clones + 1 WHERE id = p_public_id;
    RETURN v_new_folder_id;
END; $$;

CREATE FUNCTION public.unpublish_deck(p_public_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    DELETE FROM public.public_decks WHERE id = p_public_id AND creator_id = auth.uid();
END; $$;

CREATE FUNCTION public.rate_public_deck(p_deck_id UUID, p_rating INTEGER, p_comment TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'Đánh giá phải từ 1 đến 5 sao.'; END IF;
    INSERT INTO public.deck_ratings (deck_id, user_id, rating, comment)
    VALUES (p_deck_id, auth.uid(), p_rating, p_comment)
    ON CONFLICT (deck_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW();
    UPDATE public.public_decks SET avg_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.deck_ratings WHERE deck_id = p_deck_id)
    WHERE id = p_deck_id;
END; $$;

INSERT INTO public.shop_items (name, description, price_xp, icon, item_type) VALUES
  ('Băng giá Sakura', 'Bảo vệ Streak của bạn trong 1 ngày nếu lỡ quên học.', 500, 'Flame', 'streak_freeze'),
  ('Bảo hiểm vĩnh cửu', 'Tự động kích hoạt khi Streak sắp mất (dùng 1 lần).', 1200, 'Shield', 'streak_insurance'),
  ('Nước tăng lực XP', 'Tăng 50% XP nhận được trong 1 giờ.', 300, 'Zap', 'xp_boost'),
  ('Lương thực linh thú', 'Hồi phục năng lượng cho Pet ngay lập tức.', 200, 'Apple', 'pet_food')
ON CONFLICT DO NOTHING;

-- ── PART 6.4: BATTLE ──
CREATE TABLE IF NOT EXISTS public.kanji_battle_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0, max_combo INTEGER NOT NULL DEFAULT 0,
    difficulty TEXT NOT NULL, kanji_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.get_kanji_battle_leaderboard(p_period TEXT DEFAULT 'daily')
RETURNS TABLE (user_id UUID, display_name TEXT, avatar_url TEXT, max_score INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT s.user_id, p.display_name, p.avatar_url, MAX(s.score) as max_score
    FROM public.kanji_battle_scores s
    JOIN public.profiles p ON s.user_id = p.user_id
    WHERE CASE WHEN p_period = 'daily' THEN s.created_at >= CURRENT_DATE
               WHEN p_period = 'weekly' THEN s.created_at >= CURRENT_DATE - INTERVAL '7 days'
               ELSE TRUE END
    GROUP BY s.user_id, p.display_name, p.avatar_url
    ORDER BY max_score DESC LIMIT 20;
END; $$;

CREATE TABLE IF NOT EXISTS public.bosses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, description TEXT,
    max_hp INTEGER NOT NULL, avatar_url TEXT,
    difficulty TEXT DEFAULT 'normal', reward_xp INTEGER DEFAULT 1000,
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
    attempts INTEGER DEFAULT 0, last_attack_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, boss_id)
);

CREATE OR REPLACE FUNCTION public.attack_boss(p_boss_id UUID, p_damage INTEGER DEFAULT 1, p_is_correct BOOLEAN DEFAULT TRUE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_progress public.user_boss_progress%ROWTYPE; v_boss public.bosses%ROWTYPE;
        v_reward_received BOOLEAN := FALSE; v_actual_damage INTEGER := 1;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
    SELECT * INTO v_boss FROM public.bosses WHERE id = p_boss_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error','Boss not found'); END IF;
    SELECT * INTO v_progress FROM public.user_boss_progress WHERE user_id = auth.uid() AND boss_id = p_boss_id;
    IF NOT FOUND THEN
        INSERT INTO public.user_boss_progress (user_id, boss_id, current_hp)
        VALUES (auth.uid(), p_boss_id, v_boss.max_hp) RETURNING * INTO v_progress;
    END IF;
    IF v_progress.is_defeated THEN RETURN jsonb_build_object('error','Boss already defeated'); END IF;
    IF p_is_correct THEN v_progress.current_hp := GREATEST(0, v_progress.current_hp - v_actual_damage); END IF;
    v_progress.attempts := v_progress.attempts + 1;
    v_progress.last_attack_at := NOW();
    IF v_progress.current_hp = 0 THEN
        v_progress.is_defeated := TRUE;
        v_reward_received := TRUE;
        UPDATE public.profiles SET total_xp = total_xp + v_boss.reward_xp WHERE user_id = auth.uid();
        IF v_boss.reward_item_id IS NOT NULL THEN
            INSERT INTO public.user_inventory (user_id, item_id, quantity)
            VALUES (auth.uid(), v_boss.reward_item_id, 1)
            ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = user_inventory.quantity + 1;
        END IF;
    END IF;
    UPDATE public.user_boss_progress
    SET current_hp = v_progress.current_hp, is_defeated = v_progress.is_defeated,
        attempts = v_progress.attempts, last_attack_at = v_progress.last_attack_at
    WHERE id = v_progress.id;
    RETURN jsonb_build_object('current_hp', v_progress.current_hp, 'max_hp', v_boss.max_hp,
        'is_defeated', v_progress.is_defeated, 'reward_received', v_reward_received,
        'xp_gained', CASE WHEN v_reward_received THEN v_boss.reward_xp ELSE 0 END);
END; $$;

INSERT INTO public.bosses (name, description, max_hp, avatar_url, difficulty, reward_xp) VALUES
  ('Quỷ Kanji N5', 'Kẻ canh giữ cổng sơ cấp. Phải vượt qua 10 câu hỏi để đánh bại hắn!', 10, '👹', 'easy', 500),
  ('Vua Trợ Từ', 'Hắn sẽ làm bạn rối loạn với は và が. Cẩn thận!', 15, '👑', 'normal', 1000),
  ('Rồng Thụ Động', 'Chuyên gia thể bị động và sai khiến. Chỉ dành cho bậc thầy N3!', 25, '🐲', 'hard', 2500)
ON CONFLICT DO NOTHING;

ALTER TABLE public.kanji_battle_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bosses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_boss_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view battle scores for leaderboard" ON public.kanji_battle_scores FOR SELECT USING (true);
CREATE POLICY "Users insert own battle scores" ON public.kanji_battle_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone view bosses" ON public.bosses FOR SELECT USING (true);
CREATE POLICY "Users view own boss progress" ON public.user_boss_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own boss progress" ON public.user_boss_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);