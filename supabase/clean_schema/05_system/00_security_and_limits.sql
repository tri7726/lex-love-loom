-- ═══════════════════════════════════════════════════════════════
-- SYSTEM SECURITY & LIMITS
-- ═══════════════════════════════════════════════════════════════

-- Hệ thống Giới hạn tốc độ (Rate Limits)
CREATE TABLE public.rate_limits (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier    text NOT NULL, -- user_id or ip
    identifier_type text NOT NULL, -- 'user', 'ip'
    endpoint      text NOT NULL, -- 'earn_xp', 'ai_chat'
    count         integer DEFAULT 0,
    window_start  timestamptz DEFAULT date_trunc('minute', now()),
    blocked_until timestamptz,
    UNIQUE(identifier, identifier_type, endpoint, window_start)
);

CREATE TABLE public.abuse_alerts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier    text NOT NULL,
    identifier_type text NOT NULL,
    reason        text NOT NULL,
    details       jsonb DEFAULT '{}',
    created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);

-- Hàm tăng rate limit và trả về count mới
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
    p_id text, 
    p_type text, 
    p_endpoint text,
    p_tier text DEFAULT 'medium'
) RETURNS integer AS $$
DECLARE
    v_count integer;
    v_window timestamptz := date_trunc('minute', now());
BEGIN
    INSERT INTO public.rate_limits (identifier, identifier_type, endpoint, window_start, count)
    VALUES (p_id, p_type, p_endpoint, v_window, 1)
    ON CONFLICT (identifier, identifier_type, endpoint, window_start) 
    DO UPDATE SET count = rate_limits.count + 1
    RETURNING count INTO v_count;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hàm chặn identifier
CREATE OR REPLACE FUNCTION public.block_identifier(
    p_id text,
    p_type text,
    p_endpoint text,
    p_duration interval
) RETURNS void AS $$
BEGIN
    UPDATE public.rate_limits 
    SET blocked_until = now() + p_duration
    WHERE identifier = p_id 
      AND identifier_type = p_type 
      AND endpoint = p_endpoint
      AND window_start = date_trunc('minute', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bảo mật nâng cao: Ẩn email người dùng khỏi các query public
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- ═══════════════════════════════════════════════════════════════
-- SENSEI RAG: Hybrid Search (Vector + Trigram)
-- ═══════════════════════════════════════════════════════════════

-- Enable trigram extension for keyword-level fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fast keyword/trigram search on sensei_knowledge
CREATE INDEX IF NOT EXISTS idx_sensei_knowledge_content_trgm
ON public.sensei_knowledge USING gin(content gin_trgm_ops);

-- Hybrid Search: Vector similarity (semantic) + Trigram (keyword) + Time-weight
-- Catches exact terms like particle names, kanji, katakana that vector search alone misses.
CREATE OR REPLACE FUNCTION public.hybrid_search_sensei(
    query_embedding vector(1536),
    query_text TEXT,
    match_count INT DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT
        sk.id,
        sk.content,
        sk.metadata,
        -- Combined score: 60% vector similarity + 40% trigram similarity
        (0.6 * (1 - (sk.embedding <=> query_embedding)) +
         0.4 * similarity(sk.content, query_text))::FLOAT AS similarity
    FROM public.sensei_knowledge sk
    WHERE
        sk.embedding IS NOT NULL
        AND (
            (1 - (sk.embedding <=> query_embedding)) > similarity_threshold
            OR similarity(sk.content, query_text) > 0.2
        )
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

