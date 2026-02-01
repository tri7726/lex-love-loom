-- Create table for user's favorite videos
CREATE TABLE public.favorite_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.video_sources(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.favorite_videos ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorite_videos
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
ON public.favorite_videos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove favorites
CREATE POLICY "Users can remove favorites"
ON public.favorite_videos
FOR DELETE
USING (auth.uid() = user_id);