-- Create pronunciation_results table for storing speaking practice data
CREATE TABLE public.pronunciation_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_text TEXT NOT NULL,
  recognized_text TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  feedback TEXT,
  mode TEXT NOT NULL DEFAULT 'shadowing',
  accuracy_score INTEGER,
  duration_score INTEGER,
  rhythm_score INTEGER,
  fluency_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pronunciation_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own results" 
ON public.pronunciation_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own results" 
ON public.pronunciation_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own results" 
ON public.pronunciation_results 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_pronunciation_results_user_id ON public.pronunciation_results(user_id);
CREATE INDEX idx_pronunciation_results_created_at ON public.pronunciation_results(created_at DESC);