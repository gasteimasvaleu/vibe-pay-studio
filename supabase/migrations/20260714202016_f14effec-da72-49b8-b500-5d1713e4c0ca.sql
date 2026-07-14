ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

DROP POLICY IF EXISTS publications_public_read ON public.publications;
CREATE POLICY publications_public_read ON public.publications
  FOR SELECT
  USING (
    published_at IS NOT NULL
    AND published_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
    AND archived_at IS NULL
  );

CREATE INDEX IF NOT EXISTS publications_active_idx
  ON public.publications (published_at DESC)
  WHERE archived_at IS NULL;