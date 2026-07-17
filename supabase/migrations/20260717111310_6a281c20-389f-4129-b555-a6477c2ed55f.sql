
ALTER TABLE public.profile_views ADD COLUMN country text;
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_country ON public.profile_views(profile_id, country);
