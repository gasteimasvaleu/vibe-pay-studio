CREATE OR REPLACE FUNCTION public.resolve_available_username(desired text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  i int;
BEGIN
  base := lower(coalesce(desired, ''));
  base := regexp_replace(base, '[^a-z0-9_]+', '_', 'g');
  base := regexp_replace(base, '_+', '_', 'g');
  base := regexp_replace(base, '^_+|_+$', '', 'g');
  base := left(base, 20);
  IF length(base) < 3 THEN
    base := 'usuario';
  END IF;

  candidate := base;
  i := 1;
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE lower(p.username) = candidate OR lower(p.free_username) = candidate
    ) AND NOT EXISTS (
      SELECT 1 FROM public.creator_profiles cp WHERE lower(cp.username) = candidate
    ) THEN
      RETURN candidate;
    END IF;

    i := i + 1;
    EXIT WHEN i > 999;
    candidate := left(base, 30 - length('_' || i::text)) || '_' || i::text;
  END LOOP;

  RETURN left(base, 20) || '_' || floor(random() * 9000 + 1000)::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_available_username(text) TO anon, authenticated, service_role;

UPDATE public.profiles
SET username = 'govitynow'
WHERE username = 'govitynow_0b77c6c7'
  AND NOT EXISTS (SELECT 1 FROM public.profiles p2 WHERE lower(p2.username) = 'govitynow');