-- ============================================================
-- MASTER FIX: RESOLVE INDEX CONFLICTS & SCHEMA INCONSISTENCY
-- Date: 2026-03-26
-- ============================================================

-- 1. Ensure 'app_role' enum exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
END $$;

-- 2. Harmonize 'profiles' table
-- We need to ensure it has both 'id' (as PK) and 'user_id' (as unique link to auth.users)
-- and common columns like total_xp, current_streak, etc.
DO $$
BEGIN
    -- Check if 'profiles' exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- Add 'user_id' if it's missing (happens if created by 20260224 migration)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id') THEN
            ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
            -- Pre-fill user_id with id (since in that version id WAS the user_id)
            UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
            ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
        END IF;

        -- Add other missing columns commonly used in multiple migrations
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name') THEN
            ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'total_xp') THEN
            -- Map 'xp' to 'total_xp' if it exists
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'xp') THEN
                ALTER TABLE public.profiles RENAME COLUMN xp TO total_xp;
            ELSE
                ALTER TABLE public.profiles ADD COLUMN total_xp INTEGER DEFAULT 0 NOT NULL;
            END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'current_streak') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'streak') THEN
                ALTER TABLE public.profiles RENAME COLUMN streak TO current_streak;
            ELSE
                ALTER TABLE public.profiles ADD COLUMN current_streak INTEGER DEFAULT 0 NOT NULL;
            END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'jlpt_level') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'level') THEN
                ALTER TABLE public.profiles RENAME COLUMN level TO jlpt_level;
            ELSE
                ALTER TABLE public.profiles ADD COLUMN jlpt_level TEXT DEFAULT 'N5' NOT NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- 3. Ensure 'user_roles' table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- 4. Re-create the master trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_display_name TEXT;
BEGIN
    default_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'username',
        SPLIT_PART(NEW.email, '@', 1)
    );

    -- Insert into profiles using user_id as lookup
    INSERT INTO public.profiles (user_id, display_name, avatar_url, total_xp, current_streak, jlpt_level)
    VALUES (
        NEW.id,
        default_display_name,
        NEW.raw_user_meta_data->>'avatar_url',
        0,
        0,
        'N5'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url;

    -- Automatically assign 'user' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Safely re-apply the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Add guards to Kanji system indexes (fixes "index conflict")
-- These are common sources of conflict if 20260209 is re-run
DO $$
BEGIN
    -- Basic indexes
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_kanji_character' AND n.nspname = 'public') THEN
        CREATE INDEX idx_kanji_character ON public.kanji(character);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_kanji_jlpt' AND n.nspname = 'public') THEN
        CREATE INDEX idx_kanji_jlpt ON public.kanji(jlpt_level);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_kanji_radical' AND n.nspname = 'public') THEN
        CREATE INDEX idx_kanji_radical ON public.kanji(radical);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_kanji_stroke_count' AND n.nspname = 'public') THEN
        CREATE INDEX idx_kanji_stroke_count ON public.kanji(stroke_count);
    END IF;

    -- GIN indexes
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_kanji_onyomi' AND n.nspname = 'public') THEN
        CREATE INDEX idx_kanji_onyomi ON public.kanji USING GIN(onyomi);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_kanji_kunyomi' AND n.nspname = 'public') THEN
        CREATE INDEX idx_kanji_kunyomi ON public.kanji USING GIN(kunyomi);
    END IF;

    -- Vocabulary indexes
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_vocab_word' AND n.nspname = 'public') THEN
        CREATE INDEX idx_vocab_word ON public.kanji_vocabulary(word);
    END IF;
END $$;

-- 7. Add missing columns to profiles for Push Notifications (referenced in run_all)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_endpoint TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_p256dh TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_auth TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_reminder_time TEXT DEFAULT '20:00';

-- 8. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 9. Complete message
DO $$
BEGIN
    RAISE NOTICE '✅ Consolidated fixes applied successfully.';
END $$;
