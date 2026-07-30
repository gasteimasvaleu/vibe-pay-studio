ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE TABLE public.profile_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_profile_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  photo_paths text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profile_verification_requests TO authenticated;
GRANT ALL ON public.profile_verification_requests TO service_role;

ALTER TABLE public.profile_verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pvr_own_select" ON public.profile_verification_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "pvr_own_insert" ON public.profile_verification_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "pvr_admin_select" ON public.profile_verification_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "pvr_admin_update" ON public.profile_verification_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE UNIQUE INDEX profile_verification_requests_one_pending
  ON public.profile_verification_requests (creator_profile_id)
  WHERE status = 'pending';

CREATE INDEX profile_verification_requests_status_idx
  ON public.profile_verification_requests (status, created_at DESC);

CREATE TRIGGER update_profile_verification_requests_updated_at
  BEFORE UPDATE ON public.profile_verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "pv_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-verification' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pv_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-verification' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pv_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-verification' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')));