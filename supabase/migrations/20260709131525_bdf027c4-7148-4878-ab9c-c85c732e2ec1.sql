
-- ========== publications ==========
CREATE TABLE public.publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  caption text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','paid','challenge')),
  price_cents int,
  challenge_cents int,
  expires_at timestamptz,
  scheduled_at timestamptz,
  comments_disabled boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.publications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publications TO authenticated;
GRANT ALL ON public.publications TO service_role;

ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY publications_public_read ON public.publications
  FOR SELECT TO anon, authenticated
  USING (
    published_at IS NOT NULL
    AND published_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY publications_author_read ON public.publications
  FOR SELECT TO authenticated USING (auth.uid() = author_id);

CREATE POLICY publications_author_insert ON public.publications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY publications_author_update ON public.publications
  FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY publications_author_delete ON public.publications
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TRIGGER publications_set_updated_at
  BEFORE UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX publications_feed_idx ON public.publications (pinned DESC, published_at DESC);
CREATE INDEX publications_author_idx ON public.publications (author_id);

-- ========== publication_media ==========
CREATE TABLE public.publication_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('image','video')),
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.publication_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_media TO authenticated;
GRANT ALL ON public.publication_media TO service_role;

ALTER TABLE public.publication_media ENABLE ROW LEVEL SECURITY;

CREATE INDEX publication_media_pub_idx ON public.publication_media (publication_id, position);

-- ========== publication_unlocks ==========
CREATE TABLE public.publication_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  amount_cents int NOT NULL,
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_ref text,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, buyer_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_unlocks TO authenticated;
GRANT ALL ON public.publication_unlocks TO service_role;

ALTER TABLE public.publication_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY unlocks_buyer_read ON public.publication_unlocks
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);

CREATE POLICY unlocks_author_read ON public.publication_unlocks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.publications p WHERE p.id = publication_id AND p.author_id = auth.uid()));

-- Inserts happen only via server functions (supabaseAdmin) — no INSERT policy.

-- ========== can_see_publication (security definer) ==========
CREATE OR REPLACE FUNCTION public.can_see_publication(_publication_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.publications p
    WHERE p.id = _publication_id
      AND (
        p.visibility = 'public'
        OR p.author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.publication_unlocks u
          WHERE u.publication_id = p.id
            AND u.buyer_id = auth.uid()
            AND u.status = 'paid'
        )
      )
  );
$$;

-- Media SELECT gated by publication visibility + can_see_publication
CREATE POLICY publication_media_read ON public.publication_media
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND (
          p.author_id = auth.uid()
          OR (
            p.published_at IS NOT NULL
            AND p.published_at <= now()
            AND (p.expires_at IS NULL OR p.expires_at > now())
            AND public.can_see_publication(p.id)
          )
        )
    )
  );

CREATE POLICY publication_media_author_write ON public.publication_media
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.publications p WHERE p.id = publication_id AND p.author_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.publications p WHERE p.id = publication_id AND p.author_id = auth.uid()));

-- ========== storage.objects policies for bucket 'criativos' ==========
CREATE POLICY criativos_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'criativos'
    AND (storage.foldername(name))[1] = 'posts'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY criativos_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'criativos'
    AND (storage.foldername(name))[1] = 'posts'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY criativos_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'criativos'
    AND (storage.foldername(name))[1] = 'posts'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
