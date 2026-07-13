
ALTER TABLE public.publication_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid NULL REFERENCES public.publication_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS publication_comments_parent_id_idx
  ON public.publication_comments(parent_id);

CREATE TABLE IF NOT EXISTS public.publication_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.publication_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.publication_comment_likes TO authenticated;
GRANT ALL ON public.publication_comment_likes TO service_role;

ALTER TABLE public.publication_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment likes readable by authenticated"
  ON public.publication_comment_likes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "users insert own comment likes"
  ON public.publication_comment_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own comment likes"
  ON public.publication_comment_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
