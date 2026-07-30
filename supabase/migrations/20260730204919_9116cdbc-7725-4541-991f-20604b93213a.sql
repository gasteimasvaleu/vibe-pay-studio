CREATE OR REPLACE FUNCTION public.em_alta_section(_section text, _limit int DEFAULT 24, _offset int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  d7  timestamptz := now() - interval '7 days';
  d30 timestamptz := now() - interval '30 days';
  d90 timestamptz := now() - interval '90 days';
  lim int := LEAST(GREATEST(COALESCE(_limit, 24), 1), 60);
  off int := GREATEST(COALESCE(_offset, 0), 0);
  result jsonb;
BEGIN
  WITH visible AS (
    SELECT cp.id,
           cp.user_id,
           cp.kind::text                                    AS kind,
           cp.username                                      AS handle,
           COALESCE(NULLIF(cp.display_name, ''), cp.username) AS name,
           cp.avatar_url,
           cp.cover_url,
           (cp.verified_at IS NOT NULL)                     AS verified,
           cp.price_monthly,
           cp.created_at,
           p.video_call_enabled,
           p.last_seen_at
    FROM public.creator_profiles cp
    JOIN public.profiles p ON p.user_id = cp.user_id
    WHERE cp.username IS NOT NULL
      AND p.banned_at IS NULL
      AND COALESCE(p.restrict_search, false) = false
  ),
  base AS (
    SELECT v.*,
           (SELECT count(*) FROM public.publications pub
             WHERE pub.creator_profile_id = v.id
               AND pub.published_at IS NOT NULL
               AND pub.archived_at IS NULL) AS posts_count
    FROM visible v
  ),
  rows AS (
    -- 1. Top creators (faturamento 30d)
    SELECT jsonb_build_object(
             'id', b.id, 'name', b.name, 'handle', b.handle, 'avatarUrl', b.avatar_url,
             'coverUrl', b.cover_url, 'verified', b.verified) AS item,
           SUM(t.amount_cents_gross)::numeric AS metric,
           b.id::text AS tiebreak
    FROM base b
    JOIN public.transactions t
      ON t.creator_profile_id = b.id AND t.status = 'paid' AND t.created_at >= d30
    WHERE _section = 'top-creators'
    GROUP BY b.id, b.name, b.handle, b.avatar_url, b.cover_url, b.verified

    UNION ALL
    -- 2. Ofertas de assinatura
    SELECT jsonb_build_object(
             'id', b.id, 'name', b.name, 'handle', b.handle, 'avatarUrl', b.avatar_url,
             'coverUrl', b.cover_url, 'verified', b.verified,
             'discountPct', MAX(pr.discount_pct)),
           MAX(pr.discount_pct)::numeric,
           b.id::text
    FROM base b
    JOIN public.promotions pr
      ON pr.creator_profile_id = b.id
     AND pr.status = 'active'
     AND (pr.starts_at IS NULL OR pr.starts_at <= now())
     AND (pr.ends_at IS NULL OR pr.ends_at >= now())
    WHERE _section = 'ofertas'
    GROUP BY b.id, b.name, b.handle, b.avatar_url, b.cover_url, b.verified

    UNION ALL
    -- 3. Perfis gratuitos
    SELECT jsonb_build_object(
             'id', b.id, 'name', b.name, 'handle', b.handle, 'avatarUrl', b.avatar_url,
             'coverUrl', b.cover_url, 'verified', b.verified),
           (SELECT count(*) FROM public.profile_views pv
             WHERE pv.creator_profile_id = b.id AND pv.created_at >= d30)::numeric,
           b.id::text
    FROM base b
    WHERE _section = 'perfis-gratuitos' AND b.kind = 'free' AND b.posts_count > 0

    UNION ALL
    -- 4. As mais mimadas
    SELECT jsonb_build_object(
             'id', b.id, 'name', b.name, 'handle', b.handle, 'avatarUrl', b.avatar_url,
             'coverUrl', b.cover_url, 'verified', b.verified),
           SUM(tp.amount_cents)::numeric,
           b.id::text
    FROM base b
    JOIN public.tips tp
      ON tp.creator_profile_id = b.id AND tp.created_at >= d30
    WHERE _section = 'mais-mimadas'
    GROUP BY b.id, b.name, b.handle, b.avatar_url, b.cover_url, b.verified

    UNION ALL
    -- 5. Rumo ao topo
    SELECT jsonb_build_object(
             'id', b.id, 'name', b.name, 'handle', b.handle, 'avatarUrl', b.avatar_url,
             'coverUrl', b.cover_url, 'verified', b.verified,
             'photos', (SELECT count(*) FROM public.publication_media pm
                          JOIN public.publications pub ON pub.id = pm.publication_id
                         WHERE pub.creator_profile_id = b.id AND pub.published_at IS NOT NULL
                           AND pub.archived_at IS NULL AND pm.type = 'image'),
             'videos', (SELECT count(*) FROM public.publication_media pm
                          JOIN public.publications pub ON pub.id = pm.publication_id
                         WHERE pub.creator_profile_id = b.id AND pub.published_at IS NOT NULL
                           AND pub.archived_at IS NULL AND pm.type = 'video')),
           (SELECT count(*) FROM public.publication_media pm
              JOIN public.publications pub ON pub.id = pm.publication_id
             WHERE pub.creator_profile_id = b.id AND pub.published_at IS NOT NULL
               AND pub.archived_at IS NULL)::numeric,
           b.id::text
    FROM base b
    WHERE _section = 'rumo-ao-topo' AND b.created_at >= d90 AND b.posts_count > 0

    UNION ALL
    -- 6. Em alta nos posts
    SELECT jsonb_build_object(
             'id', pub.id, 'name', b.name, 'handle', b.handle, 'avatarUrl', b.avatar_url,
             'coverUrl', COALESCE(
                pub.preview_url,
                (SELECT pm.url FROM public.publication_media pm
                  WHERE pm.publication_id = pub.id ORDER BY pm.position LIMIT 1),
                b.cover_url),
             'verified', b.verified),
           ((SELECT count(*) FROM public.publication_likes pl WHERE pl.publication_id = pub.id)
             + 3 * (SELECT count(*) FROM public.transactions t
                     WHERE t.reference_table = 'publications'
                       AND t.reference_id = pub.id AND t.status = 'paid'))::numeric,
           pub.id::text
    FROM base b
    JOIN public.publications pub
      ON pub.creator_profile_id = b.id
     AND pub.published_at IS NOT NULL
     AND pub.archived_at IS NULL
     AND pub.published_at >= d7
    WHERE _section = 'posts'

    UNION ALL
    -- 7. Bombando no chat
    SELECT jsonb_build_object(
             'id', b.id, 'name', b.name, 'handle', b.handle, 'avatarUrl', b.avatar_url,
             'coverUrl', b.cover_url, 'verified', b.verified,
             'online', (b.last_seen_at IS NOT NULL AND b.last_seen_at >= now() - interval '5 minutes'),
             'messages7d', count(cm.id)),
           count(cm.id)::numeric,
           b.id::text
    FROM base b
    JOIN public.chat_messages cm
      ON cm.creator_profile_id = b.id AND cm.created_at >= d7 AND cm.deleted_at IS NULL
    WHERE _section = 'chat'
    GROUP BY b.id, b.name, b.handle, b.avatar_url, b.cover_url, b.verified, b.last_seen_at

    UNION ALL
    -- 8. Chamada um a um
    SELECT jsonb_build_object(
             'id', b.id, 'name', b.name, 'handle', b.handle, 'avatarUrl', b.avatar_url,
             'coverUrl', b.cover_url, 'verified', b.verified,
             'calls', (SELECT count(*) FROM public.video_calls vc
                        WHERE vc.creator_profile_id = b.id AND vc.status = 'completed')),
           (SELECT count(*) FROM public.video_calls vc
             WHERE vc.creator_profile_id = b.id AND vc.status = 'completed')::numeric,
           b.id::text
    FROM base b
    WHERE _section = 'um-a-um' AND COALESCE(b.video_call_enabled, false) = true

    UNION ALL
    -- 9. Lives
    SELECT jsonb_build_object(
             'id', b.id, 'name', b.name, 'handle', b.handle, 'avatarUrl', b.avatar_url,
             'coverUrl', b.cover_url, 'verified', b.verified,
             'isLive', EXISTS (SELECT 1 FROM public.live_sessions ls
                                WHERE ls.creator_profile_id = b.id AND ls.status = 'live'),
             'livesLast7Days', (SELECT count(*) FROM public.live_sessions ls
                                 WHERE ls.creator_profile_id = b.id AND ls.started_at >= d7)),
           (CASE WHEN EXISTS (SELECT 1 FROM public.live_sessions ls
                               WHERE ls.creator_profile_id = b.id AND ls.status = 'live')
                 THEN 1000000 ELSE 0 END
            + (SELECT count(*) FROM public.live_sessions ls
                WHERE ls.creator_profile_id = b.id AND ls.started_at >= d7))::numeric,
           b.id::text
    FROM base b
    WHERE _section = 'lives'
      AND EXISTS (SELECT 1 FROM public.live_sessions ls
                   WHERE ls.creator_profile_id = b.id
                     AND (ls.started_at >= d7 OR ls.status = 'live'))
  ),
  paged AS (
    SELECT item FROM rows
    ORDER BY metric DESC NULLS LAST, tiebreak
    LIMIT lim OFFSET off
  )
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) INTO result FROM paged;

  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.em_alta_section(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.em_alta_section(text, int, int) TO service_role;