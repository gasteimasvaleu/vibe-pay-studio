
CREATE TABLE public.live_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (live_id, user_id)
);
CREATE INDEX idx_live_likes_live_id ON public.live_likes(live_id);
GRANT SELECT, INSERT, DELETE ON public.live_likes TO authenticated;
GRANT ALL ON public.live_likes TO service_role;
ALTER TABLE public.live_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read live likes" ON public.live_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like as themselves" ON public.live_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike themselves" ON public.live_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.live_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_live_comments_live_id ON public.live_comments(live_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_comments TO authenticated;
GRANT ALL ON public.live_comments TO service_role;
ALTER TABLE public.live_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read live comments" ON public.live_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can comment as themselves" ON public.live_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Author or admin can update comment" ON public.live_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Author or admin can delete comment" ON public.live_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_live_comments_updated_at BEFORE UPDATE ON public.live_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
