
-- Moderation status on publications
CREATE TYPE public.moderation_status AS ENUM ('pending','approved','hidden','removed');
ALTER TABLE public.publications
  ADD COLUMN IF NOT EXISTS moderation_status public.moderation_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderation_note TEXT;

-- Update visibility helper to hide moderated content from non-authors
CREATE OR REPLACE FUNCTION public.can_see_publication(_publication_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.publications p
    WHERE p.id = _publication_id
      AND (
        p.author_id = auth.uid()
        OR public.has_role(auth.uid(),'admin')
        OR public.has_role(auth.uid(),'moderator')
        OR (
          p.moderation_status = 'approved'
          AND (
            p.visibility = 'public'
            OR EXISTS (
              SELECT 1 FROM public.publication_unlocks u
              WHERE u.publication_id = p.id
                AND u.buyer_id = auth.uid()
                AND u.status = 'paid'
            )
          )
        )
      )
  );
$$;

-- KYC rejection reason
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

-- Content reports
CREATE TYPE public.report_target AS ENUM ('publication','profile','chat_message');
CREATE TYPE public.report_status AS ENUM ('open','reviewing','actioned','dismissed');

CREATE TABLE public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  target_type public.report_target NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) > 0),
  details TEXT,
  status public.report_status NOT NULL DEFAULT 'open',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reporter sees own reports" ON public.content_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "authenticated creates report" ON public.content_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "moderators update reports" ON public.content_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TRIGGER trg_content_reports_updated_at
  BEFORE UPDATE ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit log (append-only)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "authenticated writes own audit" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);
