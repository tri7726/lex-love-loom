-- Part 4.2: RPG Combat & Adventure
-- ── 1. MATERIALS ──
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
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_pet_materials (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    material_id TEXT REFERENCES public.pet_materials(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, material_id)
);

-- ── 2. GEAR ──
CREATE TABLE IF NOT EXISTS public.pet_gear (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    image_url TEXT,
    str_bonus INTEGER DEFAULT 0,
    int_bonus INTEGER DEFAULT 0,
    def_bonus INTEGER DEFAULT 0,
    luk_bonus INTEGER DEFAULT 0,
    hp_bonus INTEGER DEFAULT 0
);

INSERT INTO public.pet_gear (id, name, type, description, emoji, str_bonus, int_bonus, def_bonus, luk_bonus, hp_bonus) VALUES
('wooden_sword', 'Kiếm Gỗ', 'weapon', 'Thô sơ nhưng hiệu quả.', '🗡️', 2, 0, 0, 0, 0),
('iron_shield', 'Khiên Sắt', 'armor', 'Bảo vệ Pet tốt hơn.', '🛡️', 0, 0, 3, 0, 50),
('lucky_amulet', 'Bùa May Mắn', 'accessory', 'Tăng vận may khi thám hiểm.', '🧿', 0, 0, 0, 5, 0),
('magic_wand', 'Trượng Phép', 'weapon', 'Tăng uy lực tuyệt chiêu.', '🪄', 0, 4, 0, 0, 10)
ON CONFLICT (id) DO UPDATE SET
    str_bonus = EXCLUDED.str_bonus, int_bonus = EXCLUDED.int_bonus,
    def_bonus = EXCLUDED.def_bonus, luk_bonus = EXCLUDED.luk_bonus, hp_bonus = EXCLUDED.hp_bonus;

CREATE TABLE IF NOT EXISTS public.user_pet_gear (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gear_id TEXT REFERENCES public.pet_gear(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    is_equipped BOOLEAN DEFAULT false,
    PRIMARY KEY (user_id, gear_id)
);

ALTER TABLE public.pet_recipes ADD COLUMN IF NOT EXISTS output_gear_id TEXT REFERENCES public.pet_gear(id);
ALTER TABLE public.pet_recipes ADD COLUMN IF NOT EXISTS cost_coins INTEGER DEFAULT 0;

INSERT INTO public.pet_recipes (id, name, emoji, description, ingredients, output_gear_id, cost_coins) VALUES
('recipe_wooden_sword', 'Chế Kiếm Gỗ', '🗡️', 'Cần gỗ', '{"wood_scrap": 5}', 'wooden_sword', 100),
('recipe_iron_shield', 'Chế Khiên Sắt', '🛡️', 'Cần sắt', '{"wood_scrap": 2, "iron_ore": 8}', 'iron_shield', 300),
('recipe_lucky_amulet', 'Chế Bùa May Mắn', '🧿', 'Cần pha lê', '{"magic_crystal": 3, "wood_scrap": 5}', 'lucky_amulet', 500),
('recipe_magic_wand', 'Chế Trượng Phép', '🪄', 'Cần pha lê và sắt', '{"magic_crystal": 10, "iron_ore": 2}', 'magic_wand', 800)
ON CONFLICT (id) DO NOTHING;

-- ── 3. MONSTERS ──
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
    element TEXT DEFAULT 'neutral',
    xp_reward INTEGER DEFAULT 50,
    coin_reward INTEGER DEFAULT 20,
    loot_table JSONB DEFAULT '[]'
);

INSERT INTO public.pet_monsters (name, description, emoji, level, hp, attack, element, xp_reward, coin_reward) VALUES
('Slime Lười Biếng', 'Rất yếu, thích hợp để khởi động.', '💧', 1, 50, 5, 'water', 20, 10),
('Mộc Nhân', 'Bù nhìn gỗ dùng để tập luyện.', '🪵', 2, 100, 8, 'grass', 40, 15),
('Tiểu Hỏa Hồ', 'Cáo lửa nhỏ, có thể phun lửa.', '🔥', 3, 150, 15, 'fire', 80, 30),
('Goblin Trộm Cắp', 'Nhanh nhẹn và hay ăn trộm đồ.', '👺', 4, 120, 20, 'neutral', 100, 50)
ON CONFLICT DO NOTHING;

-- ── 4. ADVENTURE ──
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
    possible_loot JSONB DEFAULT '[]'
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
    loot_obtained JSONB DEFAULT '{}',
    xp_gained INTEGER DEFAULT 0
);

-- ── 5. SHOP & CONSUMABLES ──
CREATE TABLE IF NOT EXISTS public.pet_shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    type TEXT NOT NULL,
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.pet_shop_items(id),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- RLS
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
CREATE POLICY "Users manage own materials" ON public.user_pet_materials FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read gear" ON public.pet_gear FOR SELECT USING (true);
CREATE POLICY "Users manage own gear" ON public.user_pet_gear FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read monsters" ON public.pet_monsters FOR SELECT USING (true);
CREATE POLICY "Public read adventure areas" ON public.pet_adventure_areas FOR SELECT USING (true);
CREATE POLICY "Users manage own expeditions" ON public.pet_expeditions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read shop items" ON public.pet_shop_items FOR SELECT USING (true);
CREATE POLICY "Users manage own inventory items" ON public.user_pet_inventory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── HÀM TÍNH STATS TỔNG ──
CREATE OR REPLACE FUNCTION public.calculate_pet_total_stats(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pet RECORD; v_gear RECORD;
  v_total_hp INT; v_total_str INT; v_total_def INT; v_total_luk INT;
BEGIN
  SELECT * INTO v_pet FROM public.user_pets WHERE user_id = p_user_id;
  IF v_pet IS NULL THEN RETURN jsonb_build_object('error','no pet'); END IF;
  SELECT COALESCE(SUM(pg.str_bonus), 0) as str, COALESCE(SUM(pg.def_bonus), 0) as def, COALESCE(SUM(pg.luk_bonus), 0) as luk, COALESCE(SUM(pg.hp_bonus), 0) as hp
  INTO v_gear FROM public.user_pet_gear upg JOIN public.pet_gear pg ON pg.id = upg.gear_id
  WHERE upg.user_id = p_user_id AND upg.is_equipped = true;

  v_total_hp := COALESCE(v_pet.max_hp,100) + COALESCE(v_gear.hp,0);
  v_total_str := COALESCE(v_pet.str,5) + COALESCE(v_gear.str,0);
  v_total_def := COALESCE(v_pet.def,5) + COALESCE(v_gear.def,0);
  v_total_luk := COALESCE(v_pet.luk,5) + COALESCE(v_gear.luk,0);

  RETURN jsonb_build_object('str', v_total_str, 'def', v_total_def, 'luk', v_total_luk, 'hp', v_pet.hp, 'max_hp', v_total_hp);
END;
$$;

CREATE OR REPLACE FUNCTION public.craft_pet_gear(p_gear_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gear RECORD; v_pet RECORD; v_user_coins INT; v_success_chance FLOAT; v_recipe RECORD; v_mat_id TEXT; v_mat_qty TEXT;
BEGIN
  SELECT * INTO v_gear FROM public.pet_gear WHERE id = p_gear_id;
  SELECT * INTO v_recipe FROM public.pet_recipes WHERE output_gear_id = p_gear_id;
  SELECT * INTO v_pet FROM public.user_pets WHERE user_id = auth.uid();
  SELECT pet_coins INTO v_user_coins FROM public.profiles WHERE user_id = auth.uid();
  
  IF v_recipe.id IS NULL THEN RAISE EXCEPTION 'No recipe found for this gear'; END IF;
  IF v_user_coins < v_recipe.cost_coins THEN RAISE EXCEPTION 'Not enough coins (need %)', v_recipe.cost_coins; END IF;
  
  FOR v_mat_id, v_mat_qty IN SELECT * FROM jsonb_each_text(v_recipe.ingredients) LOOP
    IF NOT EXISTS (SELECT 1 FROM public.user_pet_materials WHERE user_id = auth.uid() AND material_id = v_mat_id AND quantity >= v_mat_qty::INTEGER) THEN
      RAISE EXCEPTION 'Not enough material: %', v_mat_id;
    END IF;
  END LOOP;

  UPDATE public.profiles SET pet_coins = pet_coins - v_recipe.cost_coins WHERE user_id = auth.uid();
  FOR v_mat_id, v_mat_qty IN SELECT * FROM jsonb_each_text(v_recipe.ingredients) LOOP
    UPDATE public.user_pet_materials SET quantity = quantity - v_mat_qty::INTEGER WHERE user_id = auth.uid() AND material_id = v_mat_id;
  END LOOP;
  
  v_success_chance := 0.7 + (COALESCE(v_pet.luk,5) * 0.01);
  
  IF random() < v_success_chance THEN
    INSERT INTO public.user_pet_gear (user_id, gear_id, quantity) VALUES (auth.uid(), p_gear_id, 1) ON CONFLICT (user_id, gear_id) DO UPDATE SET quantity = user_pet_gear.quantity + 1;
    RETURN jsonb_build_object('success', true, 'message', 'Chế tạo thành công!', 'gear', v_gear.name);
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Chế tạo thất bại... Nguyên liệu đã mất.');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.equip_pet_gear(p_gear_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_gear_type TEXT;
BEGIN
  SELECT pg.type INTO v_gear_type FROM public.pet_gear pg WHERE pg.id = p_gear_id;
  UPDATE public.user_pet_gear SET is_equipped = false FROM public.pet_gear pg WHERE public.user_pet_gear.gear_id = pg.id AND pg.type = v_gear_type AND public.user_pet_gear.user_id = auth.uid();
  UPDATE public.user_pet_gear SET is_equipped = true WHERE gear_id = p_gear_id AND user_id = auth.uid() AND quantity > 0;
  RETURN jsonb_build_object('success', true);
END;
$$;

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