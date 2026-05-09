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
