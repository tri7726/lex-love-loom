-- Đảm bảo các thay đổi được phát bản đầy đủ (gửi cả OLD row khi UPDATE/DELETE)
ALTER TABLE public.class_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.class_assignment_progress REPLICA IDENTITY FULL;
ALTER TABLE public.live_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.lessons REPLICA IDENTITY FULL;
ALTER TABLE public.class_members REPLICA IDENTITY FULL;

-- Thêm vào publication realtime nếu chưa có
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'class_assignments',
    'class_assignment_progress',
    'live_sessions',
    'lessons',
    'class_members'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;