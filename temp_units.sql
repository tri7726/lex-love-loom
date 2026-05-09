-- Insert Unit 2 for N5
INSERT INTO public.curriculum_units (id, level_id, order_index, title, description)
VALUES ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 2, 'Unit 2: Đồ vật và Sở hữu', 'Học cách hỏi và trả lời về đồ vật, quyền sở hữu (kore, sore, are).')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;

-- Insert Unit 3 for N5
INSERT INTO public.curriculum_units (id, level_id, order_index, title, description)
VALUES ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 3, 'Unit 3: Địa điểm và Phương hướng', 'Hỏi đường, xác định vị trí của địa điểm (koko, soko, asoko).')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
