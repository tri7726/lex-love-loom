-- Add Web Push notification columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_endpoint TEXT,
  ADD COLUMN IF NOT EXISTS push_p256dh TEXT,
  ADD COLUMN IF NOT EXISTS push_auth TEXT,
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_reminder_time TEXT DEFAULT '20:00',
  ADD COLUMN IF NOT EXISTS push_daily_reminder BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_streak_warning BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_challenge_update BOOLEAN DEFAULT true;
