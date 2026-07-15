
-- vault_uploads: user's standalone media library
CREATE TABLE public.vault_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('image','video','audio','gif')),
  mime text,
  size_bytes bigint,
  width integer,
  height integer,
  duration_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vault_uploads_user_created_idx ON public.vault_uploads (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_uploads TO authenticated;
GRANT ALL ON public.vault_uploads TO service_role;

ALTER TABLE public.vault_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vault_uploads_owner_all" ON public.vault_uploads
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- vault_categories: user-defined categories in the vault sidebar
CREATE TABLE public.vault_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vault_categories_user_name_uniq ON public.vault_categories (user_id, lower(name));
CREATE INDEX vault_categories_user_position_idx ON public.vault_categories (user_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_categories TO authenticated;
GRANT ALL ON public.vault_categories TO service_role;

ALTER TABLE public.vault_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vault_categories_owner_all" ON public.vault_categories
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER vault_categories_set_updated_at
  BEFORE UPDATE ON public.vault_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- vault_category_items: polymorphic link (publication_media OR vault_upload)
CREATE TABLE public.vault_category_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.vault_categories(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('publication','upload')),
  publication_media_id uuid REFERENCES public.publication_media(id) ON DELETE CASCADE,
  vault_upload_id uuid REFERENCES public.vault_uploads(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (source = 'publication' AND publication_media_id IS NOT NULL AND vault_upload_id IS NULL)
    OR (source = 'upload' AND vault_upload_id IS NOT NULL AND publication_media_id IS NULL)
  )
);
CREATE UNIQUE INDEX vault_category_items_pub_uniq ON public.vault_category_items (category_id, publication_media_id) WHERE publication_media_id IS NOT NULL;
CREATE UNIQUE INDEX vault_category_items_upload_uniq ON public.vault_category_items (category_id, vault_upload_id) WHERE vault_upload_id IS NOT NULL;
CREATE INDEX vault_category_items_category_idx ON public.vault_category_items (category_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_category_items TO authenticated;
GRANT ALL ON public.vault_category_items TO service_role;

ALTER TABLE public.vault_category_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vault_category_items_owner_all" ON public.vault_category_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vault_categories c WHERE c.id = category_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vault_categories c WHERE c.id = category_id AND c.user_id = auth.uid()));

-- Storage RLS: allow authenticated users to manage their own vault/ prefix inside the 'publications' bucket
CREATE POLICY "vault_publications_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'publications'
    AND (storage.foldername(name))[1] = 'vault'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "vault_publications_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'publications'
    AND (storage.foldername(name))[1] = 'vault'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "vault_publications_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'publications'
    AND (storage.foldername(name))[1] = 'vault'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "vault_publications_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'publications'
    AND (storage.foldername(name))[1] = 'vault'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
