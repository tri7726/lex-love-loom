-- Add bio and additional role support to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Create Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'follow', 'challenge', 'system', 'squad'
    content TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications 
FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to automatically create a notification on new friendship (follow)
CREATE OR REPLACE FUNCTION public.handle_new_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, content, link)
    VALUES (
        NEW.friend_id, 
        'follow', 
        'Ai đó vừa bắt đầu theo dõi bạn!', 
        '/friends'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_notification ON public.friendships;
CREATE TRIGGER on_follow_notification
    AFTER INSERT ON public.friendships
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_follow_notification();
