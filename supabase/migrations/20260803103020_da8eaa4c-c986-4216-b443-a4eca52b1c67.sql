CREATE OR REPLACE FUNCTION public.is_email_confirmed(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE lower(u.email) = lower(trim(_email))
      AND u.email_confirmed_at IS NOT NULL
  )
$$;

REVOKE ALL ON FUNCTION public.is_email_confirmed(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_confirmed(text) TO service_role;