
CREATE TABLE public.publication_hides (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, publication_id)
);

GRANT SELECT, INSERT, DELETE ON public.publication_hides TO authenticated;
GRANT ALL ON public.publication_hides TO service_role;

ALTER TABLE public.publication_hides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select their own hides"
  ON public.publication_hides FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own hides"
  ON public.publication_hides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own hides"
  ON public.publication_hides FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_publication_hides_user_created ON public.publication_hides(user_id, created_at DESC);
