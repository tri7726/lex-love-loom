-- Part 4.3: PvP & Squad Goals (challenges/squad_goals tables already exist; just indexes & realtime)
CREATE INDEX IF NOT EXISTS idx_challenges_users ON public.challenges(challenger_id, opponent_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_squad_goals_squad ON public.squad_goals(squad_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_goals;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Part 4.4: Friendships & Activity feed
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked','declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_users ON public.friendships(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content JSONB NOT NULL,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public','friends','private')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_date ON public.user_activities(user_id, created_at DESC);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own friendships" ON public.friendships FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users manage own friendships" ON public.friendships FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id) WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Activity visibility policy" ON public.user_activities FOR SELECT USING (
  visibility = 'public' OR
  (visibility = 'friends' AND EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((sender_id = auth.uid() AND receiver_id = user_activities.user_id) OR (sender_id = user_activities.user_id AND receiver_id = auth.uid()))
  )) OR
  auth.uid() = user_id
);
CREATE POLICY "Users create own activities" ON public.user_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.log_achievement_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_activities (user_id, type, content)
  VALUES (NEW.user_id, 'achievement_unlocked', jsonb_build_object(
    'title','Đã mở khóa thành tựu!',
    'achievement_id', NEW.achievement_id,
    'timestamp', NOW()
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_achievement_activity ON public.user_achievements;
CREATE TRIGGER trg_log_achievement_activity
AFTER INSERT ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION public.log_achievement_activity();

-- Part 4.5: Realtime Chat (messages + conversations)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  conversation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_users ON public.messages(sender_id, receiver_id);

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_1 UUID NOT NULL,
    user_2 UUID NOT NULL,
    last_message_preview TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_1, user_2)
);
CREATE INDEX IF NOT EXISTS idx_conversations_users ON public.conversations(user_1, user_2);
CREATE INDEX IF NOT EXISTS idx_conversations_last_at ON public.conversations(last_message_at DESC);

ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_1 OR auth.uid() = user_2);

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_1 UUID; v_user_2 UUID; v_conversation_id UUID;
BEGIN
  IF NEW.sender_id < NEW.receiver_id THEN
    v_user_1 := NEW.sender_id; v_user_2 := NEW.receiver_id;
  ELSE
    v_user_1 := NEW.receiver_id; v_user_2 := NEW.sender_id;
  END IF;
  INSERT INTO public.conversations (user_1, user_2, last_message_preview, last_message_at)
  VALUES (v_user_1, v_user_2, LEFT(NEW.content, 100), NOW())
  ON CONFLICT (user_1, user_2) DO UPDATE
    SET last_message_preview = EXCLUDED.last_message_preview,
        last_message_at = EXCLUDED.last_message_at
  RETURNING id INTO v_conversation_id;
  NEW.conversation_id := v_conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_message ON public.messages;
CREATE TRIGGER trg_handle_new_message
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END $$;