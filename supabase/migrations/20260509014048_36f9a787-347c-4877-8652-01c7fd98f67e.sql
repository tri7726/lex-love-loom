
-- 1. analysis_history: dedupe + tăng tốc cache lookup
CREATE UNIQUE INDEX IF NOT EXISTS uq_analysis_history_user_content_ver
  ON public.analysis_history (user_id, md5(content), schema_version);
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_ver_created
  ON public.analysis_history (user_id, schema_version, created_at DESC);

-- 2. Backfill admin cho 2 email seed nếu user đã tồn tại trước trigger
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email IN ('phamdjj6@gmail.com', 'phamdjjd6@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. View aggregate cho /admin/telemetry — top misses 7 ngày
CREATE OR REPLACE VIEW public.admin_telemetry_top_misses
WITH (security_invoker = true) AS
SELECT
  feature,
  word,
  reading,
  reason,
  COUNT(*)::int AS miss_count,
  MAX(created_at) AS last_seen_at
FROM public.analysis_telemetry
WHERE event = 'miss'
  AND created_at > now() - interval '7 days'
  AND word IS NOT NULL
GROUP BY feature, word, reading, reason
ORDER BY miss_count DESC;

COMMENT ON VIEW public.admin_telemetry_top_misses IS
  'Admin-only view (RLS via underlying table). 7-day rolling aggregate of lookup misses.';

-- 4. Hàm purge telemetry cũ — chỉ admin gọi được
CREATE OR REPLACE FUNCTION public.purge_old_telemetry(p_days int DEFAULT 30)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_deleted int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
  IF p_days < 1 THEN
    RAISE EXCEPTION 'p_days must be >= 1';
  END IF;
  WITH d AS (
    DELETE FROM public.analysis_telemetry
    WHERE created_at < now() - (p_days || ' days')::interval
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_deleted FROM d;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_telemetry(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_telemetry(int) TO authenticated;
