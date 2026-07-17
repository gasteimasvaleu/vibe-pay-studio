
CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  media_paths text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','wont_fix')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bug_reports_insert_own"
  ON public.bug_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "bug_reports_select_own_or_admin"
  ON public.bug_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "bug_reports_admin_update"
  ON public.bug_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TRIGGER bug_reports_set_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX bug_reports_status_created_idx
  ON public.bug_reports (status, created_at DESC);
CREATE INDEX bug_reports_reporter_idx
  ON public.bug_reports (reporter_id, created_at DESC);

-- Storage policies for bug-evidence bucket
CREATE POLICY "bug_evidence_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bug-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "bug_evidence_owner_or_admin_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'bug-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'moderator')
    )
  );

CREATE POLICY "bug_evidence_owner_or_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'bug-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(),'admin')
    )
  );
