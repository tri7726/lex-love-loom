-- Create Friendships table (Following model)
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- RLS Policies
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can see who they are following
CREATE POLICY "Users can view their own followings" ON public.friendships 
FOR SELECT USING (auth.uid() = user_id);

-- Users can see who is following them
CREATE POLICY "Users can view their own followers" ON public.friendships 
FOR SELECT USING (auth.uid() = friend_id);

-- Users can follow others
CREATE POLICY "Users can insert followings" ON public.friendships 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can unfollow others
CREATE POLICY "Users can delete followings" ON public.friendships 
FOR DELETE USING (auth.uid() = user_id);

-- Add helper view for friend profiles
CREATE OR REPLACE VIEW public.friend_profiles AS
SELECT 
    f.user_id as follower_id,
    p.*
FROM public.friendships f
JOIN public.profiles p ON f.friend_id = p.user_id;
