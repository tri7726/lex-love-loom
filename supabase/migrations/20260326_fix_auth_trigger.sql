-- Migration: Fix handle_new_user trigger
-- Description: Harmonizes the trigger with current profiles schema and automatically assigns 'user' role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_display_name TEXT;
BEGIN
    -- Determine a good default display name
    default_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'username',
        SPLIT_PART(NEW.email, '@', 1)
    );

    -- Insert into profiles
    -- Note: Schema A uses user_id as the link to auth.users, while id is gen_random_uuid()
    -- Schema B (if active) uses id as the link. 3
    -- Based on types.ts, both exist and user_id is the required one for linking.
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

    -- Automatically assign 'user' role if user_roles table exists
    -- We use a dynamic check or just wrap in exception handler if needed, 
    -- but since we know it exists from recent migrations:
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-apply the trigger to be absolutely sure
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
