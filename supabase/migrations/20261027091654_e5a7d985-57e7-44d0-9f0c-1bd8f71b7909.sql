REVOKE EXECUTE ON FUNCTION public.is_privileged_writer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_protect_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.creator_profiles_protect_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fill_active_creator_profile_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.buyer_country_code(uuid) FROM PUBLIC, anon;
COMMENT ON VIEW public.profiles_public IS 'Intencionalmente security definer: expõe só colunas públicas de perfis.';