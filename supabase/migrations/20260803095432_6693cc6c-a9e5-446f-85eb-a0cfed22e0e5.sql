CREATE TABLE public.publication_profile_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  creator_profile_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, creator_profile_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_profile_mentions TO authenticated;
GRANT SELECT ON public.publication_profile_mentions TO anon;
GRANT ALL ON public.publication_profile_mentions TO service_role;

ALTER TABLE public.publication_profile_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentions are readable by everyone"
ON public.publication_profile_mentions
FOR SELECT
USING (true);

CREATE POLICY "Admins manage mentions"
ON public.publication_profile_mentions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ppm_publication ON public.publication_profile_mentions(publication_id);