-- Create word_cache table for caching word lookups
CREATE TABLE public.word_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  reading TEXT,
  meaning TEXT NOT NULL,
  word_type TEXT,
  examples JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  source TEXT DEFAULT 'ai', -- 'ai', 'jisho', 'preload'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(word)
);

-- Enable RLS
ALTER TABLE public.word_cache ENABLE ROW LEVEL SECURITY;

-- Policies - everyone can read, system can write
CREATE POLICY "Anyone can view word cache"
ON public.word_cache
FOR SELECT
USING (true);

CREATE POLICY "System can insert word cache"
ON public.word_cache
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update word cache"
ON public.word_cache
FOR UPDATE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_word_cache_updated_at
BEFORE UPDATE ON public.word_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast lookups
CREATE INDEX idx_word_cache_word ON public.word_cache(word);

-- Add preloaded_vocabulary column to reading_passages for preloaded word data
ALTER TABLE public.reading_passages 
ADD COLUMN IF NOT EXISTS preloaded_vocabulary JSONB DEFAULT '[]'::jsonb;