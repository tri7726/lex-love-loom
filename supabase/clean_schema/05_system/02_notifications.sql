-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: SYSTEM — Notifications
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'follow', 'challenge', 'system', 'squad'
    content TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications 
FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to automatically create a notification on new friendship (follow)
-- Note: Uses the sender/receiver model from 04_social_pets/03_friendships_and_activity.sql
CREATE OR REPLACE FUNCTION public.handle_new_friendship_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, content, link)
    VALUES (
        NEW.receiver_id, 
        'follow', 
        'Bạn có một lời mời kết bạn mới!', 
        '/friends'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friendship_notification ON public.friendships;
CREATE TRIGGER on_friendship_notification
    AFTER INSERT ON public.friendships
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_friendship_notification();
