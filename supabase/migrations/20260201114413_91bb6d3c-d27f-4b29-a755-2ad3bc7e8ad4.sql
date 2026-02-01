-- Create video_sources table
CREATE TABLE public.video_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER,
  thumbnail_url TEXT,
  jlpt_level TEXT DEFAULT 'N5',
  processed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_segments table (pre-processed by AI)
CREATE TABLE public.video_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.video_sources(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  start_time FLOAT NOT NULL,
  end_time FLOAT NOT NULL,
  japanese_text TEXT NOT NULL,
  vietnamese_text TEXT,
  grammar_notes JSONB DEFAULT '[]',
  vocabulary JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, segment_index)
);

-- Create user_video_progress table
CREATE TABLE public.user_video_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.video_segments(id) ON DELETE CASCADE,
  user_input TEXT,
  score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 1,
  status TEXT DEFAULT 'learning' CHECK (status IN ('learning', 'mastered')),
  last_practiced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, segment_id)
);

-- Create saved_vocabulary table (user's personal word list)
CREATE TABLE public.saved_vocabulary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  reading TEXT,
  meaning TEXT NOT NULL,
  example_sentence TEXT,
  source_segment_id UUID REFERENCES public.video_segments(id),
  mastery_level INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, word)
);

-- Enable RLS
ALTER TABLE public.video_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_vocabulary ENABLE ROW LEVEL SECURITY;

-- Video sources policies (public read, auth write)
CREATE POLICY "Anyone can view processed videos" 
ON public.video_sources FOR SELECT 
USING (processed = true);

CREATE POLICY "Authenticated users can add videos" 
ON public.video_sources FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators can update their videos" 
ON public.video_sources FOR UPDATE 
USING (auth.uid() = created_by);

-- Video segments policies (public read for processed videos)
CREATE POLICY "Anyone can view segments of processed videos" 
ON public.video_segments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.video_sources 
    WHERE id = video_id AND processed = true
  )
);

CREATE POLICY "System can insert segments" 
ON public.video_segments FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- User progress policies
CREATE POLICY "Users can view their own progress" 
ON public.user_video_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress" 
ON public.user_video_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON public.user_video_progress FOR UPDATE 
USING (auth.uid() = user_id);

-- Saved vocabulary policies
CREATE POLICY "Users can view their own vocabulary" 
ON public.saved_vocabulary FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vocabulary" 
ON public.saved_vocabulary FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary" 
ON public.saved_vocabulary FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary" 
ON public.saved_vocabulary FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_video_segments_video_id ON public.video_segments(video_id);
CREATE INDEX idx_video_segments_order ON public.video_segments(video_id, segment_index);
CREATE INDEX idx_user_progress_user ON public.user_video_progress(user_id);
CREATE INDEX idx_saved_vocab_user ON public.saved_vocabulary(user_id);

-- Add updated_at trigger for video_sources
CREATE TRIGGER update_video_sources_updated_at
  BEFORE UPDATE ON public.video_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();