-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the study reminder check every 30 minutes
-- Note: Replace [PROJECT_REF] with the actual Supabase project ID in the UI if needed.
-- Or use the local URL for testing if available.
-- In Supabase production, this will look like: 
-- https://xyz.supabsse.co/functions/v1/scheduled-reminders

SELECT cron.schedule(
  'lex-study-reminder-cron',
  '0,30 * * * *', -- At minute 0 and 30 every hour
  $$
  SELECT net.http_post(
    url := (SELECT value FROM private.settings WHERE key = 'api_url') || '/functions/v1/scheduled-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || (SELECT value FROM private.settings WHERE key = 'service_role_key') || '"}'
  );
  $$
);

-- Seed metadata if not exists for the crawler
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.settings (key TEXT PRIMARY KEY, value TEXT);
-- Note: USER should fill these values in Supabase for the cron to work perfectly.
