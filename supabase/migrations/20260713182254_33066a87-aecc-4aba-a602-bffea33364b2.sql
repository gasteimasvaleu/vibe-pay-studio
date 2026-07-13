GRANT EXECUTE ON FUNCTION public.can_see_publication(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;