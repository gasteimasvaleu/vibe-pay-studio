CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> followee_id)
);

CREATE INDEX follows_follower_idx ON public.follows(follower_id);
CREATE INDEX follows_followee_idx ON public.follows(followee_id);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their follow relationships"
  ON public.follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = followee_id);

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);