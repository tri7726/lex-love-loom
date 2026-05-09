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
