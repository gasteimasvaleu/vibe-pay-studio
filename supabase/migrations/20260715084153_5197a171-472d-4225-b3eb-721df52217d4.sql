
CREATE TABLE public.publication_challenge_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (publication_id, amount_cents)
);

CREATE INDEX publication_challenge_tiers_pub_pos_idx
  ON public.publication_challenge_tiers (publication_id, position);

GRANT SELECT ON public.publication_challenge_tiers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.publication_challenge_tiers TO authenticated;
GRANT ALL ON public.publication_challenge_tiers TO service_role;

ALTER TABLE public.publication_challenge_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenge_tiers_read_all"
  ON public.publication_challenge_tiers
  FOR SELECT
  USING (true);

CREATE POLICY "challenge_tiers_author_insert"
  ON public.publication_challenge_tiers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.author_id = auth.uid()
    )
  );

CREATE POLICY "challenge_tiers_author_update"
  ON public.publication_challenge_tiers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.author_id = auth.uid()
    )
  );

CREATE POLICY "challenge_tiers_author_delete"
  ON public.publication_challenge_tiers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.author_id = auth.uid()
    )
  );
