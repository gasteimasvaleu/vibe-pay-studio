ALTER TABLE public.publication_media
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

CREATE OR REPLACE FUNCTION public.creator_content_stats(
  _author_id uuid,
  _creator_profile_id uuid DEFAULT NULL
)
RETURNS TABLE (video_seconds integer, last_post_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(COALESCE(m.duration_seconds, 0)) FILTER (WHERE m.type = 'video'), 0)::int AS video_seconds,
    MAX(p.published_at) AS last_post_at
  FROM public.publications p
  LEFT JOIN public.publication_media m ON m.publication_id = p.id
  WHERE p.author_id = _author_id
    AND p.archived_at IS NULL
    AND p.published_at IS NOT NULL
    AND p.published_at <= now()
    AND (_creator_profile_id IS NULL OR p.creator_profile_id = _creator_profile_id);
$$;

REVOKE ALL ON FUNCTION public.creator_content_stats(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.creator_content_stats(uuid, uuid) TO authenticated, anon, service_role;