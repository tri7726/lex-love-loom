-- Create table for video quiz questions
CREATE TABLE public.video_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.video_sources(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES public.video_segments(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  question_type TEXT NOT NULL DEFAULT 'comprehension',
  difficulty TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_questions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view questions for processed videos"
ON public.video_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.video_sources
    WHERE video_sources.id = video_questions.video_id
    AND video_sources.processed = true
  )
);

CREATE POLICY "Authenticated users can create questions"
ON public.video_questions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for performance
CREATE INDEX idx_video_questions_video_id ON public.video_questions(video_id);
CREATE INDEX idx_video_questions_segment_id ON public.video_questions(segment_id);