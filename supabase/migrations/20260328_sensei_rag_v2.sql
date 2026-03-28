-- Fix: Add 'profile' to source_type allowed values
ALTER TABLE sensei_knowledge
  DROP CONSTRAINT IF EXISTS sensei_knowledge_source_type_check;

ALTER TABLE sensei_knowledge
  ADD CONSTRAINT sensei_knowledge_source_type_check
  CHECK (source_type IN ('mistake', 'flashcard', 'conversation', 'quiz', 'profile', 'vocabulary'));

-- Priority 4: Time-weighted retrieval function
-- Recency bonus: entries from the last 7 days get a 30% boost, last 30 days 15%
CREATE OR REPLACE FUNCTION match_sensei_knowledge(
  query_embedding VECTOR(768),
  target_user_id UUID,
  match_threshold FLOAT DEFAULT 0.45,
  match_count INT DEFAULT 6
)
RETURNS TABLE(content TEXT, source_type TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT
    content,
    source_type,
    metadata,
    -- Time-weighted similarity: recent entries score higher
    (1 - (embedding <=> query_embedding)) *
    CASE
      WHEN created_at > NOW() - INTERVAL '7 days'  THEN 1.3  -- 30% boost
      WHEN created_at > NOW() - INTERVAL '30 days' THEN 1.15 -- 15% boost
      WHEN created_at > NOW() - INTERVAL '90 days' THEN 1.0  -- No change
      ELSE 0.85                                               -- 15% penalty for old
    END AS similarity
  FROM sensei_knowledge
  WHERE user_id = target_user_id
    AND (1 - (embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
