
CREATE TABLE public.content_leak_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  title text NOT NULL,
  leak_url text NOT NULL,
  description text NOT NULL,
  evidence_paths text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.content_leak_reports TO authenticated;
GRANT ALL ON public.content_leak_reports TO service_role;

ALTER TABLE public.content_leak_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reporter_insert_own"
  ON public.content_leak_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reporter_select_own"
  ON public.content_leak_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "admin_update"
  ON public.content_leak_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TRIGGER content_leak_reports_set_updated_at
  BEFORE UPDATE ON public.content_leak_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX content_leak_reports_status_created_idx
  ON public.content_leak_reports (status, created_at DESC);
CREATE INDEX content_leak_reports_reporter_idx
  ON public.content_leak_reports (reporter_id, created_at DESC);

-- Storage policies for leak-evidence bucket
CREATE POLICY "leak_evidence_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'leak-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "leak_evidence_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'leak-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'moderator')
    )
  );

CREATE POLICY "leak_evidence_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'leak-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(),'admin')
    )
  );
