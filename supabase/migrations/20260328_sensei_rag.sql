-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store vectorized knowledge
CREATE TABLE IF NOT EXISTS sensei_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  source_type TEXT CHECK (source_type IN ('mistake','flashcard','conversation','quiz')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS sensei_knowledge_embedding_idx ON sensei_knowledge
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS
ALTER TABLE sensei_knowledge ENABLE ROW LEVEL SECURITY;

-- Policy: Users only access their own knowledge
CREATE POLICY "Users own their knowledge"
  ON sensei_knowledge FOR ALL USING (auth.uid() = user_id);

-- Function to find the nearest context
CREATE OR REPLACE FUNCTION match_sensei_knowledge(
  query_embedding VECTOR(768),
  target_user_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE(content TEXT, source_type TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT content, source_type, metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM sensei_knowledge
  WHERE user_id = target_user_id
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
