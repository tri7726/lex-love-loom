-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: REAL-TIME CHAT — Conversations, Messaging, Presence
-- ═══════════════════════════════════════════════════════════════

-- ── 1. CONVERSATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_1 UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    user_2 UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    last_message_preview TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_1, user_2)
);

CREATE INDEX idx_conversations_users ON public.conversations(user_1, user_2);
CREATE INDEX idx_conversations_last_at ON public.conversations(last_message_at DESC);

-- ── 2. UPGRADE MESSAGES ────────────────────────────────────────
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- ── 3. RLS POLICIES ───────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conversations" ON public.conversations 
FOR SELECT USING (auth.uid() = user_1 OR auth.uid() = user_2);

-- ── 4. FUNCTIONS ───────────────────────────────────────────────

-- Tự động tạo conversation nếu chưa có khi gửi tin nhắn
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_conversation_id UUID;
    v_user_1 UUID;
    v_user_2 UUID;
BEGIN
    -- Xác định user_1 < user_2 để tránh trùng lặp
    IF NEW.sender_id < NEW.receiver_id THEN
        v_user_1 := NEW.sender_id; v_user_2 := NEW.receiver_id;
    ELSE
        v_user_1 := NEW.receiver_id; v_user_2 := NEW.sender_id;
    END IF;

    -- Tìm hoặc tạo conversation
    INSERT INTO public.conversations (user_1, user_2, last_message_preview, last_message_at)
    VALUES (v_user_1, v_user_2, LEFT(NEW.content, 100), NOW())
    ON CONFLICT (user_1, user_2) DO UPDATE 
    SET last_message_preview = EXCLUDED.last_message_preview,
        last_message_at = EXCLUDED.last_message_at
    RETURNING id INTO v_conversation_id;

    NEW.conversation_id := v_conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_handle_new_message
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- ── 5. REALTIME ───────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
