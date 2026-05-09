-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: GAMIFICATION & SOCIAL SYSTEMS — Quests, Messages, Rewards
-- ═══════════════════════════════════════════════════════════════

-- ── 1. DAILY QUESTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL,
    quest_type TEXT NOT NULL, -- 'vocab', 'reading', 'speaking', 'login', 'perfect_quiz'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES public.daily_quests(id) ON DELETE CASCADE,
    current_value INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, quest_id)
);

-- Bảng theo dõi tiến độ quest theo ngày (dùng cho DailyQuests dashboard)
CREATE TABLE IF NOT EXISTS public.daily_quest_progress (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quest_id TEXT NOT NULL, -- matches daily_quests.quest_type or a fixed string ID
    is_completed BOOLEAN DEFAULT FALSE,
    is_claimed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, quest_date, quest_id)
);

ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quest_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quests" ON public.daily_quests FOR SELECT USING (true);
CREATE POLICY "Users can manage own quests" ON public.user_quests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own quest progress" ON public.daily_quest_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert/update own quest progress" ON public.daily_quest_progress FOR ALL USING (auth.uid() = user_id);

-- ── 2. DIRECT MESSAGES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own conversation" ON public.messages 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages" ON public.messages 
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ── 3. FUNCTIONS ───────────────────────────────────────────────

-- Hàm tự động tạo/reset nhiệm vụ hằng ngày cho user
CREATE OR REPLACE FUNCTION public.sync_user_quests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Chèn các nhiệm vụ mới nếu chưa có trong ngày
    INSERT INTO public.user_quests (user_id, quest_id)
    SELECT auth.uid(), id FROM public.daily_quests
    ON CONFLICT (user_id, quest_id) DO UPDATE
    SET current_value = 0, is_completed = false, completed_at = NULL, last_reset_at = NOW()
    WHERE user_quests.last_reset_at::date < CURRENT_DATE;
END;
$$;

-- ── 4. SEED DATA ───────────────────────────────────────────────
INSERT INTO public.daily_quests (id, title, description, target_value, reward_xp, quest_type) VALUES
  (gen_random_uuid(), 'Văn ôn võ luyện', 'Học 10 từ vựng mới', 10, 200, 'vocab'),
  (gen_random_uuid(), 'Mọt sách Nhật Bản', 'Đọc 2 bài báo Sakura', 2, 300, 'reading'),
  (gen_random_uuid(), 'Bậc thầy đàm thoại', 'Luyện nói 5 câu hoàn hảo', 5, 500, 'speaking'),
  (gen_random_uuid(), 'Chiến thần Quiz', 'Đạt 100% trong 1 bài Quiz', 1, 400, 'perfect_quiz')
ON CONFLICT DO NOTHING;
