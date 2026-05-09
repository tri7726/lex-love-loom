
-- Table for admin-uploaded documents
CREATE TABLE IF NOT EXISTS public.admin_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  mime text NOT NULL DEFAULT 'text/markdown',
  content text,                 -- inline for md/txt
  storage_path text,            -- path in sensei-docs bucket for binary
  size_bytes int,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_docs_created ON public.admin_docs(created_at DESC);

ALTER TABLE public.admin_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read admin_docs"   ON public.admin_docs;
DROP POLICY IF EXISTS "Admins insert admin_docs" ON public.admin_docs;
DROP POLICY IF EXISTS "Admins update admin_docs" ON public.admin_docs;
DROP POLICY IF EXISTS "Admins delete admin_docs" ON public.admin_docs;

CREATE POLICY "Admins read admin_docs"   ON public.admin_docs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert admin_docs" ON public.admin_docs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update admin_docs" ON public.admin_docs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete admin_docs" ON public.admin_docs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_admin_docs_updated_at ON public.admin_docs;
CREATE TRIGGER trg_admin_docs_updated_at BEFORE UPDATE ON public.admin_docs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

-- Storage bucket (private) for binary attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('sensei-docs', 'sensei-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read sensei-docs"   ON storage.objects;
DROP POLICY IF EXISTS "Admins upload sensei-docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins update sensei-docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete sensei-docs" ON storage.objects;

CREATE POLICY "Admins read sensei-docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sensei-docs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins upload sensei-docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sensei-docs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update sensei-docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'sensei-docs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete sensei-docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'sensei-docs' AND public.has_role(auth.uid(), 'admin'));
