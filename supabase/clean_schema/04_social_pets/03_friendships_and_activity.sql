-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: SOCIAL INTERACTIONS — Friendships, Followers, Activity Feed
-- ═══════════════════════════════════════════════════════════════

-- ── 1. FRIENDSHIPS & FOLLOWERS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

CREATE INDEX idx_friendships_users ON public.friendships(sender_id, receiver_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);

-- ── 2. ACTIVITY FEED (Learning Events) ────────────────────────
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'exam_completed', 'achievement_unlocked', 'streak_milestone', 'pet_evolved', 'class_joined'
    content JSONB NOT NULL, -- { title, description, value, link }
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activities_user_date ON public.user_activities(user_id, created_at DESC);

-- ── 3. RLS POLICIES ───────────────────────────────────────────
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Friendships: Users see their own relationships
CREATE POLICY "Users view own friendships" ON public.friendships 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users manage own friendships" ON public.friendships 
FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Activities: Public can see public, Friends see friends, Owners see private
CREATE POLICY "Activity visibility policy" ON public.user_activities
FOR SELECT USING (
    visibility = 'public' OR
    (visibility = 'friends' AND EXISTS (
        SELECT 1 FROM public.friendships 
        WHERE status = 'accepted' 
        AND ((sender_id = auth.uid() AND receiver_id = user_id) OR (sender_id = user_id AND receiver_id = auth.uid()))
    )) OR
    auth.uid() = user_id
);

CREATE POLICY "Users create own activities" ON public.user_activities 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 4. HELPER FUNCTIONS ────────────────────────────────────────

-- Hàm tự động ghi lại hoạt động khi có thành tựu mới
CREATE OR REPLACE FUNCTION public.log_achievement_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_activities (user_id, type, content)
    VALUES (
        NEW.user_id, 
        'achievement_unlocked', 
        jsonb_build_object(
            'title', 'Đã mở khóa thành tựu!',
            'achievement_id', NEW.achievement_id,
            'timestamp', NOW()
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_achievement_activity
AFTER INSERT ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION public.log_achievement_activity();

-- ── 5. STORAGE BUCKETS (Metadata only - creation via dashboard) ──
-- Note: Policy for 'avatars' and 'banners' buckets
/*
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars', 'banners'));
CREATE POLICY "Users Upload own files" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('avatars', 'banners') AND (storage.foldername(name))[1] = auth.uid()::text);
*/
