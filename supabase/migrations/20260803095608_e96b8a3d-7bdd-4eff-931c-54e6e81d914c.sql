CREATE OR REPLACE FUNCTION public.admin_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role
$$;

REVOKE EXECUTE ON FUNCTION public.admin_user_ids() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_user_ids() TO authenticated, service_role;