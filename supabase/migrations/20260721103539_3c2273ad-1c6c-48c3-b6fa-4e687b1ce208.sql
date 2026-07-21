-- Add country column to profiles for geo-restricted search
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;

-- Backfill best-effort from most recent profile_views country for the profile owner
UPDATE public.profiles p
SET country = pv.country
FROM (
  SELECT DISTINCT ON (profile_id) profile_id, country
  FROM public.profile_views
  WHERE country IS NOT NULL
  ORDER BY profile_id, created_at DESC
) pv
WHERE pv.profile_id = p.user_id
  AND p.country IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);