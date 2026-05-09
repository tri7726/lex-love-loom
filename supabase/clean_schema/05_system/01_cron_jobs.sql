-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: SYSTEM — Cron Jobs, Maintenance, Extensions
-- ═══════════════════════════════════════════════════════════════

-- ── 1. EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 2. PRIVATE SETTINGS ────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- ── 3. CRON JOBS ───────────────────────────────────────────────

-- Job 1: Reset Weekly XP every Monday at 00:00
SELECT cron.schedule(
    'reset-weekly-xp-monday',
    '0 0 * * 1',
    $$ SELECT public.reset_weekly_xp_all(); $$
);

-- Job 2: Scheduled Reminders (Edge Function)
-- Gửi thông báo nhắc học bài mỗi 30 phút
SELECT cron.schedule(
    'lex-study-reminder-cron',
    '0,30 * * * *',
    $$
    SELECT net.http_post(
        url := (SELECT value FROM private.settings WHERE key = 'api_url') || '/functions/v1/scheduled-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM private.settings WHERE key = 'service_role_key')
        )
    );
    $$
);

-- ── 4. RLS & SECURITY ──────────────────────────────────────────
-- Private schema is inherently private (not exposed via PostgREST),
-- but we should ensure no public access just in case.
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
