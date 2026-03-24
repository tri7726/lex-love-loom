-- Add furigana_mode column to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS furigana_mode TEXT DEFAULT 'smart'
  CHECK (furigana_mode IN ('always', 'n5', 'n4', 'n3', 'n2', 'never', 'smart'));
