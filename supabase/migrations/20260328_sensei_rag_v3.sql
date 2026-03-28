-- ══════════════════════════════════════════════════════════════
-- RAG v3: Hybrid Search (pg_trgm) + improved vector search
-- ══════════════════════════════════════════════════════════════

-- Enable trigram extension for keyword-level fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fast keyword/trigram search on content
CREATE INDEX IF NOT EXISTS sensei_knowledge_content_trgm_idx
  ON sensei_knowledge USING gin (content gin_trgm_ops);

-- ── Hybrid Search Function ────────────────────────────────────
-- Combines: Vector similarity (semantic) + Trigram (keyword) + Time-weight
-- This catches exact terms like particle names, kanji, katakana that
-- vector search alone can miss.
CREATE OR REPLACE FUNCTION hybrid_match_sensei_knowledge(
  query_embedding VECTOR(768),
  query_text TEXT,
  target_user_id UUID,
  match_threshold FLOAT DEFAULT 0.40,
  match_count INT DEFAULT 8
)
RETURNS TABLE(content TEXT, source_type TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT
    sk.content,
    sk.source_type,
    sk.metadata,
    -- Hybrid score: 70% vector + 30% keyword (normalized to 0-1)
    (
      0.7 * (1 - (sk.embedding <=> query_embedding))
      +
      0.3 * COALESCE(similarity(sk.content, query_text), 0)
    )
    *
    -- Time-weight multiplier
    CASE
      WHEN sk.created_at > NOW() - INTERVAL '7 days'  THEN 1.3
      WHEN sk.created_at > NOW() - INTERVAL '30 days' THEN 1.15
      WHEN sk.created_at > NOW() - INTERVAL '90 days' THEN 1.0
      ELSE 0.85
    END AS similarity
  FROM sensei_knowledge sk
  WHERE sk.user_id = target_user_id
    AND (
      -- Pass if EITHER semantic OR keyword match is decent
      (1 - (sk.embedding <=> query_embedding)) > match_threshold
      OR
      similarity(sk.content, query_text) > 0.15
    )
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
