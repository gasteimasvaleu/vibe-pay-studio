ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS public_listing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_listing_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS public_listing_reviewed_at timestamptz;

CREATE OR REPLACE FUNCTION public.creator_profiles_public_listing_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _admin boolean := coalesce(public.has_role(auth.uid(), 'admin'), false) OR auth.uid() IS NULL;
BEGIN
  IF NEW.public_listing_status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'status inválido';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT _admin THEN NEW.public_listing_status := 'pending'; NEW.public_listing_reviewed_at := NULL; END IF;
    RETURN NEW;
  END IF;
  IF NEW.public_listing_status IS DISTINCT FROM OLD.public_listing_status AND NOT _admin THEN
    NEW.public_listing_status := OLD.public_listing_status;
    NEW.public_listing_reviewed_at := OLD.public_listing_reviewed_at;
  END IF;
  IF NOT _admin AND (
       (NEW.public_listing AND NOT OLD.public_listing)
    OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
    OR NEW.cover_url IS DISTINCT FROM OLD.cover_url
    OR NEW.bio IS DISTINCT FROM OLD.bio
    OR NEW.display_name IS DISTINCT FROM OLD.display_name
    OR NEW.username IS DISTINCT FROM OLD.username) THEN
    NEW.public_listing_status := 'pending';
    NEW.public_listing_reviewed_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_creator_profiles_public_listing_guard ON public.creator_profiles;
CREATE TRIGGER trg_creator_profiles_public_listing_guard
BEFORE INSERT OR UPDATE ON public.creator_profiles
FOR EACH ROW EXECUTE FUNCTION public.creator_profiles_public_listing_guard();

CREATE OR REPLACE FUNCTION public.public_creator_directory(_search text DEFAULT NULL, _limit int DEFAULT 48, _offset int DEFAULT 0)
RETURNS TABLE(username text, display_name text, avatar_url text, cover_url text, bio text, price_monthly numeric, kind text, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cp.username, cp.display_name, cp.avatar_url, cp.cover_url, cp.bio, cp.price_monthly::numeric, cp.kind, cp.updated_at
  FROM public.creator_profiles cp
  WHERE cp.public_listing AND cp.public_listing_status = 'approved'
    AND NOT coalesce(public.is_user_banned(cp.user_id), false)
    AND (_search IS NULL OR _search = '' OR cp.username ILIKE '%'||_search||'%' OR cp.display_name ILIKE '%'||_search||'%')
  ORDER BY cp.updated_at DESC
  LIMIT least(greatest(coalesce(_limit,48),1),1000) OFFSET greatest(coalesce(_offset,0),0)
$$;

CREATE OR REPLACE FUNCTION public.public_creator_by_username(_username text)
RETURNS TABLE(username text, display_name text, avatar_url text, cover_url text, bio text, price_monthly numeric, kind text, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.public_creator_directory(NULL, 1000, 0) d WHERE lower(d.username) = lower(_username) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.admin_review_public_listing(_creator_profile_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'acesso negado'; END IF;
  IF _status NOT IN ('approved','rejected','pending') THEN RAISE EXCEPTION 'status inválido'; END IF;
  UPDATE public.creator_profiles SET public_listing_status = _status, public_listing_reviewed_at = now()
  WHERE id = _creator_profile_id;
END $$;

REVOKE ALL ON FUNCTION public.public_creator_directory(text,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_creator_by_username(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_review_public_listing(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_creator_directory(text,int,int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_creator_by_username(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_review_public_listing(uuid,text) TO authenticated;