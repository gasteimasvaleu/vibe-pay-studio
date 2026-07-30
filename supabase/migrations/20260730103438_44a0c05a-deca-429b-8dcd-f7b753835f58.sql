CREATE INDEX IF NOT EXISTS idx_tx_creator_profile_created ON public.transactions (creator_profile_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tips_creator_profile_created ON public.tips (creator_profile_id, created_at);
CREATE INDEX IF NOT EXISTS idx_live_sessions_creator_profile_started ON public.live_sessions (creator_profile_id, started_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_creator_profile_created ON public.chat_messages (creator_profile_id, created_at);

CREATE OR REPLACE FUNCTION public.em_alta_feed()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d7  timestamptz := now() - interval '7 days';
  d30 timestamptz := now() - interval '30 days';
  d90 timestamptz := now() - interval '90 days';
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
  -- 1. Top creators (faturamento 30d)
  top_creators AS (
    SELECT b.*, SUM(t.amount_cents_gross) AS metric
    FROM base b
    JOIN public.transactions t
      ON t.creator_profile_id = b.id AND t.status = 'paid' AND t.created_at >= d30
    GROUP BY b.id, b.user_id, b.kind, b.handle, b.name, b.avatar_url, b.cover_url,
             b.verified, b.price_monthly, b.created_at, b.video_call_enabled,
             b.last_seen_at, b.posts_count
    ORDER BY metric DESC
    LIMIT 12
  ),
  -- 2. Ofertas de assinatura (promoções ativas)
  ofertas AS (
    SELECT b.*, MAX(pr.discount_pct) AS metric
    FROM base b
    JOIN public.promotions pr
      ON pr.creator_profile_id = b.id
     AND pr.status = 'active'
     AND (pr.starts_at IS NULL OR pr.starts_at <= now())
     AND (pr.ends_at IS NULL OR pr.ends_at >= now())
    GROUP BY b.id, b.user_id, b.kind, b.handle, b.name, b.avatar_url, b.cover_url,
             b.verified, b.price_monthly, b.created_at, b.video_call_enabled,
             b.last_seen_at, b.posts_count
    ORDER BY metric DESC NULLS LAST
    LIMIT 12
  ),
  -- 3. Perfis gratuitos
  gratuitos AS (
    SELECT b.*,
           (SELECT count(*) FROM public.profile_views pv
             WHERE pv.creator_profile_id = b.id AND pv.created_at >= d30) AS metric
    FROM base b
    WHERE b.kind = 'free' AND b.posts_count > 0
    ORDER BY metric DESC, b.posts_count DESC
    LIMIT 12
  ),
  -- 4. As mais mimadas (tips 30d)
  mimadas AS (
    SELECT b.*, SUM(tp.amount_cents) AS metric
    FROM base b
    JOIN public.tips tp
      ON tp.creator_profile_id = b.id AND tp.created_at >= d30
    GROUP BY b.id, b.user_id, b.kind, b.handle, b.name, b.avatar_url, b.cover_url,
             b.verified, b.price_monthly, b.created_at, b.video_call_enabled,
             b.last_seen_at, b.posts_count
    ORDER BY metric DESC
    LIMIT 12
  ),
  -- 5. Rumo ao topo (novos com conteudo)
  rumo AS (
    SELECT b.*,
           (SELECT count(*) FROM public.publication_media pm
             JOIN public.publications pub ON pub.id = pm.publication_id
            WHERE pub.creator_profile_id = b.id AND pub.published_at IS NOT NULL
              AND pub.archived_at IS NULL AND pm.type = 'image') AS photos,
           (SELECT count(*) FROM public.publication_media pm
             JOIN public.publications pub ON pub.id = pm.publication_id
            WHERE pub.creator_profile_id = b.id AND pub.published_at IS NOT NULL
              AND pub.archived_at IS NULL AND pm.type = 'video') AS videos
    FROM base b
    WHERE b.created_at >= d90 AND b.posts_count > 0
    ORDER BY (
      SELECT count(*) FROM public.publication_media pm
        JOIN public.publications pub ON pub.id = pm.publication_id
       WHERE pub.creator_profile_id = b.id AND pub.published_at IS NOT NULL
         AND pub.archived_at IS NULL
    ) DESC
    LIMIT 12
  ),
  -- 6. Em alta nos posts (7d)
  posts AS (
    SELECT b.id, b.handle, b.name, b.avatar_url, b.verified,
           pub.id AS publication_id,
           COALESCE(
             pub.preview_url,
             (SELECT pm.url FROM public.publication_media pm
               WHERE pm.publication_id = pub.id ORDER BY pm.position LIMIT 1),
             b.cover_url
           ) AS cover_url,
           (SELECT count(*) FROM public.publication_likes pl WHERE pl.publication_id = pub.id)
           + 3 * (SELECT count(*) FROM public.transactions t
                   WHERE t.reference_table = 'publications'
                     AND t.reference_id = pub.id AND t.status = 'paid') AS metric
    FROM base b
    JOIN public.publications pub
      ON pub.creator_profile_id = b.id
     AND pub.published_at IS NOT NULL
     AND pub.archived_at IS NULL
     AND pub.published_at >= d7
    ORDER BY metric DESC, pub.published_at DESC
    LIMIT 12
  ),
  -- 7. Bombando no chat (7d)
  chat AS (
    SELECT b.*, count(cm.id) AS metric
    FROM base b
    JOIN public.chat_messages cm
      ON cm.creator_profile_id = b.id AND cm.created_at >= d7 AND cm.deleted_at IS NULL
    GROUP BY b.id, b.user_id, b.kind, b.handle, b.name, b.avatar_url, b.cover_url,
             b.verified, b.price_monthly, b.created_at, b.video_call_enabled,
             b.last_seen_at, b.posts_count
    ORDER BY metric DESC
    LIMIT 12
  ),
  -- 8. Chamada um a um
  umaum AS (
    SELECT b.*,
           (SELECT count(*) FROM public.video_calls vc
             WHERE vc.creator_profile_id = b.id AND vc.status = 'completed') AS metric
    FROM base b
    WHERE COALESCE(b.video_call_enabled, false) = true
    ORDER BY metric DESC, b.created_at DESC
    LIMIT 12
  ),
  -- 9. Lives (7d, ao vivo primeiro)
  lives AS (
    SELECT b.*,
           (SELECT count(*) FROM public.live_sessions ls
             WHERE ls.creator_profile_id = b.id AND ls.started_at >= d7) AS metric,
           EXISTS (SELECT 1 FROM public.live_sessions ls
                    WHERE ls.creator_profile_id = b.id AND ls.status = 'live') AS is_live
    FROM base b
    WHERE EXISTS (SELECT 1 FROM public.live_sessions ls
                   WHERE ls.creator_profile_id = b.id
                     AND (ls.started_at >= d7 OR ls.status = 'live'))
    ORDER BY is_live DESC, metric DESC
    LIMIT 12
  )
  SELECT jsonb_build_object(
    'topCreators', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'handle', handle, 'avatarUrl', avatar_url,
        'coverUrl', cover_url, 'verified', verified) ORDER BY metric DESC), '[]'::jsonb) FROM top_creators),
    'ofertas', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'handle', handle, 'avatarUrl', avatar_url,
        'coverUrl', cover_url, 'verified', verified,
        'discountPct', metric) ORDER BY metric DESC), '[]'::jsonb) FROM ofertas),
    'perfisGratuitos', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'handle', handle, 'avatarUrl', avatar_url,
        'coverUrl', cover_url, 'verified', verified) ORDER BY metric DESC), '[]'::jsonb) FROM gratuitos),
    'maisMimadas', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'handle', handle, 'avatarUrl', avatar_url,
        'coverUrl', cover_url, 'verified', verified) ORDER BY metric DESC), '[]'::jsonb) FROM mimadas),
    'rumoAoTopo', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'handle', handle, 'avatarUrl', avatar_url,
        'coverUrl', cover_url, 'verified', verified,
        'photos', photos, 'videos', videos) ORDER BY (photos + videos) DESC), '[]'::jsonb) FROM rumo),
    'emAltaNosPosts', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', publication_id, 'name', name, 'handle', handle, 'avatarUrl', avatar_url,
        'coverUrl', cover_url, 'verified', verified) ORDER BY metric DESC), '[]'::jsonb) FROM posts),
    'bombandoNoChat', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'handle', handle, 'avatarUrl', avatar_url,
        'coverUrl', cover_url, 'verified', verified,
        'online', (last_seen_at IS NOT NULL AND last_seen_at >= now() - interval '5 minutes'),
        'messages7d', metric) ORDER BY metric DESC), '[]'::jsonb) FROM chat),
    'chamadaUmAUm', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'handle', handle, 'avatarUrl', avatar_url,
        'coverUrl', cover_url, 'verified', verified,
        'calls', metric) ORDER BY metric DESC), '[]'::jsonb) FROM umaum),
    'liveNasAlturas', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'handle', handle, 'avatarUrl', avatar_url,
        'coverUrl', cover_url, 'verified', verified,
        'isLive', is_live, 'livesLast7Days', metric) ORDER BY is_live DESC, metric DESC), '[]'::jsonb) FROM lives)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.em_alta_feed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.em_alta_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.em_alta_feed() TO service_role;