-- Direct Messaging System
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sent/received messages" ON public.messages 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.messages 
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Daily Quests System
CREATE TABLE IF NOT EXISTS public.daily_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL,
    type TEXT NOT NULL -- 'vocab', 'reading', 'roleplay', 'login'
);

-- User Quest Progress
CREATE TABLE IF NOT EXISTS public.user_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES public.daily_quests(id) ON DELETE CASCADE,
    current_value INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    reset_at TIMESTAMPTZ DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
    UNIQUE(user_id, quest_id)
);

-- RLS for Quests
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quest progress" ON public.user_quests 
FOR SELECT USING (auth.uid() = user_id);

-- Insert some default daily quests
INSERT INTO public.daily_quests (title, description, target_value, reward_xp, type)
VALUES 
('Văn ôn võ luyện', 'Học thêm 10 từ vựng mới trong ngày', 10, 200, 'vocab'),
('Mọt sách Nhật Bản', 'Đọc ít nhất 2 bài tin tức', 2, 300, 'reading'),
('Bậc thầy đàm thoại', 'Hoàn thành 1 buổi Roleplay AI', 1, 500, 'roleplay')
ON CONFLICT DO NOTHING;
