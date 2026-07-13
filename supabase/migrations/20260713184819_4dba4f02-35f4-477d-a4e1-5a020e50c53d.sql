
-- Likes
CREATE TABLE public.publication_likes (
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (publication_id, user_id)
);
CREATE INDEX idx_publication_likes_pub ON public.publication_likes(publication_id);
CREATE INDEX idx_publication_likes_user ON public.publication_likes(user_id);
GRANT SELECT, INSERT, DELETE ON public.publication_likes TO authenticated;
GRANT ALL ON public.publication_likes TO service_role;
ALTER TABLE public.publication_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable by authenticated"
  ON public.publication_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own likes"
  ON public.publication_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own likes"
  ON public.publication_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Bookmarks
CREATE TABLE public.publication_bookmarks (
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (publication_id, user_id)
);
CREATE INDEX idx_publication_bookmarks_pub ON public.publication_bookmarks(publication_id);
CREATE INDEX idx_publication_bookmarks_user ON public.publication_bookmarks(user_id);
GRANT SELECT, INSERT, DELETE ON public.publication_bookmarks TO authenticated;
GRANT ALL ON public.publication_bookmarks TO service_role;
ALTER TABLE public.publication_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks readable by owner"
  ON public.publication_bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own bookmarks"
  ON public.publication_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own bookmarks"
  ON public.publication_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Comments
CREATE TABLE public.publication_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_publication_comments_pub ON public.publication_comments(publication_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.publication_comments TO authenticated;
GRANT ALL ON public.publication_comments TO service_role;
ALTER TABLE public.publication_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable by authenticated"
  ON public.publication_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own comments"
  ON public.publication_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.comments_disabled = true
    )
  );
CREATE POLICY "comment owner or publication author can delete"
  ON public.publication_comments FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.author_id = auth.uid()
    )
  );
