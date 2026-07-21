
CREATE TABLE public.muted_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  muter_id UUID NOT NULL,
  muted_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);

CREATE INDEX idx_muted_profiles_muter ON public.muted_profiles(muter_id);
CREATE INDEX idx_muted_profiles_muted ON public.muted_profiles(muted_id);

GRANT SELECT, INSERT, DELETE ON public.muted_profiles TO authenticated;
GRANT ALL ON public.muted_profiles TO service_role;

ALTER TABLE public.muted_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mutes"
  ON public.muted_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = muter_id);

CREATE POLICY "Users can insert own mutes"
  ON public.muted_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = muter_id);

CREATE POLICY "Users can delete own mutes"
  ON public.muted_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = muter_id);

CREATE OR REPLACE FUNCTION public.is_muted(_muter UUID, _target UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.muted_profiles
    WHERE muter_id = _muter AND muted_id = _target
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_muted(UUID, UUID) TO authenticated, service_role;
