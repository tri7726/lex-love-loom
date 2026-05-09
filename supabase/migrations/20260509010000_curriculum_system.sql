
-- Curriculum Levels (N5, N4, etc.)
CREATE TABLE IF NOT EXISTS public.curriculum_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- 'N5', 'N4', etc.
    title TEXT NOT NULL,
    description TEXT,
    xp_required INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Curriculum Units (Unit 1, Unit 2...)
CREATE TABLE IF NOT EXISTS public.curriculum_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID NOT NULL REFERENCES public.curriculum_levels(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Curriculum Items (Sub-tasks inside a Unit)
CREATE TABLE IF NOT EXISTS public.curriculum_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.curriculum_units(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'vocabulary', 'grammar', 'listening', 'assignment', 'video'
    title TEXT NOT NULL,
    content_link TEXT, -- Link to specific vocabulary set, grammar ID, or lesson ID
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.curriculum_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_items ENABLE ROW LEVEL SECURITY;

-- Policies (Public can view, Admins/Teachers can manage)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view curriculum levels') THEN
        CREATE POLICY "Public can view curriculum levels" ON public.curriculum_levels FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view curriculum units') THEN
        CREATE POLICY "Public can view curriculum units" ON public.curriculum_units FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view curriculum items') THEN
        CREATE POLICY "Public can view curriculum items" ON public.curriculum_items FOR SELECT USING (true);
    END IF;
END $$;

-- Insert initial N5 Level
INSERT INTO public.curriculum_levels (id, code, title, description, xp_required)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'N5', 'JLPT N5 - Sơ cấp 1', 'Hành trình bắt đầu từ những điều cơ bản nhất. Làm quen với bảng chữ cái và các mẫu câu sơ đẳng.', 0)
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;

-- Insert Unit 1 for N5
INSERT INTO public.curriculum_units (id, level_id, order_index, title, description)
VALUES ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 1, 'Unit 1: Lời chào và Giới thiệu', 'Học cách chào hỏi, giới thiệu bản thân và người khác.')
ON CONFLICT DO NOTHING;

-- Insert Items for Unit 1
INSERT INTO public.curriculum_items (unit_id, order_index, type, title, content_link)
VALUES 
('550e8400-e29b-41d4-a716-446655440001', 1, 'vocabulary', 'Từ vựng & Kanji', '/vocabulary?level=N5&unit=1'),
('550e8400-e29b-41d4-a716-446655440001', 2, 'grammar', 'Ngữ pháp: ~ wa ~ desu', '/grammar?level=N5&unit=1'),
('550e8400-e29b-41d4-a716-446655440001', 3, 'listening', 'Luyện nghe: Giới thiệu', '/listening-lab?unit=1'),
('550e8400-e29b-41d4-a716-446655440001', 4, 'assignment', 'Bài tập Unit 1', '/quiz?unit=1')
ON CONFLICT DO NOTHING;

-- Trigger for ordering (Optional, for now manually managed)

-- Insert Unit 2 for N5
INSERT INTO public.curriculum_units (id, level_id, order_index, title, description)
VALUES ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 2, 'Unit 2: Đồ vật và Sở hữu', 'Học cách hỏi và trả lời về đồ vật, quyền sở hữu (kore, sore, are).')
ON CONFLICT (id) DO NOTHING;

-- Insert Unit 3 for N5
INSERT INTO public.curriculum_units (id, level_id, order_index, title, description)
VALUES ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 3, 'Unit 3: Địa điểm và Phương hướng', 'Hỏi đường, xác định vị trí của địa điểm (koko, soko, asoko).')
ON CONFLICT (id) DO NOTHING;
