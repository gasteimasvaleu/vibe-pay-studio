CREATE OR REPLACE VIEW public.creator_profiles_search
WITH (security_invoker = on) AS
SELECT
  cp.id,
  cp.user_id,
  cp.username,
  cp.display_name,
  cp.avatar_url,
  cp.cover_url,
  cp.created_at,
  p.kyc_verified_at,
  p.country,
  p.restrict_search,
  p.restrict_search_br,
  p.restrict_search_country,
  p.restrict_mentions
FROM public.creator_profiles cp
JOIN public.profiles p ON p.user_id = cp.user_id;

GRANT SELECT ON public.creator_profiles_search TO anon;
GRANT SELECT ON public.creator_profiles_search TO authenticated;
GRANT ALL ON public.creator_profiles_search TO service_role;