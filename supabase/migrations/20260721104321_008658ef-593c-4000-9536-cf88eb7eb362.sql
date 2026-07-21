
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friendships_unique UNIQUE (owner_id, friend_id),
  CONSTRAINT friendships_no_self CHECK (owner_id <> friend_id)
);

CREATE INDEX idx_friendships_owner ON public.friendships(owner_id);
CREATE INDEX idx_friendships_friend ON public.friendships(friend_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read public or own friendships"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR friend_id = auth.uid()
    OR (
      visible = true
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = friendships.friend_id
          AND p.restrict_friendships = true
      )
    )
  );

CREATE POLICY "Owner creates friendship"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Friend toggles visibility"
  ON public.friendships FOR UPDATE
  TO authenticated
  USING (friend_id = auth.uid())
  WITH CHECK (friend_id = auth.uid());

CREATE POLICY "Owner or friend deletes"
  ON public.friendships FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR friend_id = auth.uid());

CREATE TRIGGER trg_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
