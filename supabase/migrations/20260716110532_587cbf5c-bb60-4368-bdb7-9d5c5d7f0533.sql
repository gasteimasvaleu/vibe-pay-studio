
CREATE OR REPLACE FUNCTION public.list_my_sessions()
RETURNS TABLE(
  id uuid,
  user_agent text,
  ip text,
  created_at timestamptz,
  updated_at timestamptz,
  refreshed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT s.id, s.user_agent, host(s.ip)::text, s.created_at, s.updated_at, s.refreshed_at
    FROM auth.sessions s
   WHERE s.user_id = auth.uid()
   ORDER BY COALESCE(s.refreshed_at, s.updated_at, s.created_at) DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.revoke_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _current uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  BEGIN
    _current := NULLIF(auth.jwt() ->> 'session_id','')::uuid;
  EXCEPTION WHEN others THEN
    _current := NULL;
  END;
  IF _current IS NOT NULL AND _current = p_session_id THEN
    RAISE EXCEPTION 'cannot_revoke_current_session';
  END IF;
  DELETE FROM auth.sessions
   WHERE id = p_session_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_all_other_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _current uuid;
  _count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  BEGIN
    _current := NULLIF(auth.jwt() ->> 'session_id','')::uuid;
  EXCEPTION WHEN others THEN
    _current := NULL;
  END;
  WITH deleted AS (
    DELETE FROM auth.sessions
     WHERE user_id = auth.uid()
       AND (_current IS NULL OR id <> _current)
    RETURNING 1
  )
  SELECT count(*)::int INTO _count FROM deleted;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_sessions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_all_other_sessions() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_my_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_all_other_sessions() TO authenticated;
