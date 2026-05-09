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
