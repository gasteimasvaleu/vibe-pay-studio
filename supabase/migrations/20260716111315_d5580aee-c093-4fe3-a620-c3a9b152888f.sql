
CREATE TABLE public.revoked_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  user_agent text,
  ip text,
  session_created_at timestamptz,
  session_last_active_at timestamptz,
  revoked_at timestamptz NOT NULL DEFAULT now(),
  revoked_reason text NOT NULL DEFAULT 'user'
);

CREATE INDEX revoked_sessions_user_revoked_at_idx
  ON public.revoked_sessions (user_id, revoked_at DESC);

GRANT SELECT ON public.revoked_sessions TO authenticated;
GRANT ALL ON public.revoked_sessions TO service_role;

ALTER TABLE public.revoked_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own revoked sessions"
  ON public.revoked_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.revoke_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _current uuid;
  _uid uuid := auth.uid();
  _snap RECORD;
BEGIN
  IF _uid IS NULL THEN
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

  SELECT s.id, s.user_agent, host(s.ip)::text AS ip,
         s.created_at, COALESCE(s.refreshed_at, s.updated_at, s.created_at) AS last_active
    INTO _snap
    FROM auth.sessions s
   WHERE s.id = p_session_id AND s.user_id = _uid;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  DELETE FROM auth.sessions
   WHERE id = p_session_id AND user_id = _uid;

  INSERT INTO public.revoked_sessions
    (user_id, session_id, user_agent, ip, session_created_at, session_last_active_at, revoked_reason)
  VALUES
    (_uid, _snap.id, _snap.user_agent, _snap.ip, _snap.created_at, _snap.last_active, 'user');
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
  _uid uuid := auth.uid();
  _count integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  BEGIN
    _current := NULLIF(auth.jwt() ->> 'session_id','')::uuid;
  EXCEPTION WHEN others THEN
    _current := NULL;
  END;

  INSERT INTO public.revoked_sessions
    (user_id, session_id, user_agent, ip, session_created_at, session_last_active_at, revoked_reason)
  SELECT s.user_id, s.id, s.user_agent, host(s.ip)::text,
         s.created_at, COALESCE(s.refreshed_at, s.updated_at, s.created_at),
         'user_all'
    FROM auth.sessions s
   WHERE s.user_id = _uid
     AND (_current IS NULL OR s.id <> _current);

  WITH deleted AS (
    DELETE FROM auth.sessions
     WHERE user_id = _uid
       AND (_current IS NULL OR id <> _current)
    RETURNING 1
  )
  SELECT count(*)::int INTO _count FROM deleted;

  RETURN _count;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_revoked_sessions()
RETURNS TABLE(
  id uuid,
  session_id uuid,
  user_agent text,
  ip text,
  session_created_at timestamptz,
  session_last_active_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.session_id, r.user_agent, r.ip,
         r.session_created_at, r.session_last_active_at,
         r.revoked_at, r.revoked_reason
    FROM public.revoked_sessions r
   WHERE r.user_id = auth.uid()
   ORDER BY r.revoked_at DESC
   LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.list_my_revoked_sessions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_revoked_sessions() TO authenticated;
