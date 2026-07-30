ALTER TABLE public.profile_views
  ADD COLUMN IF NOT EXISTS creator_profile_id UUID REFERENCES public.creator_profiles(id) ON DELETE CASCADE;

UPDATE public.profile_views pv
SET creator_profile_id = cp.id
FROM public.creator_profiles cp
WHERE pv.creator_profile_id IS NULL
  AND cp.user_id = pv.profile_id
  AND cp.kind = 'paid';

CREATE INDEX IF NOT EXISTS profile_views_creator_profile_created_idx
  ON public.profile_views (creator_profile_id, created_at DESC);

DROP POLICY IF EXISTS "Owner sees their profile views" ON public.profile_views;
CREATE POLICY "Owner sees their profile views"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.creator_profiles cp
      WHERE cp.id = profile_views.creator_profile_id
        AND cp.user_id = auth.uid()
    )
  );